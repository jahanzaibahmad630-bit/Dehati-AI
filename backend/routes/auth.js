const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../lib/supabase');
const { signToken } = require('../middleware/auth');
const { memUsers, addMemUser } = require('../lib/memStore');

const router = express.Router();
const SALT_ROUNDS = 10; // reduced from 12 for faster response on free tier

// ─── In-memory fallback store (when Supabase table missing/fails) ─────────────
// memUsers is now shared with admin.js via lib/memStore.js

function makeMockUser(data) {
  return {
    id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    name: data.name,
    phone: data.phone,
    district: data.district || null,
    land_size: data.landSize ? parseFloat(data.landSize) : null,
    password_hash: data.password_hash,
    is_guest: false,
    created_at: new Date().toISOString()
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, phone, district, landSize, password } = req.body;

    // Validation
    if (!name?.trim() || !phone || !password) {
      return res.status(400).json({ error: 'نام، فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'درست فون نمبر داخل کریں (کم از کم 10 ہندسے)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'پاسورڈ کم از کم 6 حروف کا ہونا چاہیے' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Try Supabase first ──────────────────────────────────────────────────────
    if (supabase) {
      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — لاگ ان کریں' });
        }

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: name.trim(),
            phone: cleanPhone,
            district: district || null,
            land_size: landSize ? parseFloat(landSize) : null,
            password_hash: passwordHash
          })
          .select()
          .single();

        if (insertError) {
          // Table might not exist — fall through to memory mode
          console.warn('Supabase insert failed:', insertError.message, '— falling back to memory mode');
          throw insertError;
        }

        const token = signToken(newUser);
        return res.status(201).json({
          token,
          user: { name: newUser.name, phone: newUser.phone, district: newUser.district, landSize: newUser.land_size }
        });

      } catch (dbErr) {
        // If it's a table-not-found or permission error, fall through to memory mode
        const isTableMissing = dbErr.code === '42P01' || dbErr.message?.includes('does not exist') ||
          dbErr.code === 'PGRST116' || dbErr.message?.includes('relation');
        if (!isTableMissing) {
          // Real error (not table missing) — still fall through but log clearly
          console.error('Supabase DB error (non-table-missing):', dbErr.message);
        }
        console.warn('⚠️  Using in-memory fallback for registration (Supabase unavailable)');
      }
    }

    // ── Memory fallback (no Supabase or table missing) ─────────────────────────
    if (memUsers.has(cleanPhone)) {
      return res.status(409).json({ error: 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — لاگ ان کریں' });
    }

    const mockUser = makeMockUser({ name: name.trim(), phone: cleanPhone, district, landSize, password_hash: passwordHash });
    addMemUser(mockUser); // use shared store

    const token = signToken(mockUser);
    return res.status(201).json({
      token,
      user: { name: mockUser.name, phone: cleanPhone, district: mockUser.district, landSize: mockUser.land_size }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'رجسٹریشن ناکام ہوئی — براہ کرم دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    // ── Try Supabase first ──────────────────────────────────────────────────────
    if (supabase) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (!error && user) {
          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (!isMatch) {
            return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
          }
          const token = signToken(user);
          return res.json({
            token,
            user: { name: user.name, phone: user.phone, district: user.district, landSize: user.land_size }
          });
        }

        if (error && !error.message?.includes('does not exist')) {
          // User not found (not a table-missing error)
          return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
        }
        // Table missing → fall through to memory
        console.warn('⚠️  Supabase login failed, trying memory fallback');
      } catch (dbErr) {
        console.warn('Supabase login error:', dbErr.message);
      }
    }

    // ── Memory fallback ─────────────────────────────────────────────────────────
    const memUser = memUsers.get(cleanPhone);
    // Timing-safe: always run bcrypt even if user not found (prevents user enumeration)
    const dummyHash = '$2b$10$invalidhashtopreventtimingattacksonusernotfound00000000';
    const hashToCheck = memUser ? memUser.password_hash : dummyHash;
    const isMatch = await bcrypt.compare(password, hashToCheck);
    if (!memUser || !isMatch) {
      return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
    }

    const token = signToken(memUser);
    return res.json({
      token,
      user: { name: memUser.name, phone: cleanPhone, district: memUser.district, landSize: memUser.land_size }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'لاگ ان ناکام ہوا — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/auth/guest ──────────────────────────────────────────────────────
router.post('/guest', (req, res) => {
  const guestUser = {
    id: 'guest-' + Date.now(),
    phone: 'guest',
    name: 'مہمان کسان',
    district: null,
    land_size: null,
    is_guest: true
  };
  const token = signToken(guestUser);
  res.json({ token, user: { name: 'مہمان کسان', phone: 'guest', isGuest: true } });
});

module.exports = router;
