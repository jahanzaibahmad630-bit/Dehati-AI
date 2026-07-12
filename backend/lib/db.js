/**
 * lib/db.js — Persistent database layer
 *
 * Priority:
 *  1. Railway PostgreSQL  (DATABASE_URL auto-set when you add Postgres plugin)
 *  2. Supabase            (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *  3. In-memory fallback  (data lost on restart — dev only)
 */

const { Pool } = require('pg');
const { memUsers, addMemUser, getMemUsers, getRecentRegistrations } = require('./memStore');

let pool = null;

// ─── Try PostgreSQL (Railway DATABASE_URL) ────────────────────────────────────
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
  });
  console.log('✅ PostgreSQL connected via DATABASE_URL');
} else {
  console.warn('⚠️  DATABASE_URL not set — user data stored in memory (lost on restart)');
}

// ─── Auto-create tables on first run ──────────────────────────────────────────
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name        TEXT NOT NULL,
        phone       TEXT UNIQUE NOT NULL,
        district    TEXT,
        land_size   NUMERIC,
        password_hash TEXT NOT NULL,
        is_guest    BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
      CREATE INDEX IF NOT EXISTS users_created_idx ON users(created_at DESC);
    `);
    console.log('✅ DB tables ready');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}

// ─── User operations ─────────────────────────────────────────────────────────

async function findUserByPhone(phone) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1 LIMIT 1', [phone]);
    return rows[0] || null;
  }
  // Supabase fallback
  const { supabase } = require('./supabase');
  if (supabase) {
    const { data } = await supabase.from('users').select('*').eq('phone', phone).single();
    return data || null;
  }
  // In-memory
  return memUsers.get(phone) || null;
}

async function createUser(user) {
  // user = { id, name, phone, district, land_size, password_hash, is_guest, created_at }
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, phone, district, land_size, password_hash, is_guest, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (phone) DO NOTHING
       RETURNING *`,
      [user.id, user.name, user.phone, user.district, user.land_size,
       user.password_hash, user.is_guest || false, user.created_at || new Date()]
    );
    return rows[0] || null;
  }
  // Supabase fallback
  const { supabase } = require('./supabase');
  if (supabase) {
    const { data, error } = await supabase.from('users').insert([user]).select().single();
    if (!error) return data;
  }
  // In-memory fallback
  addMemUser(user);
  return user;
}

async function getAllUsers({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;

  if (pool) {
    let q, params;
    if (search) {
      q = `SELECT id,name,phone,district,land_size,created_at,is_guest
           FROM users WHERE name ILIKE $1 OR phone ILIKE $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params = [`%${search}%`, limit, offset];
    } else {
      q = `SELECT id,name,phone,district,land_size,created_at,is_guest
           FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params = [limit, offset];
    }
    const { rows } = await pool.query(q, params);
    const countQ = search
      ? `SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR phone ILIKE $1`
      : `SELECT COUNT(*) FROM users`;
    const { rows: cr } = await pool.query(countQ, search ? [`%${search}%`] : []);
    return { users: rows, total: parseInt(cr[0].count, 10) };
  }

  // Supabase fallback
  const { supabase } = require('./supabase');
  if (supabase) {
    let q = supabase.from('users')
      .select('id,name,phone,district,land_size,created_at,is_guest', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, count } = await q;
    return { users: data || [], total: count || 0 };
  }

  // In-memory
  const all = getMemUsers();
  return { users: all.slice(offset, offset + limit), total: all.length };
}

async function getTotalUserCount() {
  if (pool) {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count, 10);
  }
  const { supabase } = require('./supabase');
  if (supabase) {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    return count || 0;
  }
  return getMemUsers().length;
}

async function getNewTodayCount() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (pool) {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users WHERE created_at>=$1', [since]);
    return parseInt(rows[0].count, 10);
  }
  const { supabase } = require('./supabase');
  if (supabase) {
    const { count } = await supabase.from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    return count || 0;
  }
  return getMemUsers().filter(u => new Date(u.created_at) >= since).length;
}

async function getRecentUsers(limit = 20) {
  if (pool) {
    const { rows } = await pool.query(
      'SELECT id,name,phone,district,land_size,created_at,is_guest FROM users ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows;
  }
  const { supabase } = require('./supabase');
  if (supabase) {
    const { data } = await supabase.from('users')
      .select('id,name,phone,district,land_size,created_at,is_guest')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
  return getRecentRegistrations(limit);
}

async function deleteUser(id) {
  if (pool) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    return true;
  }
  const { supabase } = require('./supabase');
  if (supabase) {
    await supabase.from('users').delete().eq('id', id);
    return true;
  }
  return false;
}

function isUsingPersistentDB() {
  return !!pool || !!(require('./supabase').supabase);
}

module.exports = {
  pool,
  initDB,
  findUserByPhone,
  createUser,
  getAllUsers,
  getTotalUserCount,
  getNewTodayCount,
  getRecentUsers,
  deleteUser,
  isUsingPersistentDB
};
