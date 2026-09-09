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
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20,
    statement_timeout: 10000
  });
  pool.on('error', (err) => console.error('PG pool error:', err.message));
  console.log('✅ PostgreSQL pool created from DATABASE_URL with timeout limits');
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
        district    TEXT,
        question    TEXT NOT NULL,
        answer      TEXT,
        language    TEXT DEFAULT 'ur',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS district TEXT;
      CREATE INDEX IF NOT EXISTS chat_logs_created_idx ON chat_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS chat_logs_user_idx    ON chat_logs(user_id);
      CREATE INDEX IF NOT EXISTS chat_logs_district_idx ON chat_logs(district);

      CREATE TABLE IF NOT EXISTS ai_cache (
        cache_key   TEXT PRIMARY KEY,
        answer      TEXT NOT NULL,
        language    TEXT DEFAULT 'ur',
        hits        INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        expires_at  TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ur';
      ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS hits INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON ai_cache(expires_at);

      CREATE TABLE IF NOT EXISTS farmer_profiles (
        user_id    TEXT PRIMARY KEY,
        crops      JSONB DEFAULT '[]'::jsonb,
        livestock  JSONB DEFAULT '[]'::jsonb,
        spray_log  JSONB DEFAULT '[]'::jsonb,
        soil       JSONB DEFAULT '{}'::jsonb,
        notes      TEXT DEFAULT '',
        tehsil     TEXT,
        water_source TEXT,
        warabandi_day TEXT,
        irrigation_method TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS tehsil TEXT;
      ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS water_source TEXT;
      ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS warabandi_day TEXT;
      ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS irrigation_method TEXT;
    `);
    console.log('✅ PostgreSQL tables ready (users + mandi_prices + chat_logs + ai_cache + farmer_profiles)');
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
  if (!phone) return null;
  let p1 = phone;
  let p2 = phone;
  if (phone.startsWith('0') && phone.length === 11) {
    p2 = '+92' + phone.slice(1);
  } else if (phone.startsWith('+92') && phone.length === 13) {
    p2 = '0' + phone.slice(3);
  } else if (phone.startsWith('92') && phone.length === 12) {
    p2 = '0' + phone.slice(2);
  }

  if (pool) {
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1 OR phone=$2 LIMIT 1', [p1, p2]);
      return rows[0] || null;
    } catch (err) {
      console.warn('Postgres findUserByPhone failed, falling back:', err.message);
    }
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').or(`phone.eq.${p1},phone.eq.${p2}`).limit(1).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase findUserByPhone error:', e.message);
    }
  }
  const all = getMemUsers();
  return all.find(u => u.phone === p1 || u.phone === p2) || null;
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
async function saveChatLog({ userId, userName, userPhone, district, question, answer, language }) {
  // Always save to memory so admin can see questions even without DB
  addMemChatLog({ userId, userName, userPhone, district, question, answer, language });
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO chat_logs (user_id, user_name, user_phone, district, question, answer, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, userName || null, userPhone || null,
       district || null, question, answer || null, language || 'ur']
    );
  } catch (err) {
    // If district column does not exist yet on legacy DB, fallback to 6 params
    try {
      await pool.query(
        `INSERT INTO chat_logs (user_id, user_name, user_phone, question, answer, language)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId || null, userName || null, userPhone || null,
         question, answer || null, language || 'ur']
      );
    } catch (fallbackErr) {
      console.warn('saveChatLog error:', fallbackErr.message);
    }
  }
}

/**
 * Get paginated chat logs for admin panel.
 * Joins with users table to provide district for both new and historical logs.
 */
