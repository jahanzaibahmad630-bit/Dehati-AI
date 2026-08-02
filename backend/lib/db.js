/**
 * lib/db.js — Persistent database layer (production-grade)
 *
 * Priority:
 *  1. Railway PostgreSQL  (DATABASE_URL auto-set when you add Postgres plugin)
 *  2. Supabase            (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *  3. In-memory fallback  (data lost on restart — dev only)
 */

const { Pool } = require('pg');
const { addMemUser, getMemUsers, getRecentRegistrations, addMemChatLog, getMemChatLogs } = require('./memStore');

let pool = null;

// ─── PostgreSQL (Railway DATABASE_URL) ────────────────────────────────────────
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pool.on('error', (err) => console.error('PG pool error:', err.message));
  console.log('✅ PostgreSQL pool created from DATABASE_URL');
}

// ─── Supabase helper ──────────────────────────────────────────────────────────
function getSupabase() {
  try { return require('./supabase').supabase; } catch { return null; }
}

// ─── Auto-create PostgreSQL tables on first run ───────────────────────────────
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        phone         TEXT UNIQUE NOT NULL,
        district      TEXT,
        land_size     NUMERIC,
        password_hash TEXT NOT NULL,
        is_guest      BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS users_phone_idx   ON users(phone);
      CREATE INDEX IF NOT EXISTS users_created_idx ON users(created_at DESC);

      CREATE TABLE IF NOT EXISTS mandi_prices (
        crop_key    TEXT PRIMARY KEY,
        price       NUMERIC NOT NULL CHECK (price > 0),
        entered_by  TEXT NOT NULL DEFAULT 'admin',
        source_note TEXT NOT NULL DEFAULT 'admin-entry',
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_logs (
        id          BIGSERIAL PRIMARY KEY,
        user_id     TEXT,
        user_name   TEXT,
        user_phone  TEXT,
        question    TEXT NOT NULL,
        answer      TEXT,
        language    TEXT DEFAULT 'ur',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS chat_logs_created_idx ON chat_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS chat_logs_user_idx    ON chat_logs(user_id);

      CREATE TABLE IF NOT EXISTS ai_cache (
        cache_key   TEXT PRIMARY KEY,
        answer      TEXT NOT NULL,
        language    TEXT DEFAULT 'ur',
        hits        INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        expires_at  TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON ai_cache(expires_at);
    `);
    console.log('✅ PostgreSQL tables ready (users + mandi_prices + chat_logs + ai_cache)');
    await ensureAuditTables();
  } catch (err) {
    console.error('❌ initDB error:', err.message);
  }
}

// ─── Test connection (used by admin diagnostic endpoint) ──────────────────────
async function testConnection() {
  const result = { postgres: null, supabase: null };

  if (pool) {
    try {
      const { rows } = await pool.query('SELECT COUNT(*) as c FROM users');
      result.postgres = { ok: true, userCount: parseInt(rows[0].c, 10) };
    } catch (e) {
      result.postgres = { ok: false, error: e.message };
    }
  } else {
    result.postgres = { ok: false, error: 'DATABASE_URL not set' };
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Test 1: count
      const { count, error: countErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (countErr) throw new Error(`count: ${countErr.message}`);

      // Test 2: insert a probe record
      const probePhone = '__db_test_' + Date.now();
      const { error: insErr } = await supabase.from('users').insert({
        id: require('crypto').randomUUID(),
        name: 'DB Test',
        phone: probePhone,
        password_hash: 'test',
        created_at: new Date().toISOString()
      });
      if (insErr) throw new Error(`insert: ${insErr.code} — ${insErr.message}`);

      // Clean up probe
      await supabase.from('users').delete().eq('phone', probePhone);

      result.supabase = { ok: true, userCount: count || 0 };
    } catch (e) {
      result.supabase = { ok: false, error: e.message };
    }
  } else {
    result.supabase = { ok: false, error: 'SUPABASE_URL or SERVICE_ROLE_KEY not set' };
  }

  return result;
}

// ─── findUserByPhone ──────────────────────────────────────────────────────────
async function findUserByPhone(phone) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1 LIMIT 1', [phone]);
    return rows[0] || null;
  }
  const supabase = getSupabase();
  if (supabase) {
    // maybeSingle() returns null (not error) when 0 rows
    const { data, error } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (error) console.error('❌ findUserByPhone error:', error.code, error.message);
    return data || null;
  }
  const all = getMemUsers();
  return all.find(u => u.phone === phone) || null;
}

// ─── createUser ───────────────────────────────────────────────────────────────
async function createUser(user) {
  // user = { id, name, phone, district, land_size, password_hash, is_guest, created_at }

  // ── PostgreSQL path ──────────────────────────────────────────────────────────
  if (pool) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (id, name, phone, district, land_size, password_hash, is_guest, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (phone) DO NOTHING
         RETURNING *`,
        [user.id, user.name, user.phone, user.district,
         user.land_size, user.password_hash, user.is_guest || false,
         user.created_at || new Date()]
      );
      if (rows[0]) {
        console.log('✅ PostgreSQL: user saved', user.phone);
        return rows[0];
      }
      return null; // phone already exists
    } catch (e) {
      console.error('❌ PostgreSQL createUser error:', e.message);
      // fall through to Supabase
    }
  }

  // ── Supabase path ────────────────────────────────────────────────────────────
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Don't send `id` — let Supabase auto-generate UUID (avoids type mismatch)
      const payload = {
        name:          user.name,
        phone:         user.phone,
        district:      user.district || null,
        land_size:     user.land_size || null,
        password_hash: user.password_hash,
        is_guest:      user.is_guest || false,
        created_at:    user.created_at || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase createUser error:', error.code, error.message, error.details);
        // Fall through to memory
      } else {
        console.log('✅ Supabase: user saved', user.phone, 'id:', data.id);
        return data;
      }
    } catch (e) {
      console.error('❌ Supabase createUser exception:', e.message);
    }
  }

  // ── Memory fallback ──────────────────────────────────────────────────────────
  console.warn('⚠️  Saving to memory only (will be lost on restart):', user.phone);
  addMemUser(user);
  return user;
}

