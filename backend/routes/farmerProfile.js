const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../lib/db');

const router = express.Router();

// ─── GET /api/farmer-profile — Fetch authenticated user's farm profile ────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await db.getFarmerProfile(req.user.id);
    res.json({ profile: profile || null });
  } catch (err) {
    console.error('getFarmerProfile error:', err.message);
    res.status(500).json({ error: 'پروفائل لوڈ نہیں ہو سکی' });
  }
});

// ─── PUT /api/farmer-profile — Create or update farm profile ──────────────────
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { crops, livestock, spray_log, soil, notes } = req.body;
    const profile = await db.upsertFarmerProfile(req.user.id, {
      crops, livestock, spray_log, soil, notes
    });
    if (!profile) {
      return res.status(500).json({ error: 'پروفائل محفوظ نہیں ہو سکی' });
    }
    res.json({ profile });
  } catch (err) {
    console.error('upsertFarmerProfile error:', err.message);
    res.status(500).json({ error: 'پروفائل محفوظ کرنے میں خرابی' });
  }
});

// ─── DELETE /api/farmer-profile — Clear profile (privacy) ─────────────────────
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await db.clearFarmerProfile(req.user.id);
    res.json({ success: true, message: 'پروفائل کامیابی سے صاف ہو گئی' });
  } catch (err) {
    console.error('clearFarmerProfile error:', err.message);
    res.status(500).json({ error: 'پروفائل صاف کرنے میں خرابی' });
  }
});

// ─── POST /api/farmer-profile/extract — Passive fact extraction from chat ─────
// Called non-blocking after each AI response to extract farming facts
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { userMessage, aiResponse } = req.body;
    if (!userMessage) return res.json({ extracted: false });

    // Simple regex-based extraction (no AI call needed — zero cost)
    const text = userMessage;
    const extracted = { crops: [], livestock: [], soil: {} };
    let hasData = false;

    // ── Extract crops with acres ───────────────────────────────────────────
    // Pattern: "X ایکڑ Y" or "Y X ایکڑ" or "میرے پاس X ایکڑ Y ہے"
    const cropPatterns = [
      // "5 ایکڑ گندم" or "10 ایکڑ کپاس"
      { regex: /(\d+(?:\.\d+)?)\s*(?:ایکڑ|acre|acres|kanal|کنال)\s+([ا-ے\u0600-\u06FF]+)/gi, acreIdx: 1, nameIdx: 2 },
      // "گندم 5 ایکڑ"
      { regex: /([ا-ے\u0600-\u06FF]+)\s+(\d+(?:\.\d+)?)\s*(?:ایکڑ|acre|acres)/gi, acreIdx: 2, nameIdx: 1 },
    ];

    const CROP_NAMES_UR = ['گندم','کپاس','چاول','مکئی','گنا','کماد','آلو','ٹماٹر','پیاز','سرسوں','چنا','مسور','مونگ','ماش','کینولا','تل','سورج مکھی','مٹر','کپاہ','کݨک','پھٹی','دھان','باجرہ','جوار'];

    for (const pat of cropPatterns) {
      let m;
      while ((m = pat.regex.exec(text)) !== null) {
        const name = m[pat.nameIdx]?.trim();
        const acres = parseFloat(m[pat.acreIdx]);
        if (name && CROP_NAMES_UR.some(c => name.includes(c))) {
          extracted.crops.push({ name, acres: acres || null });
          hasData = true;
        }
      }
    }

    // ── Extract livestock ──────────────────────────────────────────────────
    const LIVESTOCK_UR = [
      { keywords: ['بھینس','مجھ','مہی'], type: 'بھینس' },
      { keywords: ['گائے','گاں','ڳاں'], type: 'گائے' },
      { keywords: ['بکری','ٻکری','ٻکرا'], type: 'بکری' },
      { keywords: ['مرغی','مرغا'], type: 'مرغی' },
      { keywords: ['بیل'], type: 'بیل' },
    ];

    for (const lv of LIVESTOCK_UR) {
      for (const kw of lv.keywords) {
        // "3 بھینسیں" or "میرے پاس 5 بکریاں ہیں"
        const countRegex = new RegExp('(\\d+)\\s*' + kw, 'gi');
        let m;
        while ((m = countRegex.exec(text)) !== null) {
          extracted.livestock.push({ type: lv.type, count: parseInt(m[1], 10) });
          hasData = true;
        }
      }
    }

    // ── Extract milk yield ─────────────────────────────────────────────────
    const milkMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:لیٹر|لٹر|liter|litre)\s*(?:دودھ|دُدھ|milk)/i)
                   || text.match(/(?:دودھ|دُدھ|milk)\s*(\d+(?:\.\d+)?)\s*(?:لیٹر|لٹر|liter)/i);
    if (milkMatch && extracted.livestock.length > 0) {
      extracted.livestock[0].milk_liters = parseFloat(milkMatch[1]);
      hasData = true;
    }

    if (!hasData) {
      return res.json({ extracted: false });
    }

    // Merge with existing profile
    const existing = await db.getFarmerProfile(req.user.id);
    const merged = {
      crops: [...(existing?.crops || [])],
      livestock: [...(existing?.livestock || [])],
      spray_log: existing?.spray_log || [],
      soil: existing?.soil || {},
      notes: existing?.notes || ''
    };

    // Merge crops (update if same name, else append)
    for (const newCrop of extracted.crops) {
      const idx = merged.crops.findIndex(c => c.name === newCrop.name);
      if (idx >= 0) {
        merged.crops[idx] = { ...merged.crops[idx], ...newCrop };
      } else {
        merged.crops.push(newCrop);
      }
    }

    // Merge livestock (update if same type, else append)
    for (const newLv of extracted.livestock) {
      const idx = merged.livestock.findIndex(l => l.type === newLv.type);
      if (idx >= 0) {
        merged.livestock[idx] = { ...merged.livestock[idx], ...newLv };
      } else {
        merged.livestock.push(newLv);
      }
    }

    // Cap arrays to prevent unbounded growth
    merged.crops = merged.crops.slice(0, 20);
    merged.livestock = merged.livestock.slice(0, 15);
    merged.spray_log = merged.spray_log.slice(0, 50);

    const saved = await db.upsertFarmerProfile(req.user.id, merged);
    console.log(`[میرا فارم] Extracted for ${req.user.phone}: ${extracted.crops.length} crops, ${extracted.livestock.length} livestock`);
    res.json({ extracted: true, profile: saved });

  } catch (err) {
    console.error('Extract profile error:', err.message);
    // Non-blocking — always return 200 even on error
    res.json({ extracted: false, error: err.message });
  }
});

module.exports = router;
