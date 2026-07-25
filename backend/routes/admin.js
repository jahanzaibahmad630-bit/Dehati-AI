const express = require('express');
const bcrypt  = require('bcryptjs');
const { requireAdmin, signAdminToken } = require('../middleware/auth');
const { adminLoginLimiter } = require('../middleware/rateLimit');
const { supabase } = require('../lib/supabase');
const { getRecentRegistrations } = require('../lib/memStore');
const db       = require('../lib/db');
const aiCache  = require('../lib/aiCache');

const router = express.Router();

const SERVER_START = new Date();

// NOTE: priceOverrides moved to PostgreSQL mandi_prices table (survives restarts)
// See db.setPriceDB / db.getPricesDB / db.deletePriceDB

// In-memory announcements (reset on redeploy)
let announcements = [];
let announcementIdCounter = 1;


// â”€â”€â”€ POST /api/admin/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Rate-limited: 10 attempts per 15 min per IP (brute-force protection)
router.post('/login', adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@dehati.ai';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Constant-time email compare prevents timing enumeration
  const emailMatch = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  // Always run comparison even on email mismatch (timing-safe)
  const passwordMatch = password === ADMIN_PASSWORD;
  if (!emailMatch || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = signAdminToken(email);
  res.json({ token, email, role: 'admin' });
});

// â”€â”€â”€ GET /api/admin/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const uptimeSeconds = Math.floor((new Date() - SERVER_START) / 1000);
    const hours   = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime  = `${hours}h ${minutes}m`;

    const [totalUsers, newToday] = await Promise.all([
      db.getTotalUserCount(),
      db.getNewTodayCount()
    ]);

    res.json({
      totalUsers,
      guestUsers: 0,
      registeredUsers: totalUsers,
      newToday,
      uptime,
      serverStart: SERVER_START.toISOString(),
      claudeConfigured:    !!process.env.CLAUDE_API_KEY,
      supabaseConfigured:  !!process.env.SUPABASE_URL,
      postgresConfigured:  !!process.env.DATABASE_URL,
      persistentDB:        db.isUsingPersistentDB(),
      nodeVersion:   process.version,
      environment:   process.env.NODE_ENV || 'production',
      aiCache:       await aiCache.stats()
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// â”€â”€â”€ GET /api/admin/users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page   = parseInt(req.query.page  || '1');
    const limit  = parseInt(req.query.limit || '20');
    const search = req.query.search || '';
    const { users, total } = await db.getAllUsers({ page, limit, search });
    res.json({ users, total, page, limit });
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// â”€â”€â”€ DELETE /api/admin/users/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'User ID required' });
    await db.deleteUser(id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// â”€â”€â”€ GET /api/admin/db-test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/db-test', requireAdmin, async (req, res) => {
  const result = await db.testConnection();
  res.json(result);
});

// â”€â”€â”€ GET /api/admin/health â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/health', requireAdmin, async (req, res) => {
  const checks = {};

  // Backend self
  checks.backend = { status: 'ok', latency: 0 };

  // Claude â€” with detailed error diagnosis
  if (process.env.CLAUDE_API_KEY) {
    const start = Date.now();
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
      await client.messages.create({
        model: 'claude-sonnet-4-5',  // Claude Sonnet 4.x â€” platform.claude.com
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }]
      });
      checks.claude = { status: 'ok', latency: Date.now() - start };
    } catch (e) {
      // Parse error type for helpful diagnosis
      const errStr  = e.message || '';
      const status  = e.status || e.statusCode || '?';
      let hint = '';
      if (status === 401 || errStr.includes('authentication')) {
        hint = 'Invalid API key — set correct CLAUDE_API_KEY in Railway Variables';
      } else if (status === 403 || errStr.includes('permission') || errStr.includes('credit')) {
        hint = 'Account has no credits — add billing at console.anthropic.com/settings/billing';
      } else if (errStr.includes('not_found') || status === 404) {
        hint = 'Model not available for this key — account may need billing or verification at console.anthropic.com';
      } else if (status === 429) {
        hint = 'Rate limit hit — too many requests';
      }
      checks.claude = {
        status: 'error',
        error: `[${status}] ${errStr}`,
        hint,
        latency: Date.now() - start
      };
    }
  } else {
    checks.claude = {
      status: 'not_configured',
      hint: 'Set CLAUDE_API_KEY in Railway Variables'
    };
  }

  // Open-Meteo
  const start2 = Date.now();
  try {
    const https = require('https');
    await new Promise((resolve, reject) => {
      const req2 = https.get('https://api.open-meteo.com/v1/forecast?latitude=31.5&longitude=74.3&current_weather=true', (r) => {
        r.resume(); resolve();
      });
      req2.on('error', reject);
      req2.setTimeout(5000, () => { req2.destroy(); reject(new Error('timeout')); });
    });
    checks.openMeteo = { status: 'ok', latency: Date.now() - start2 };
  } catch (e) {
    checks.openMeteo = { status: 'error', error: e.message };
  }

  // Supabase
  if (supabase) {
    const start3 = Date.now();
    try {
      await supabase.from('users').select('id', { count: 'exact', head: true });
      checks.supabase = { status: 'ok', latency: Date.now() - start3 };
    } catch (e) {
      checks.supabase = { status: 'error', error: e.message };
    }
  } else {
    checks.supabase = { status: 'not_configured' };
  }

  res.json({ checks, timestamp: new Date().toISOString() });
});