// ─── getAllUsers ──────────────────────────────────────────────────────────────
async function getAllUsers({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;

  if (pool) {
    const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
    const where  = search ? 'WHERE name ILIKE $1 OR phone ILIKE $1' : '';
    const pOffset = search ? '$3' : '$2';
    const pLimit  = search ? '$2' : '$1';
    const q = `SELECT id,name,phone,district,land_size,created_at,is_guest
               FROM users ${where}
               ORDER BY created_at DESC LIMIT ${pLimit} OFFSET ${pOffset}`;
    const { rows } = await pool.query(q, params);
    const cQ = search
      ? `SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR phone ILIKE $1`
      : `SELECT COUNT(*) FROM users`;
    const { rows: cr } = await pool.query(cQ, search ? [`%${search}%`] : []);
    return { users: rows, total: parseInt(cr[0].count, 10) };
  }

  const supabase = getSupabase();
  if (supabase) {
    let q = supabase
      .from('users')
      .select('id,name,phone,district,land_size,created_at,is_guest', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, count, error } = await q;
    if (error) console.error('❌ getAllUsers error:', error.message);
    return { users: data || [], total: count || 0 };
  }

  const all = getMemUsers();
  const filtered = search
    ? all.filter(u => u.name?.includes(search) || u.phone?.includes(search))
    : all;
  return { users: filtered.slice(offset, offset + limit), total: filtered.length };
}

// ─── getTotalUserCount ────────────────────────────────────────────────────────
async function getTotalUserCount() {
  if (pool) {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count, 10);
  }
  const supabase = getSupabase();
  if (supabase) {
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (error) console.error('❌ getTotalUserCount error:', error.message);
    return count || 0;
  }
  return getMemUsers().length;
}

// ─── getNewTodayCount ─────────────────────────────────────────────────────────
async function getNewTodayCount() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (pool) {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users WHERE created_at>=$1', [since]);
    return parseInt(rows[0].count, 10);
  }
  const supabase = getSupabase();
  if (supabase) {
    const { count, error } = await supabase.from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    if (error) console.error('❌ getNewTodayCount error:', error.message);
    return count || 0;
  }
  return getMemUsers().filter(u => new Date(u.created_at) >= since).length;
}

// ─── getRecentUsers ───────────────────────────────────────────────────────────
async function getRecentUsers(limit = 20) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT id,name,phone,district,land_size,created_at,is_guest FROM users ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows;
  }
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('users')
      .select('id,name,phone,district,land_size,created_at,is_guest')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) console.error('❌ getRecentUsers error:', error.message);
    return data || [];
  }
  return getRecentRegistrations(limit);
}

