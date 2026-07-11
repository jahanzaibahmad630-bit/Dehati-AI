const express = require('express');
const { requireAdmin, signAdminToken } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');

const router = express.Router();

const SERVER_START = new Date();

// In-memory price overrides (reset on redeploy)
let priceOverrides = {};

// ─── POST /api/admin/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@dehati.ai';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = signAdminToken(email);
  res.json({ token, email, role: 'admin' });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const uptimeSeconds = Math.floor((new Date() - SERVER_START) / 1000);
    const hours   = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime  = `${hours}h ${minutes}m`;

    let totalUsers = 0, guestUsers = 0, newToday = 0;

    if (supabase) {
      const { count: total } = await supabase
        .from('users').select('*', { count: 'exact', head: true });
      totalUsers = total || 0;

      const { count: guests } = await supabase
        .from('users').select('*', { count: 'exact', head: true })
        .eq('is_guest', true);
      guestUsers = guests || 0;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: todayCount } = await supabase
        .from('users').select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      newToday = todayCount || 0;
    }

    res.json({
      totalUsers,
      guestUsers,
      registeredUsers: totalUsers - guestUsers,
      newToday,
      uptime,
      serverStart: SERVER_START.toISOString(),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      supabaseConfigured: !!process.env.SUPABASE_URL,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        users: [
          { id: 'dev-1', name: 'Test Farmer', phone: '03001234567', district: 'Lahore', land_size: 5, created_at: new Date().toISOString(), is_guest: false }
        ],
        total: 1,
        devMode: true
      });
    }

    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const search = req.query.search || '';
    const from = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, name, phone, district, land_size, created_at, is_guest', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;
    if (error) throw error;

    res.json({ users: users || [], total: count || 0, page, limit });
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'User ID required' });

    if (!supabase) {
      return res.json({ success: true, devMode: true });
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── GET /api/admin/health ────────────────────────────────────────────────────
router.get('/health', requireAdmin, async (req, res) => {
  const checks = {};

  // Backend self
  checks.backend = { status: 'ok', latency: 0 };

  // Gemini
  if (process.env.GEMINI_API_KEY) {
    const start = Date.now();
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } });
      checks.gemini = { status: 'ok', latency: Date.now() - start };
    } catch (e) {
      checks.gemini = { status: 'error', error: e.message, latency: Date.now() - start };
    }
  } else {
    checks.gemini = { status: 'not_configured' };
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

// ─── GET /api/admin/prices ────────────────────────────────────────────────────
router.get('/prices', requireAdmin, (req, res) => {
  const BASE_PRICES = {
    'گندم': 3900, 'باسمتی چاول': 4800, 'مکئی': 1800, 'کپاس': 9500,
    'گنا': 475, 'آلو': 1400, 'ٹماٹر': 2200, 'پیاز': 1100, 'مرچ': 6500,
    'لہسن': 18000, 'سرسوں': 7200, 'چنا': 8500, 'مسور': 6800,
    'DAP کھاد': 10500, 'یوریا': 3900
  };

  const merged = {};
  for (const [crop, base] of Object.entries(BASE_PRICES)) {
    merged[crop] = { base, override: priceOverrides[crop] ?? null, effective: priceOverrides[crop] ?? base };
  }

  res.json({ prices: merged, overrideCount: Object.keys(priceOverrides).length });
});

// ─── PUT /api/admin/prices ────────────────────────────────────────────────────
router.put('/prices', requireAdmin, (req, res) => {
  const { crop, price } = req.body;
  if (!crop || price == null) return res.status(400).json({ error: 'crop and price required' });
  if (price < 0) return res.status(400).json({ error: 'Price must be positive' });

  if (price === 0) {
    delete priceOverrides[crop];
    return res.json({ success: true, action: 'reset', crop });
  }

  priceOverrides[crop] = Number(price);
  res.json({ success: true, action: 'updated', crop, price: priceOverrides[crop] });
});

// ─── DELETE /api/admin/prices/reset ──────────────────────────────────────────
router.delete('/prices/reset', requireAdmin, (req, res) => {
  priceOverrides = {};
  res.json({ success: true, message: 'All price overrides reset to defaults' });
});

// ─── GET /api/admin/recent ────────────────────────────────────────────────────
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ recent: [], devMode: true });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, district, created_at, is_guest')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ recent: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

module.exports = router;
module.exports.getPriceOverrides = () => ({ ...priceOverrides });
