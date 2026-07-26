/**
 * AI Response Cache — 2-Tier: Memory (L1) + PostgreSQL (L2)
 *
 * L1 Memory  : instant (~0ms), resets on server restart
 * L2 Postgres : persistent (~2ms), survives restarts forever
 *
 * Flow on GET:
 *   1. Check L1 (memory map)  → HIT: return immediately
 *   2. Check L2 (PostgreSQL)  → HIT: populate L1, return
 *   3. MISS: caller must call Claude, then call set()
 *
 * Flow on SET:
 *   1. Write to L1 (memory)
 *   2. Write to L2 (PostgreSQL) — async, non-blocking
 *
 * Config (env vars):
 *   AI_CACHE_MAX   — max L1 entries  (default: 500)
 *   AI_CACHE_TTL   — TTL in seconds  (default: 604800 = 7 days)
 *   AI_CACHE_OFF   — set "true" to disable entirely
 */

const db = require('./db');

const MAX_L1  = parseInt(process.env.AI_CACHE_MAX || '500',    10);
const TTL_SEC = parseInt(process.env.AI_CACHE_TTL || '604800', 10); // 7 days default
const TTL_MS  = TTL_SEC * 1000;
const DISABLED = process.env.AI_CACHE_OFF === 'true';

// ── L1: In-memory map ────────────────────────────────────────────────────────
// Map<key, { value, expiresAt }>
const l1 = new Map();

// Stats counters
let l1Hits = 0, l2Hits = 0, misses = 0, sets = 0;

// ── Key normalization ────────────────────────────────────────────────────────
function normalizeKey(text, language = 'ur') {
  return (language + ':' + text)
    .toLowerCase()
    .replace(/[؟?!.,،;:\-]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim()
    .slice(0, 512);                  // cap key length
}

// ── L1 helpers ───────────────────────────────────────────────────────────────
function l1Get(key) {
  const entry = l1.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { l1.delete(key); return null; }
  // Re-insert key on hit to update insertion order (true LRU eviction)
  l1.delete(key);
  l1.set(key, entry);
  return entry.value;
}

function l1Set(key, value) {
  // Evict oldest if at capacity
  if (l1.size >= MAX_L1) {
    const oldest = l1.keys().next().value;
    l1.delete(oldest);
  }
  l1.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ── Public: get ──────────────────────────────────────────────────────────────
/**
 * Get a cached answer. Checks L1 first, then L2 (DB).
 * @param {string} question
 * @param {string} language
 * @returns {Promise<string|null>}
 */
async function get(question, language = 'ur') {
  if (DISABLED) return null;

  const key = normalizeKey(question, language);

  // L1: memory
  const mem = l1Get(key);
  if (mem) { l1Hits++; return mem; }

  // L2: PostgreSQL
  try {
    const dbAnswer = await db.getCacheFromDB(key);
    if (dbAnswer) {
      l1Set(key, dbAnswer); // warm L1
      l2Hits++;
      return dbAnswer;
    }
  } catch {
    // DB unavailable — fall through to Claude
  }

  misses++;
  return null;
}

// ── Public: set ──────────────────────────────────────────────────────────────
/**
 * Store an answer in both cache tiers.
 * @param {string} question
 * @param {string} language
 * @param {string} answer
 */
function set(question, language = 'ur', answer) {
  if (DISABLED || !answer) return;

  const key = normalizeKey(question, language);

  // L1 — synchronous
  l1Set(key, answer);

  // L2 — async, non-blocking (never crashes main flow)
  db.setCacheInDB(key, answer, language, TTL_SEC).catch(() => {});

  sets++;
}

// ── Public: flush ─────────────────────────────────────────────────────────────
/**
 * Flush both tiers.
 * @param {boolean} all  — true = clear everything; false = only expired
 */
async function flush(all = true) {
  l1.clear();
  l1Hits = l2Hits = misses = sets = 0;
  try {
    return await db.flushCacheDB(all);
  } catch {
    return 0;
  }
}

// ── Public: stats ─────────────────────────────────────────────────────────────
/**
 * Stats for admin dashboard.
 */
async function stats() {
  let dbStats = { entries: 0, totalHits: 0 };
  try { dbStats = await db.getCacheStats(); } catch {}

  const total = l1Hits + l2Hits + misses;
  const hitRate = total > 0
    ? (((l1Hits + l2Hits) / total) * 100).toFixed(1) + '%'
    : '0%';

  return {
    l1Entries:   l1.size,
    l2Entries:   dbStats.entries,
    totalEntries: dbStats.entries,
    l1Hits,
    l2Hits,
    misses,
    hitRate,
    sets,
    ttlDays:   (TTL_SEC / 86400).toFixed(1),
    disabled:  DISABLED,
    persistent: true
  };
}

module.exports = { get, set, flush, stats, normalizeKey };