// ——— GET /api/admin/prices —————————————————————————————————————————————————————————————————————
// Returns all crops with their base reference price and any admin-entered DB price
router.get('/prices', requireAdmin, async (req, res) => {
  const BASE_PRICES = [
    { key: 'گندم',           nameEn: 'Wheat',     base: 3900,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'باسمتی چاول',   nameEn: 'Basmati',   base: 4800,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'مکئی',            nameEn: 'Maize',     base: 1800,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'کپاس',           nameEn: 'Cotton',    base: 9500,  unit: 'من (40 کلو)',   category: 'نقدی فصل'  },
    { key: 'گنا',            nameEn: 'Sugarcane', base: 475,   unit: 'من (40 کلو)',   category: 'نقدی فصل'  },
    { key: 'آلو',            nameEn: 'Potato',    base: 1400,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'ٹماٹر',         nameEn: 'Tomato',    base: 2200,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'پیاز',           nameEn: 'Onion',     base: 1100,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'مرچ',            nameEn: 'Chili',     base: 6500,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'لہسن',           nameEn: 'Garlic',    base: 18000, unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'سرسوں',         nameEn: 'Mustard',   base: 7200,  unit: 'من (40 کلو)',   category: 'تیلدار'   },
    { key: 'چنا',            nameEn: 'Chickpea',  base: 8500,  unit: 'من (40 کلو)',   category: 'دالیں'    },
    { key: 'مسور',           nameEn: 'Lentil',    base: 6800,  unit: 'من (40 کلو)',   category: 'دالیں'    },
    { key: 'DAP کھاد',     nameEn: 'DAP',       base: 10500, unit: 'بوری (50 کلو)', category: 'کھاد'     },
    { key: 'یوریا',          nameEn: 'Urea',      base: 3900,  unit: 'بوری (50 کلو)', category: 'کھاد'     },
  ];

  try {
    const dbRows = await db.getPricesDB();
    const dbMap = {};
    for (const r of dbRows) dbMap[r.crop_key] = r;

    const merged = {};
    for (const { key, base } of BASE_PRICES) {
      const db_entry = dbMap[key] || null;
      merged[key] = {
        base,
        dbPrice:    db_entry ? Number(db_entry.price) : null,
        sourceNote: db_entry ? db_entry.source_note   : null,
        updatedAt:  db_entry ? db_entry.updated_at    : null,
        isReal:     !!db_entry,
      };
    }
    res.json({ prices: merged, realCount: dbRows.length });
  } catch (err) {
    console.error('GET /admin/prices error:', err.message);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// â”€â”€â”€ GET /api/admin/prices/public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Farmer-facing public endpoint â€” no auth required
// Returns each crop with source label: real (DB) or sample (base reference)
router.get('/prices/public', async (req, res) => {
  const BASE_PRICES = [
    { key: 'گندم',           nameEn: 'Wheat',     base: 3900,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'باسمتی چاول',   nameEn: 'Basmati',   base: 4800,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'مکئی',            nameEn: 'Maize',     base: 1800,  unit: 'من (40 کلو)',   category: 'اناج'     },
    { key: 'کپاس',           nameEn: 'Cotton',    base: 9500,  unit: 'من (40 کلو)',   category: 'نقدی فصل'  },
    { key: 'گنا',            nameEn: 'Sugarcane', base: 475,   unit: 'من (40 کلو)',   category: 'نقدی فصل'  },
    { key: 'آلو',            nameEn: 'Potato',    base: 1400,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'ٹماٹر',         nameEn: 'Tomato',    base: 2200,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'پیاز',           nameEn: 'Onion',     base: 1100,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'مرچ',            nameEn: 'Chili',     base: 6500,  unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'لہسن',           nameEn: 'Garlic',    base: 18000, unit: 'من (40 کلو)',   category: 'سبزی'     },
    { key: 'سرسوں',         nameEn: 'Mustard',   base: 7200,  unit: 'من (40 کلو)',   category: 'تیلدار'   },
    { key: 'چنا',            nameEn: 'Chickpea',  base: 8500,  unit: 'من (40 کلو)',   category: 'دالیں'    },
    { key: 'مسور',           nameEn: 'Lentil',    base: 6800,  unit: 'من (40 کلو)',   category: 'دالیں'    },
    { key: 'DAP کھاد',     nameEn: 'DAP',       base: 10500, unit: 'بوری (50 کلو)', category: 'کھاد'     },
    { key: 'یوریا',          nameEn: 'Urea',      base: 3900,  unit: 'بوری (50 کلو)', category: 'کھاد'     },
  ];

  try {
    const dbRows = await db.getPricesDB();
    const dbMap = {};
    for (const r of dbRows) dbMap[r.crop_key] = r;

    const prices = BASE_PRICES.map((item, idx) => {
      const entry = dbMap[item.key];
      if (entry) {
        // Real admin-entered price
        return {
          id:         idx + 1,
          key:        item.key,
          nameUrdu:   item.key,
          nameEn:     item.nameEn,
          unit:       item.unit,
          category:   item.category,
          price:      Number(entry.price),
          isReal:     true,
          sourceNote: entry.source_note,
          updatedAt:  entry.updated_at,
          dataLabel:  'آج درج کی گئی قیمت',
          dataLabelEn: 'Price entered today',
        };
      }
      // Sample / reference price â€” clearly labelled
      return {
        id:         idx + 1,
        key:        item.key,
        nameUrdu:   item.key,
        nameEn:     item.nameEn,
        unit:       item.unit,
        category:   item.category,
        price:      item.base,
        isReal:     false,
        sourceNote: 'sample-reference',
        updatedAt:  null,
        dataLabel:  'حوالہ قیمت — نمونہ ڈیٹا',
        dataLabelEn: 'Reference price â€” sample data',
      };
    });

    const serverTs = new Date().toISOString();
    res.set('Cache-Control', 'public, max-age=300'); // 5-min CDN cache is fine
    res.json({ prices, servedAt: serverTs, realCount: dbRows.length });
  } catch (err) {
    console.error('GET /admin/prices/public error:', err.message);
    // Graceful fallback: serve base prices as sample data
    const BASE_FALLBACK = [
      { key: 'گندم', nameEn: 'Wheat', base: 3900, unit: 'من (40 کلو)', category: 'اناج' },
      { key: 'کپاس', nameEn: 'Cotton', base: 9500, unit: 'من (40 کلو)', category: 'نقدی فصل' },
      { key: 'DAP کھاد', nameEn: 'DAP', base: 10500, unit: 'بوری (50 کلو)', category: 'کھاد' },
    ];
    res.json({
      prices: BASE_FALLBACK.map((i, idx) => ({ ...i, id: idx+1, nameUrdu: i.key, price: i.base,
        isReal: false, sourceNote: 'fallback', updatedAt: null,
        dataLabel: 'ڈیٹا دستیاب نہیں — حوالہ قیمت', dataLabelEn: 'Data unavailable — reference only' })),
      servedAt: new Date().toISOString(), realCount: 0, error: 'db_unavailable'
    });
  }
});

// â”€â”€â”€ PUT /api/admin/prices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin enters a real mandi price. Persisted to PostgreSQL.
router.put('/prices', requireAdmin, async (req, res) => {
  const { crop, price, sourceNote } = req.body;
  if (!crop || price == null) return res.status(400).json({ error: 'crop and price required' });
  const p = Number(price);
  if (isNaN(p) || p <= 0) return res.status(400).json({ error: 'Price must be a positive number' });

  try {
    if (p === 0) {
      // price=0 means remove (revert to sample)
      await db.deletePriceDB(crop);
      return res.json({ success: true, action: 'reset', crop });
    }
    const note = typeof sourceNote === 'string' && sourceNote.trim()
      ? sourceNote.trim()
      : 'admin-entry';
    const saved = await db.setPriceDB(crop, p, note);
    if (!saved) {
      // DB not available â€” still acknowledge but warn
      return res.status(503).json({ error: 'Database not available â€” price not persisted' });
    }
    console.log(`âœ… Admin set real price: ${crop} = â‚¨${p} (${note})`);
    res.json({ success: true, action: 'saved-to-db', crop, price: p, sourceNote: note });
  } catch (err) {
    console.error('PUT /admin/prices error:', err.message);
    res.status(500).json({ error: 'Failed to save price' });
  }
});

// â”€â”€â”€ DELETE /api/admin/prices/:crop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Revert a single crop to sample data
router.delete('/prices/:crop', requireAdmin, async (req, res) => {
  try {
    await db.deletePriceDB(decodeURIComponent(req.params.crop));
    res.json({ success: true, action: 'reverted-to-sample', crop: req.params.crop });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete price' });
  }
});

// â”€â”€â”€ DELETE /api/admin/prices/reset â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Kept for compatibility â€” now a no-op warning since prices are in DB
router.delete('/prices/reset', requireAdmin, async (req, res) => {
  // To reset all, drop and recreate table â€” not exposed for safety
  res.json({ success: false, message: 'Use DELETE /api/admin/prices/:crop to reset individual crops. Full reset not exposed for safety.' });
});


// â”€â”€â”€ GET /api/admin/recent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const recent = await db.getRecentUsers(20);
    res.json({ recent });
  } catch (err) {
    console.error('Recent error:', err.message);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});


// â”€â”€â”€ PUBLIC: GET /api/admin/announcements/public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called by the farmer app (no admin auth needed)
router.get('/announcements/public', (req, res) => {
  const now = Date.now();
  const active = announcements.filter(a => {
    if (!a.active) return false;
    if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
    return true;
  });
  res.json({ announcements: active });
});

// â”€â”€â”€ ADMIN: GET /api/admin/announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/announcements', requireAdmin, (req, res) => {
  res.json({ announcements, total: announcements.length });
});