async function getChatLogs({ page = 1, limit = 20, search = '' } = {}) {
  if (!pool) return getMemChatLogs({ page, limit, search });
  const offset = (page - 1) * limit;

  const where = search
    ? `WHERE cl.question ILIKE $3 OR cl.user_name ILIKE $3 OR cl.user_phone ILIKE $3 OR COALESCE(cl.district, u.district) ILIKE $3`
    : '';
  const params = search ? [limit, offset, `%${search}%`] : [limit, offset];
  const countWhere = search
    ? `WHERE cl.question ILIKE $1 OR cl.user_name ILIKE $1 OR cl.user_phone ILIKE $1 OR COALESCE(cl.district, u.district) ILIKE $1`
    : '';
  const countParams = search ? [`%${search}%`] : [];

  try {
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT cl.id, cl.user_id, cl.user_name, cl.user_phone,
                COALESCE(cl.district, u.district) AS district,
                cl.question, cl.language, cl.created_at
         FROM chat_logs cl
         LEFT JOIN users u ON (cl.user_id = u.id OR (cl.user_phone IS NOT NULL AND cl.user_phone = u.phone))
         ${where}
         ORDER BY cl.created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as c
         FROM chat_logs cl
         LEFT JOIN users u ON (cl.user_id = u.id OR (cl.user_phone IS NOT NULL AND cl.user_phone = u.phone))
         ${countWhere}`,
        countParams
      )
    ]);

    return { logs: rows, total: parseInt(countRows[0]?.c || 0, 10) };
  } catch (err) {
    console.warn('getChatLogs join query error, falling back to direct table:', err.message);
    const fallbackWhere = search ? `WHERE question ILIKE $3 OR user_name ILIKE $3` : '';
    const fallbackCountWhere = search ? `WHERE question ILIKE $1 OR user_name ILIKE $1` : '';
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT id, user_id, user_name, user_phone, question, language, created_at
         FROM chat_logs ${fallbackWhere}
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as c FROM chat_logs ${fallbackCountWhere}`,
        countParams
      )
    ]);
    return { logs: rows, total: parseInt(countRows[0]?.c || 0, 10) };
  }
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
    const sec = parseInt(ttlSeconds || '604800', 10);
    await pool.query(
      `INSERT INTO ai_cache (cache_key, answer, language, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::INTERVAL)
       ON CONFLICT (cache_key) DO UPDATE
         SET answer     = EXCLUDED.answer,
             language   = EXCLUDED.language,
             expires_at = EXCLUDED.expires_at,
             hits       = ai_cache.hits`,
      [cacheKey, answer, language, String(sec)]
    );
  } catch (err) {
    console.warn('setCacheInDB error:', err.message);
  }
}

/**
 * Fetch unexpired cache entries to warm in-memory cache on startup.
 */
async function getUnexpiredCacheEntries(limit = 100) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT cache_key, answer, language, hits, expires_at
       FROM ai_cache
       WHERE expires_at > NOW()
       ORDER BY hits DESC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.warn('getUnexpiredCacheEntries error:', err.message);
    return [];
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
        provider     TEXT NOT NULL DEFAULT 'claude',
        model        TEXT,
        tokens_in    INTEGER DEFAULT 0,
        tokens_out   INTEGER DEFAULT 0,
        cache_tokens INTEGER DEFAULT 0,
        cost_usd     NUMERIC(10,6) DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage_stats(created_at DESC);
      ALTER TABLE ai_usage_stats ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'claude';
      ALTER TABLE ai_usage_stats ADD COLUMN IF NOT EXISTS model TEXT;

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

      CREATE TABLE IF NOT EXISTS government_schemes (
        id             TEXT PRIMARY KEY,
        title_ur       TEXT NOT NULL,
        title_en       TEXT,
        icon           TEXT DEFAULT '📋',
        category       TEXT,
        subsidy_amount TEXT,
        loan_limit     TEXT,
        deadline       TEXT,
        sms_code       TEXT,
        portal_url     TEXT,
        eligibility_ur TEXT,
        description_ur TEXT,
        benefits       JSONB,
        active         BOOLEAN DEFAULT TRUE,
        updated_at     TIMESTAMPTZ DEFAULT NOW()
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

// ─── AI Usage In-Memory Ring Buffer (Fallback when Postgres is not provisioned) ──
const memAIUsage = [];

async function logAIUsage({ endpoint, provider = 'claude', model = null, tokensIn = 0, tokensOut = 0, cacheTokens = 0 }) {
  const isGemini = provider === 'gemini' || (endpoint && endpoint.includes('gemini'));
  const actualProvider = isGemini ? 'gemini' : 'claude';
  const actualModel = model || (isGemini ? 'gemini-flash' : 'claude-sonnet-4-5');

  let costUsd = 0;
  if (isGemini) {
    // Gemini 2.0 / 3.6 Flash pricing: $0.10 / M in, $0.40 / M out
    const costIn  = (tokensIn  / 1_000_000) * 0.10;
    const costOut = (tokensOut / 1_000_000) * 0.40;
    costUsd = parseFloat((costIn + costOut).toFixed(6));
  } else {
    // Claude Sonnet 4.x pricing: $3.00 / M in, $15.00 / M out, $0.30 / M cache
    const costIn    = (tokensIn    / 1_000_000) * 3.00;
    const costOut   = (tokensOut   / 1_000_000) * 15.00;
    const costCache = (cacheTokens / 1_000_000) * 0.30;
    costUsd = parseFloat((costIn + costOut + costCache).toFixed(6));
  }

  // Always buffer in memory
  const entry = {
    id: Date.now() + Math.random(),
    endpoint,
    provider: actualProvider,
    model: actualModel,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cache_tokens: cacheTokens,
    cost_usd: costUsd,
    created_at: new Date().toISOString()
  };
  memAIUsage.unshift(entry);
  if (memAIUsage.length > 500) memAIUsage.pop();

  // If Postgres pool available, persist to DB
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO ai_usage_stats (endpoint, provider, model, tokens_in, tokens_out, cache_tokens, cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [endpoint, actualProvider, actualModel, tokensIn, tokensOut, cacheTokens, costUsd]
      );
    } catch (err) {
      console.warn('logAIUsage Postgres insert warning:', err.message);
    }
  }
}