// ─── deleteUser ───────────────────────────────────────────────────────────────
async function deleteUser(id) {
  if (pool) { await pool.query('DELETE FROM users WHERE id=$1', [id]); return true; }
  const supabase = getSupabase();
  if (supabase) { await supabase.from('users').delete().eq('id', id); return true; }
  return false;
}

// ─── isUsingPersistentDB ──────────────────────────────────────────────────────
function isUsingPersistentDB() {
  return !!pool || !!getSupabase();
}

// ─── Mandi Price DB functions ──────────────────────────────────────────────────────────────

/**
 * Upsert a real mandi price entered by admin.
 * crop_key must match the CROP_LIST keys used by frontend.
 */
async function setPriceDB(cropKey, price, sourceNote = 'admin-entry') {
  if (!pool) return false;
  await pool.query(
    `INSERT INTO mandi_prices (crop_key, price, source_note, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (crop_key) DO UPDATE
     SET price = $2, source_note = $3, updated_at = NOW()`,
    [cropKey, price, sourceNote]
  );
  return true;
}

/**
 * Fetch all admin-entered prices from DB.
 * Returns array of { crop_key, price, source_note, updated_at }
 */
async function getPricesDB() {
  if (!pool) return [];
  const { rows } = await pool.query(
    'SELECT crop_key, price, source_note, updated_at FROM mandi_prices ORDER BY updated_at DESC'
  );
  return rows;
}

/**
 * Delete a single price entry (revert to sample data for that crop).
 */
async function deletePriceDB(cropKey) {
  if (!pool) return false;
  await pool.query('DELETE FROM mandi_prices WHERE crop_key=$1', [cropKey]);
  return true;
}

/**
 * Save a chat question + answer to chat_logs table.
 */
async function saveChatLog({ userId, userName, userPhone, question, answer, language }) {
  // Always save to memory so admin can see questions even without DB
  addMemChatLog({ userId, userName, userPhone, question, answer, language });
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO chat_logs (user_id, user_name, user_phone, question, answer, language)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, userName || null, userPhone || null,
       question, answer || null, language || 'ur']
    );
  } catch (err) {
    // Never crash the main flow if logging fails
    console.warn('saveChatLog error:', err.message);
  }
}

/**
 * Get paginated chat logs for admin panel.
 */
async function getChatLogs({ page = 1, limit = 20, search = '' } = {}) {
  if (!pool) return getMemChatLogs({ page, limit, search });
  const offset = (page - 1) * limit;
  const where  = search ? `WHERE question ILIKE $3 OR user_name ILIKE $3` : '';
  const params = search ? [limit, offset, `%${search}%`] : [limit, offset];

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT id, user_id, user_name, user_phone, question, language, created_at
       FROM chat_logs ${where}
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    ),
    pool.query(
      `SELECT COUNT(*) as c FROM chat_logs ${where}`,
      search ? [`%${search}%`] : []
    )
  ]);

  return { logs: rows, total: parseInt(countRows[0]?.c || 0, 10) };
}

/**
 * Get recent chat history for a logged-in user.
 */