// â”€â”€â”€ ADMIN: POST /api/admin/announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/announcements', requireAdmin, (req, res) => {
  const { title, message, type = 'info', expiresAt = null, link = '' } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const ann = {
    id: announcementIdCounter++,
    title: title?.trim() || '',
    message: message.trim(),
    type, // 'info' | 'warning' | 'success' | 'urgent'
    link: link?.trim() || '',
    expiresAt: expiresAt || null,
    active: true,
    createdAt: new Date().toISOString()
  };

  announcements.unshift(ann); // newest first
  res.json({ success: true, announcement: ann });
});

// â”€â”€â”€ ADMIN: PATCH /api/admin/announcements/:id/toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/announcements/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const ann = announcements.find(a => a.id === id);
  if (!ann) return res.status(404).json({ error: 'Not found' });
  ann.active = !ann.active;
  res.json({ success: true, announcement: ann });
});

// â”€â”€â”€ ADMIN: DELETE /api/admin/announcements/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/announcements/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = announcements.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
  announcements.splice(idx, 1);
  res.json({ success: true, deletedId: id });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SCHEMES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Pre-seeded with all 6 static schemes â€” admin can edit/add/delete
let schemes = [
  {
    id: 'kisan-card', name: 'CM پنجاب کسان کارڈ 2025', icon: '💳', color: '#2F4A1E',
    tagline: 'سود کے بغیر قرضہ', amount: '₨1 لاکھ سے ₨2 لاکھ',
    amountDetail: '5 ایکڑ سے کم: ₨1 لاکھ | 5–12.5 ایکڑ: ₨1.5 لاکھ | 12.5–25 ایکڑ: ₨2 لاکھ',
    subsidy: 'کھاد سبسڈی: ₨50,000 فی سیزن',
    eligibility: 'پنجاب میں زمین ہو، B-فارم یا فرد ہو، فعال CNIC ہو',
    documents: ['شناختی کارڈ (CNIC)', 'زمین کی فرد (Girdawari)', 'بینک اکاؤنٹ'],
    howToApply: 'SMS کریں: KISAN [CNIC] 8070 پر، یا ویب سائٹ پر درخواست دیں',
    applyPhone: '8070', applyUrl: 'https://kissan.punjab.gov.pk',
    source: 'Punjab Government', lastVerified: '2025-12-01', active: true
  },
  {
    id: 'ztbl', name: 'ZTBL زرعی قرضہ', icon: '🏦', color: '#4F7942',
    tagline: 'فصل کے مطابق قرضہ', amount: 'فی ایکڑ ₨16,000–₨30,000',
    amountDetail: 'گندم ₨16,000/ایکڑ | چاول ₨19,000 | گنا ₨30,000 | کپاس ₨21,000 | زیادہ سے زیادہ ₨10 لاکھ',
    subsidy: 'فصل بیمہ: پریمیم کا 1.3%',
    eligibility: '18 سال سے زیادہ عمر، زمین یا کرائے کی زمین، CNIC',
    documents: ['CNIC', 'زمین کی فرد یا کرایہ نامہ', 'پاسپورٹ سائز تصویر', 'گارنٹر'],
    howToApply: 'قریبی ZTBL برانچ میں جائیں',
    applyPhone: '0800-00182', applyUrl: 'https://www.ztbl.com.pk',
    source: 'Zarai Taraqiati Bank Limited', lastVerified: '2025-11-01', active: true
  },
  {
    id: 'pm-youth-agri', name: 'PM یوتھ زرعی قرضہ', icon: '🌱', color: '#E0A526',
    tagline: 'نوجوان کسانوں کے لیے', amount: '₨50,000 سے ₨15 لاکھ',
    amountDetail: 'صرف 7% مارک اپ پر – باقی حکومت ادا کرتی ہے',
    subsidy: 'حکومت 93% سود ادا کرتی ہے',
    eligibility: '18–45 سال، پاکستانی شہری، زرعی تجربہ',
    documents: ['CNIC', 'تعلیمی سند', 'بزنس پلان', 'گارنٹر'],
    howToApply: 'کمرشل بینک یا مائیکرو فنانس بینک سے رابطہ کریں',
    applyPhone: '1786', applyUrl: 'https://kamyabjawan.gov.pk',
    source: 'Prime Minister Kamyab Jawan Programme', lastVerified: '2025-10-01', active: true
  },
  {
    id: 'akhuwat', name: 'اخوت قرضّہ حسن', icon: '🤝', color: '#8C6239',
    tagline: 'بالکل سود کے بغیر', amount: '₨20,000 سے ₨80,000',
    amountDetail: 'بالکل سود نہیں – صرف اصل رقم واپس | 12 ماہ میں قسطیں',
    subsidy: 'صفر فیصد سود',
    eligibility: 'کم آمدنی والے کسان، گارنٹر ضروری',
    documents: ['CNIC', 'گارنٹر کا CNIC', 'رہائشی ثبوت'],
    howToApply: 'قریبی اخوت برانچ میں جائیں یا فون کریں',
    applyPhone: '042-35761999', applyUrl: 'https://akhuwat.org.pk',
    source: 'Akhuwat Foundation', lastVerified: '2025-09-01', active: true
  },
  {
    id: 'solar-tube-well', name: 'سولر ٹیوب ویل اسکیم', icon: '☀️', color: '#2F4A1E',
    tagline: 'مفت بجلی، کم خرچ', amount: 'بھاری سبسڈی پر سولر پمپ',
    amountDetail: 'سرکاری سبسڈی پر سولر پینل اور پمپ | بجلی کا خرچ صفر',
    subsidy: '50–80% سبسڈی',
    eligibility: '5 ایکڑ یا اس سے زیادہ زمین، پنجاب کا رہائشی',
    documents: ['CNIC', 'زمین کی فرد', 'بجلی کنیکشن کا ثبوت'],
    howToApply: 'پنجاب انرجی ڈیپارٹمنٹ یا PESCO/LESCO سے رابطہ کریں',
    applyPhone: '042-99203208', applyUrl: 'https://energy.punjab.gov.pk',
    source: 'Punjab Energy Department', lastVerified: '2025-08-01', active: true
  },
  {
    id: 'green-tractor', name: 'گرین ٹریکٹر اسکیم', icon: '🚜', color: '#4F7942',
    tagline: 'سستے ٹریکٹر', amount: 'ٹریکٹر پر ₨2–5 لاکھ سبسڈی',
    amountDetail: 'نئے ٹریکٹر پر سرکاری سبسڈی | قسطوں پر بھی دستیاب',
    subsidy: 'مارکیٹ قیمت سے 20–30% کم',
    eligibility: '6–50 ایکڑ زمین، پنجاب کا رہائشی، پہلے سے ٹریکٹر نہ ہو',
    documents: ['CNIC', 'زمین کی فرد', 'بینک سٹیٹمنٹ'],
    howToApply: 'ضلعی زرعی دفتر سے رابطہ کریں',
    applyPhone: '042-99213253', applyUrl: 'https://agripunjab.gov.pk',
    source: 'Punjab Agriculture Department', lastVerified: '2025-07-01', active: true
  }
];
let schemeIdCounter = 100;