async function getAIUsage() {
  // Helper to aggregate memory usage
  const aggregateMem = (sinceMs) => {
    const items = sinceMs ? memAIUsage.filter(m => new Date(m.created_at).getTime() >= sinceMs) : memAIUsage;
    let tin = 0, tout = 0, tc = 0, cost = 0;
    items.forEach(i => {
      tin += Number(i.tokens_in || 0);
      tout += Number(i.tokens_out || 0);
      tc += Number(i.cache_tokens || 0);
      cost += Number(i.cost_usd || 0);
    });
    return { tokensIn: tin, tokensOut: tout, cacheTokens: tc, costUsd: parseFloat(cost.toFixed(4)), calls: items.length };
  };

  const getProviderMem = (prov) => {
    const items = memAIUsage.filter(m => m.provider === prov);
    let tin = 0, tout = 0, tc = 0, cost = 0;
    items.forEach(i => {
      tin += Number(i.tokens_in || 0);
      tout += Number(i.tokens_out || 0);
      tc += Number(i.cache_tokens || 0);
      cost += Number(i.cost_usd || 0);
    });
    return { tokensIn: tin, tokensOut: tout, cacheTokens: tc, costUsd: parseFloat(cost.toFixed(4)), calls: items.length };
  };

  if (pool) {
    try {
      const now = Date.now();
      const [todayRes, monthRes, allTimeRes, recentRes, providerRes] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats WHERE created_at >= NOW() - INTERVAL '30 days'`),
        pool.query(`SELECT COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats`),
        pool.query(`SELECT endpoint, COALESCE(provider, 'claude') as provider, model, tokens_in, tokens_out, cache_tokens, cost_usd, created_at FROM ai_usage_stats ORDER BY created_at DESC LIMIT 30`),
        pool.query(`SELECT COALESCE(provider, 'claude') as provider, COALESCE(SUM(tokens_in),0) as tin, COALESCE(SUM(tokens_out),0) as tout, COALESCE(SUM(cache_tokens),0) as tc, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as calls FROM ai_usage_stats GROUP BY provider`)
      ]);

      const fmt = (r) => ({
        tokensIn: parseInt(r?.tin || 0),
        tokensOut: parseInt(r?.tout || 0),
        cacheTokens: parseInt(r?.tc || 0),
        costUsd: parseFloat(parseFloat(r?.cost || 0).toFixed(4)),
        calls: parseInt(r?.calls || 0)
      });

      const provMap = {};
      (providerRes.rows || []).forEach(r => {
        provMap[r.provider] = fmt(r);
      });

      return {
        today: fmt(todayRes.rows[0]),
        month: fmt(monthRes.rows[0]),
        allTime: fmt(allTimeRes.rows[0]),
        gemini: provMap['gemini'] || { tokensIn: 0, tokensOut: 0, cacheTokens: 0, costUsd: 0, calls: 0 },
        claude: provMap['claude'] || { tokensIn: 0, tokensOut: 0, cacheTokens: 0, costUsd: 0, calls: 0 },
        recent: recentRes.rows
      };
    } catch (err) {
      console.warn('getAIUsage DB query failed, using memory fallback:', err.message);
    }
  }

  // In-memory fallback (active if Postgres not set up or table empty)
  const now = Date.now();
  return {
    today: aggregateMem(now - 24 * 3600 * 1000),
    month: aggregateMem(now - 30 * 24 * 3600 * 1000),
    allTime: aggregateMem(null),
    gemini: getProviderMem('gemini'),
    claude: getProviderMem('claude'),
    recent: memAIUsage.slice(0, 30)
  };
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
      pool.query(`SELECT cl.id, cl.user_name, cl.user_phone, COALESCE(cl.district, u.district) AS district, cl.question, cl.language, cl.created_at FROM chat_logs cl LEFT JOIN users u ON (cl.user_id = u.id OR (cl.user_phone IS NOT NULL AND cl.user_phone = u.phone)) ORDER BY cl.created_at DESC LIMIT 5000`),
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

// ─── Government Schemes DB Storage ──────────────────────────────────────────
let memSchemes = [];

async function getSchemes() {
  if (!pool) return memSchemes;
  try {
    const { rows } = await pool.query(`SELECT * FROM government_schemes ORDER BY updated_at DESC`);
    return rows.length > 0 ? rows : memSchemes;
  } catch (err) {
    return memSchemes;
  }
}

async function saveScheme(scheme) {
  if (!scheme || !scheme.title_ur) return null;
  const id = scheme.id || `scheme-${Date.now()}`;
  const record = {
    ...scheme,
    id,
    active: scheme.active !== false,
    benefits: scheme.benefits || [],
    updated_at: new Date().toISOString()
  };

  const idx = memSchemes.findIndex(s => s.id === id);
  if (idx >= 0) memSchemes[idx] = record;
  else memSchemes.unshift(record);

  if (!pool) return record;
  try {
    await pool.query(`
      INSERT INTO government_schemes (id, title_ur, title_en, icon, category, subsidy_amount, loan_limit, deadline, sms_code, portal_url, eligibility_ur, description_ur, benefits, active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title_ur = EXCLUDED.title_ur,
        title_en = EXCLUDED.title_en,
        icon = EXCLUDED.icon,
        category = EXCLUDED.category,
        subsidy_amount = EXCLUDED.subsidy_amount,
        loan_limit = EXCLUDED.loan_limit,
        deadline = EXCLUDED.deadline,
        sms_code = EXCLUDED.sms_code,
        portal_url = EXCLUDED.portal_url,
        eligibility_ur = EXCLUDED.eligibility_ur,
        description_ur = EXCLUDED.description_ur,
        benefits = EXCLUDED.benefits,
        active = EXCLUDED.active,
        updated_at = NOW()
    `, [
      record.id, record.title_ur, record.title_en || '', record.icon || '📋',
      record.category || '', record.subsidy_amount || '', record.loan_limit || '',
      record.deadline || '', record.sms_code || '', record.portal_url || '',
      record.eligibility_ur || '', record.description_ur || '',
      JSON.stringify(record.benefits || []), record.active
    ]);
    return record;
  } catch (err) {
    console.warn('saveScheme DB error:', err.message);
    return record;
  }
}

async function deleteScheme(id) {
  memSchemes = memSchemes.filter(s => s.id !== id);
  if (!pool) return true;
  try {
    await pool.query(`DELETE FROM government_schemes WHERE id = $1`, [id]);
    return true;
  } catch {
    return false;
  }
}

// ─── Farmer Profile (My Farm / میرا فارم) ──────────────────────────────────

/**
 * Get farmer profile by user ID. Returns null if no profile exists.
 */
async function getFarmerProfile(userId) {
  if (!userId) return null;
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM farmer_profiles WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    console.warn('getFarmerProfile error:', err.message);
    return null;
  }
}

/**
 * Upsert farmer profile. Merges JSONB arrays intelligently.
 * @param {string} userId
 * @param {object} data - { crops?, livestock?, spray_log?, soil?, notes? }
 */
async function upsertFarmerProfile(userId, data) {
  if (!userId || !data) return null;
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO farmer_profiles (user_id, crops, livestock, spray_log, soil, notes, tehsil, water_source, warabandi_day, irrigation_method, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         crops              = COALESCE($2::jsonb, farmer_profiles.crops),
         livestock          = COALESCE($3::jsonb, farmer_profiles.livestock),
         spray_log          = COALESCE($4::jsonb, farmer_profiles.spray_log),
         soil               = COALESCE($5::jsonb, farmer_profiles.soil),
         notes              = COALESCE($6, farmer_profiles.notes),
         tehsil             = COALESCE($7, farmer_profiles.tehsil),
         water_source       = COALESCE($8, farmer_profiles.water_source),
         warabandi_day      = COALESCE($9, farmer_profiles.warabandi_day),
         irrigation_method  = COALESCE($10, farmer_profiles.irrigation_method),
         updated_at         = NOW()
       RETURNING *`,
      [
        userId,
        JSON.stringify(data.crops || []),
        JSON.stringify(data.livestock || []),
        JSON.stringify(data.spray_log || []),
        JSON.stringify(data.soil || {}),
        data.notes || '',
        data.tehsil || null,
        data.water_source || null,
        data.warabandi_day || null,
        data.irrigation_method || null
      ]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('❌ upsertFarmerProfile error:', err.message);
    return null;
  }
}

/**
 * Clear/delete farmer profile (privacy: "خالی کریں").
 */
async function clearFarmerProfile(userId) {
  if (!userId) return false;
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM farmer_profiles WHERE user_id = $1', [userId]);
    return true;
  } catch (err) {
    console.warn('clearFarmerProfile error:', err.message);
    return false;
  }
}

/**
 * Build a concise Urdu context summary from farmer profile for AI prompt injection.
 * Returns empty string if profile is null/empty (zero overhead).
 */
function buildFarmerContext(profile) {
  if (!profile) return '';
  const parts = [];

  // Tehsil / Sub-district
  if (profile.tehsil) {
    parts.push('تحصیل: ' + profile.tehsil);
  }

  // Water & Irrigation
  const waterParts = [];
  if (profile.water_source) waterParts.push('ذریعہ: ' + profile.water_source);
  if (profile.warabandi_day && profile.warabandi_day !== 'وارابندی نہیں') waterParts.push('وارابندی: ' + profile.warabandi_day);
  if (profile.irrigation_method) waterParts.push('طریقہ: ' + profile.irrigation_method);
  if (waterParts.length > 0) {
    parts.push('آبپاشی (' + waterParts.join(' | ') + ')');
  }

  // Crops
  const crops = profile.crops;
  if (Array.isArray(crops) && crops.length > 0) {
    const cropTexts = crops.slice(0, 3).map(c => {
      let t = c.name || '';
      if (c.acres) t += ` ${c.acres} ایکڑ`;
      if (c.variety) t += ` (${c.variety})`;
      return t;
    }).filter(Boolean);
    if (cropTexts.length) parts.push('فصلیں: ' + cropTexts.join('، '));
  }

  // Livestock
  const livestock = profile.livestock;
  if (Array.isArray(livestock) && livestock.length > 0) {
    const lvTexts = livestock.slice(0, 3).map(l => {
      let t = '';
      if (l.count) t += l.count + ' ';
      t += l.type || '';
      if (l.breed) t += ` ${l.breed}`;
      if (l.milk_liters) t += ` (${l.milk_liters} لیٹر دودھ)`;
      return t.trim();
    }).filter(Boolean);
    if (lvTexts.length) parts.push('مویشی: ' + lvTexts.join('، '));
  }

  // Soil
  const soil = profile.soil;
  if (soil && typeof soil === 'object' && Object.keys(soil).length > 0) {
    const soilParts = [];
    if (soil.ph) soilParts.push('pH ' + soil.ph);
    if (soil.ec) soilParts.push('EC ' + soil.ec);
    if (soil.om) soilParts.push('OM ' + soil.om + '%');
    if (soilParts.length) parts.push('مٹی: ' + soilParts.join('، '));
  }

  if (parts.length === 0) return '';
  return '\n🗂️ کسان پروفائل (میرا فارم): ' + parts.join(' | ');
}

module.exports = {
  pool, initDB, testConnection,
  findUserByPhone, createUser, getAllUsers,
  getTotalUserCount, getNewTodayCount, getRecentUsers,
  deleteUser, isUsingPersistentDB,
  setPriceDB, getPricesDB, deletePriceDB,
  saveChatLog, getChatLogs, getUserChatHistory,
  getCacheFromDB, setCacheInDB, flushCacheDB, getCacheStats, getUnexpiredCacheEntries,
  logAuditAction, getAuditLogs,
  logAIUsage, getAIUsage, getAIUsageStats: getAIUsage,
  createEmergencyAlert, getEmergencyAlerts, updateEmergencyAlertStatus, deleteEmergencyAlert,
  exportAllData, purgeChatLogs,
  getSchemes, saveScheme, deleteScheme,
  getFarmerProfile, upsertFarmerProfile, clearFarmerProfile, buildFarmerContext
};