async function getUserChatHistory(userId, limit = 30) {
  if (!userId) return [];
  if (!pool) return getMemChatLogs({ page: 1, limit, search: '' }).logs.filter(l => l.user_id === userId);
  try {
    const { rows } = await pool.query(
      `SELECT id, question, answer, language, created_at
       FROM chat_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  } catch (err) {
    console.warn('getUserChatHistory error:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistent AI Cache (PostgreSQL-backed, survives restarts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a cached answer from DB.
 * Returns the answer string, or null if not found / expired.
 */
async function getCacheFromDB(cacheKey) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `UPDATE ai_cache
          SET hits = hits + 1
        WHERE cache_key = $1 AND expires_at > NOW()
        RETURNING answer`,
      [cacheKey]
    );
    return rows[0]?.answer || null;
  } catch (err) {
    console.warn('getCacheFromDB error:', err.message);
    return null;
  }
}

/**
 * Upsert a cached answer into DB with a TTL.
 * @param {string} cacheKey
 * @param {string} answer
 * @param {string} language
 * @param {number} ttlSeconds  (default 7 days)
 */
async function setCacheInDB(cacheKey, answer, language = 'ur', ttlSeconds = 604800) {
  if (!pool || !answer) return;
  try {
    await pool.query(
      `INSERT INTO ai_cache (cache_key, answer, language, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 second'))
       ON CONFLICT (cache_key) DO UPDATE
         SET answer     = EXCLUDED.answer,
             language   = EXCLUDED.language,
             expires_at = EXCLUDED.expires_at,
             hits       = ai_cache.hits`,
      [cacheKey, answer, language, ttlSeconds]
    );
  } catch (err) {
    console.warn('setCacheInDB error:', err.message);
  }
}

/**
 * Delete expired entries and optionally flush all.
 */
async function flushCacheDB(all = false) {
  if (!pool) return 0;
  try {
    const q = all
      ? 'DELETE FROM ai_cache'
      : 'DELETE FROM ai_cache WHERE expires_at <= NOW()';
    const { rowCount } = await pool.query(q);
    return rowCount;
  } catch (err) {
    console.warn('flushCacheDB error:', err.message);
    return 0;
  }
}

/**
 * Cache stats for admin panel.
 */
async function getCacheStats() {
  if (!pool) return { entries: 0, totalHits: 0, topQuestions: [] };
  try {
    const [countRes, hitsRes, topRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as c FROM ai_cache WHERE expires_at > NOW()`),
      pool.query(`SELECT COALESCE(SUM(hits), 0) as h FROM ai_cache`),
      pool.query(
        `SELECT cache_key, hits FROM ai_cache
          WHERE expires_at > NOW()
          ORDER BY hits DESC LIMIT 5`
      )
    ]);
    return {
      entries:      parseInt(countRes.rows[0]?.c || 0, 10),
      totalHits:    parseInt(hitsRes.rows[0]?.h  || 0, 10),
      topQuestions: topRes.rows
    };
  } catch (err) {
    return { entries: 0, totalHits: 0, topQuestions: [] };
  }
}

// ─── Admin Audit Logs ─────────────────────────────────────────────────────────
async function ensureAuditTables() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id          BIGSERIAL PRIMARY KEY,
        admin_id    TEXT NOT NULL DEFAULT 'admin',
        action_type TEXT NOT NULL,
        target      TEXT,
        payload     JSONB,
        ip_address  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON admin_audit_logs(created_at DESC);

      CREATE TABLE IF NOT EXISTS ai_usage_stats (
        id           BIGSERIAL PRIMARY KEY,
        endpoint     TEXT NOT NULL,
        tokens_in    INTEGER DEFAULT 0,
        tokens_out   INTEGER DEFAULT 0,
        cache_tokens INTEGER DEFAULT 0,
        cost_usd     NUMERIC(10,6) DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage_stats(created_at DESC);

      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id               BIGSERIAL PRIMARY KEY,
        title            TEXT NOT NULL,
        body             TEXT NOT NULL,
        severity         TEXT NOT NULL DEFAULT 'INFO',
        target_districts TEXT[],
        active           BOOLEAN DEFAULT TRUE,
        created_by       TEXT DEFAULT 'admin',
        expires_at       TIMESTAMPTZ,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Audit/AI-usage/Emergency tables ready');
  } catch (err) {
    console.error('❌ ensureAuditTables error:', err.message);
  }
}

async function logAuditAction({ adminId = 'admin', actionType, target = null, payload = null, ip = null }) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, action_type, target, payload, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, actionType, target, payload ? JSON.stringify(payload) : null, ip]
    );
  } catch (err) { console.warn('logAuditAction error:', err.message); }
}