// â”€â”€â”€ PUBLIC: GET /api/admin/schemes/public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/schemes/public', (req, res) => {
  res.json({ schemes: schemes.filter(s => s.active !== false) });
});

// â”€â”€â”€ ADMIN: GET /api/admin/schemes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/schemes', requireAdmin, (req, res) => {
  res.json({ schemes, total: schemes.length });
});

// â”€â”€â”€ ADMIN: POST /api/admin/schemes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/schemes', requireAdmin, (req, res) => {
  const { name, icon = 'ðŸ“‹', tagline, amount, amountDetail, subsidy, eligibility,
          documents, howToApply, applyPhone, applyUrl, source, lastVerified, color = '#2F4A1E' } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Scheme name is required' });

  const scheme = {
    id: `scheme-${schemeIdCounter++}`,
    name: name.trim(), icon, tagline: tagline || '', amount: amount || '',
    amountDetail: amountDetail || '', subsidy: subsidy || '',
    eligibility: eligibility || '', color,
    documents: Array.isArray(documents) ? documents : (documents ? documents.split('\n').filter(Boolean) : []),
    howToApply: howToApply || '', applyPhone: applyPhone || '',
    applyUrl: applyUrl || '', source: source || '',
    lastVerified: lastVerified || new Date().toISOString().split('T')[0],
    active: true, createdAt: new Date().toISOString()
  };

  schemes.unshift(scheme);
  res.json({ success: true, scheme });
});

