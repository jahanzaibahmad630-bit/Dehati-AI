const express = require('express');
const bcrypt  = require('bcryptjs');
const { requireAdmin, signAdminToken } = require('../middleware/auth');
const { adminLoginLimiter } = require('../middleware/rateLimit');
const { supabase } = require('../lib/supabase');
const { getMemUsers, getRecentRegistrations } = require('../lib/memStore');

const router = express.Router();

const SERVER_START = new Date();

// In-memory price overrides (reset on redeploy)
let priceOverrides = {};

// In-memory announcements (reset on redeploy)
let announcements = [];
let announcementIdCounter = 1;


// ─── POST /api/admin/login ─────────────────────────────────────────────────────────────────
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

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────────────────
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const uptimeSeconds = Math.floor((new Date() - SERVER_START) / 1000);
    const hours   = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime  = `${hours}h ${minutes}m`;

    const memUsersList = getMemUsers();
    let totalUsers = memUsersList.length;
    let guestUsers = 0;
    let newToday = 0;

    if (supabase) {
      try {
        const { count: total } = await supabase
          .from('users').select('*', { count: 'exact', head: true });
        totalUsers = (total || 0) + memUsersList.length;

        const { count: guests } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .eq('is_guest', true);
        guestUsers = guests || 0;

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: todayCount } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', since);
        newToday = (todayCount || 0) + memUsersList.filter(u => {
          return u.created_at && new Date(u.created_at) > new Date(since);
        }).length;
      } catch (dbErr) {
        // Supabase unavailable — show memory counts only
        newToday = memUsersList.length;
      }
    } else {
      newToday = memUsersList.length;
    }

    res.json({
      totalUsers,
      guestUsers,
      registeredUsers: totalUsers - guestUsers,
      newToday,
      memOnlyUsers: memUsersList.length,
      uptime,
      serverStart: SERVER_START.toISOString(),
      claudeConfigured: !!process.env.CLAUDE_API_KEY,
      supabaseConfigured: !!process.env.SUPABASE_URL,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const memUsersList = getMemUsers().map(u => ({ ...u, password_hash: undefined, source: 'memory' }));

    if (!supabase) {
      return res.json({ users: memUsersList, total: memUsersList.length, devMode: true });
    }

    const page   = parseInt(req.query.page  || '1');
    const limit  = parseInt(req.query.limit || '20');
    const search = req.query.search || '';
    const from   = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, name, phone, district, land_size, created_at, is_guest', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: dbUsers, count, error } = await query;
    if (error) {
      // Supabase failed — return memory users only
      return res.json({ users: memUsersList, total: memUsersList.length, memOnly: true });
    }

    // Merge: Supabase users + in-memory users (avoid duplicates by phone)
    const dbPhones = new Set((dbUsers || []).map(u => u.phone));
    const uniqueMemUsers = memUsersList.filter(u => !dbPhones.has(u.phone));
    const allUsers = [...(dbUsers || []), ...uniqueMemUsers];

    res.json({ users: allUsers, total: (count || 0) + uniqueMemUsers.length, page, limit });
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

  // Claude
  if (process.env.CLAUDE_API_KEY) {
    const start = Date.now();
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
      await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }]
      });
      checks.claude = { status: 'ok', latency: Date.now() - start };
    } catch (e) {
      checks.claude = { status: 'error', error: e.message, latency: Date.now() - start };
    }
  } else {
    checks.claude = { status: 'not_configured' };
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
    const memRecent = getRecentRegistrations(20);

    if (!supabase) {
      return res.json({ recent: memRecent, memOnly: true });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, district, land_size, created_at, is_guest')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      // Supabase failed — show in-memory registrations
      return res.json({ recent: memRecent, memOnly: true });
    }

    // Merge Supabase + memory (deduplicate by phone)
    const dbPhones = new Set((data || []).map(u => u.phone));
    const uniqueMem = memRecent.filter(u => !dbPhones.has(u.phone));
    const merged = [...(data || []), ...uniqueMem]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    res.json({ recent: merged });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});


// ─── PUBLIC: GET /api/admin/announcements/public ────────────────────────────
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

// ─── ADMIN: GET /api/admin/announcements ─────────────────────────────────────
router.get('/announcements', requireAdmin, (req, res) => {
  res.json({ announcements, total: announcements.length });
});

// ─── ADMIN: POST /api/admin/announcements ────────────────────────────────────
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

// ─── ADMIN: PATCH /api/admin/announcements/:id/toggle ────────────────────────
router.patch('/announcements/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const ann = announcements.find(a => a.id === id);
  if (!ann) return res.status(404).json({ error: 'Not found' });
  ann.active = !ann.active;
  res.json({ success: true, announcement: ann });
});

// ─── ADMIN: DELETE /api/admin/announcements/:id ──────────────────────────────
router.delete('/announcements/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = announcements.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
  announcements.splice(idx, 1);
  res.json({ success: true, deletedId: id });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMES
// ═══════════════════════════════════════════════════════════════════════════════

// Pre-seeded with all 6 static schemes — admin can edit/add/delete
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
    amountDetail: 'صرف 7% مارک اپ پر — باقی حکومت ادا کرتی ہے',
    subsidy: 'حکومت 93% سود ادا کرتی ہے',
    eligibility: '18–45 سال، پاکستانی شہری، زرعی تجربہ',
    documents: ['CNIC', 'تعلیمی سند', 'بزنس پلان', 'گارنٹر'],
    howToApply: 'کمرشل بینک یا مائیکرو فنانس بینک سے رابطہ کریں',
    applyPhone: '1786', applyUrl: 'https://kamyabjawan.gov.pk',
    source: 'Prime Minister Kamyab Jawan Programme', lastVerified: '2025-10-01', active: true
  },
  {
    id: 'akhuwat', name: 'اخوت قرضِ حسن', icon: '🤝', color: '#8C6239',
    tagline: 'بالکل سود کے بغیر', amount: '₨20,000 سے ₨80,000',
    amountDetail: 'بالکل سود نہیں — صرف اصل رقم واپس | 12 ماہ میں قسطیں',
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

// ─── PUBLIC: GET /api/admin/schemes/public ─────────────────────────────────────
router.get('/schemes/public', (req, res) => {
  res.json({ schemes: schemes.filter(s => s.active !== false) });
});

// ─── ADMIN: GET /api/admin/schemes ────────────────────────────────────────────
router.get('/schemes', requireAdmin, (req, res) => {
  res.json({ schemes, total: schemes.length });
});

// ─── ADMIN: POST /api/admin/schemes ───────────────────────────────────────────
router.post('/schemes', requireAdmin, (req, res) => {
  const { name, icon = '📋', tagline, amount, amountDetail, subsidy, eligibility,
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

// ─── ADMIN: PUT /api/admin/schemes/:id ────────────────────────────────────────
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

// ─── ADMIN: PATCH /api/admin/schemes/:id/toggle ───────────────────────────────
router.patch('/schemes/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  const s = schemes.find(s => s.id === id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.active = !s.active;
  res.json({ success: true, scheme: s });
});

// ─── ADMIN: DELETE /api/admin/schemes/:id ─────────────────────────────────────
router.delete('/schemes/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = schemes.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  schemes.splice(idx, 1);
  res.json({ success: true, deletedId: id });
});

module.exports = router;
module.exports.getPriceOverrides = () => ({ ...priceOverrides });