async function getAuditLogs({ page = 1, limit = 30 } = {}) {
  if (!pool) return { logs: [], total: 0 };
  const offset = (page - 1) * limit;
  try {
    const [{ rows }, { rows: cr }] = await Promise.all([
      pool.query(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      pool.query(`SELECT COUNT(*) as c FROM admin_audit_logs`)
    ]);
    return { logs: rows, total: parseInt(cr[0]?.c || 0, 10) };
  } catch (err) { return { logs: [], total: 0 }; }
}

async function logAIUsage({ endpoint, tokensIn = 0, tokensOut = 0, cacheTokens = 0 }) {
  if (!pool) return;
  // Claude Sonnet 4.x pricing (USD per million tokens)
  const costIn    = (tokensIn    / 1_000_000) * 3.00;
  const costOut   = (tokensOut   / 1_000_000) * 15.00;
  const costCache = (cacheTokens / 1_000_000) * 0.30;
  const costUsd   = parseFloat((costIn + costOut + costCache).toFixed(6));
  try {
    await pool.query(
      `INSERT INTO ai_usage_stats (endpoint, tokens_in, tokens_out, cache_tokens, cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      [endpoint, tokensIn, tokensOut, cacheTokens, costUsd]
    );
  } catch (err) { console.warn('logAIUsage error:', err.message); }
}

async function getAIUsage() {
  if (!pool) return { today: null, month: null, allTime: null, recent: [] };
  try {
    const [todayRes, monthRes, allTimeRes, recentRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats WHERE created_at >= NOW() - INTERVAL '24 hours'`),
      pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats WHERE created_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats`),
      pool.query(`SELECT endpoint, tokens_in, tokens_out, cache_tokens, cost_usd, created_at FROM ai_usage_stats ORDER BY created_at DESC LIMIT 20`)
    ]);
    const fmt = (r) => ({ tokensIn: parseInt(r.tin), tokensOut: parseInt(r.tout), cacheTokens: parseInt(r.tc), costUsd: parseFloat(parseFloat(r.cost).toFixed(4)), calls: parseInt(r.calls) });
    return { today: fmt(todayRes.rows[0]), month: fmt(monthRes.rows[0]), allTime: fmt(allTimeRes.rows[0]), recent: recentRes.rows };
  } catch (err) { console.warn('getAIUsage error:', err.message); return { today: null, month: null, allTime: null, recent: [] }; }
}

async function createEmergencyAlert({ title, body, severity = 'INFO', targetDistricts = [], expiresAt = null, createdBy = 'admin' }) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO emergency_alerts (title, body, severity, target_districts, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, body, severity, targetDistricts, expiresAt, createdBy]
    );
    return rows[0];
  } catch (err) { console.warn('createEmergencyAlert error:', err.message); return null; }
}

async function getEmergencyAlerts({ activeOnly = false } = {}) {
  if (!pool) return [];
  try {
    const where = activeOnly ? `WHERE active = true AND (expires_at IS NULL OR expires_at > NOW())` : '';
    const { rows } = await pool.query(`SELECT * FROM emergency_alerts ${where} ORDER BY created_at DESC LIMIT 50`);
    return rows;
  } catch (err) { return []; }
}

async function deleteEmergencyAlert(id) {
  if (!pool) return false;
  try { await pool.query(`DELETE FROM emergency_alerts WHERE id=$1`, [id]); return true; } catch { return false; }
}

async function updateEmergencyAlertStatus(id, active) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `UPDATE emergency_alerts SET active=$1 WHERE id=$2 RETURNING *`,
      [!!active, id]
    );
    return rows[0] || null;
  } catch (err) { console.warn('updateEmergencyAlertStatus error:', err.message); return null; }
}

async function exportAllData() {
  if (!pool) return { users: [], prices: [], chatLogs: [], emergencyAlerts: [], exportedAt: new Date().toISOString() };
  try {
    const [usersRes, pricesRes, logsRes, alertsRes] = await Promise.all([
      pool.query(`SELECT id,name,phone,district,land_size,created_at,is_guest FROM users ORDER BY created_at DESC`),
      pool.query(`SELECT * FROM mandi_prices ORDER BY updated_at DESC`),
      pool.query(`SELECT id,user_name,user_phone,question,language,created_at FROM chat_logs ORDER BY created_at DESC LIMIT 5000`),
      pool.query(`SELECT * FROM emergency_alerts ORDER BY created_at DESC`)
    ]);
    return { users: usersRes.rows, prices: pricesRes.rows, chatLogs: logsRes.rows, emergencyAlerts: alertsRes.rows, exportedAt: new Date().toISOString() };
  } catch (err) { console.warn('exportAllData error:', err.message); return {}; }
}

async function purgeChatLogs(days = 90) {
  if (!pool) return 0;
  try {
    const { rowCount } = await pool.query(`DELETE FROM chat_logs WHERE created_at < NOW() - ($1 * INTERVAL '1 day')`, [days]);
    return rowCount || 0;
  } catch (err) { console.warn('purgeChatLogs error:', err.message); return 0; }
}

module.exports = {
  pool, initDB, testConnection,
  findUserByPhone, createUser, getAllUsers,
  deleteUser, isUsingPersistentDB,
  setPriceDB, getPricesDB, deletePriceDB,
  saveChatLog, getChatLogs, getUserChatHistory,
  getCacheFromDB, setCacheInDB,
  logAIUsage, getAIUsage, getAIUsageStats: getAIUsage,
  createEmergencyAlert, getEmergencyAlerts, updateEmergencyAlertStatus, deleteEmergencyAlert,
  exportAllData, purgeChatLogs
};