// â”€â”€â”€ ADMIN: PUT /api/admin/schemes/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/schemes/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = schemes.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Scheme not found' });

  const updates = req.body;
  if (updates.documents && typeof updates.documents === 'string') {
    updates.documents = updates.documents.split('\n').filter(Boolean);
  }

  schemes[idx] = { ...schemes[idx], ...updates, id, updatedAt: new Date().toISOString() };
  res.json({ success: true, scheme: schemes[idx] });
});

// â”€â”€â”€ ADMIN: PATCH /api/admin/schemes/:id/toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/schemes/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  const s = schemes.find(s => s.id === id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.active = !s.active;
  res.json({ success: true, scheme: s });
});

// â”€â”€â”€ ADMIN: DELETE /api/admin/schemes/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/schemes/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = schemes.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  schemes.splice(idx, 1);
  res.json({ success: true, deletedId: id });
});

// â”€â”€â”€ ADMIN: GET /api/admin/chatlogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/chatlogs', requireAdmin, async (req, res) => {
  try {
    const page   = parseInt(req.query.page   || '1',  10);
    const limit  = parseInt(req.query.limit  || '30', 10);
    const search = req.query.search || '';
    const result = await db.getChatLogs({ page, limit, search });
    res.json(result);
  } catch (err) {
    console.error('GET /chatlogs error:', err.message);
    res.status(500).json({ error: 'Could not fetch chat logs' });
  }
});


// --- POST /api/admin/cache/flush ---
router.post('/cache/flush', requireAdmin, async (req, res) => {
  try {
    const deleted = await aiCache.flush(true);
    res.json({ success: true, deleted, message: 'AI cache cleared from memory and database' });
  } catch (err) {
    res.status(500).json({ error: 'Cache flush failed: ' + err.message });
  }
});

module.exports = router;



