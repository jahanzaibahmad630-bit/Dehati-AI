/**
 * AI Response Cache — In-memory LRU with TTL
 *
 * Caches Claude answers so identical/near-identical questions
 * are served instantly without an API call.
 *
 * Config (env vars):
 *   AI_CACHE_MAX   — max entries  (default: 1000)
 *   AI_CACHE_TTL   — TTL seconds  (default: 86400 = 24 hours)
 *   AI_CACHE_OFF   — set "true" to disable
 */

const MAX_ENTRIES = parseInt(process.env.AI_CACHE_MAX || '1000', 10);
const TTL_MS      = parseInt(process.env.AI_CACHE_TTL  || '86400', 10) * 1000;
const DISABLED    = process.env.AI_CACHE_OFF === 'true';

// Map<key, { value, expiresAt, hits }>
const store = new Map();

// Stats
let totalHits   = 0;
let totalMisses = 0;
let totalSets   = 0;

// ─── Normalize question to a cache key ──────────────────────────────────────
// Lowercase, collapse whitespace, strip punctuation → so
// "گندم میں پانی ؟" and "گندم میں پانی" map to the same key.
function normalizeKey(text, language = 'ur') {
  return (language + ':' + text)
    .toLowerCase()
    .replace(/[؟?!.,،;:\-]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')           // collapse spaces
    .trim();
}

// ─── Evict expired + overflow entries ────────────────────────────────────────
function evict() {
  const now = Date.now();

  // Remove expired
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }

  // If still over max, delete oldest (Map preserves insertion order)
  if (store.size > MAX_ENTRIES) {
    const excess = store.size - MAX_ENTRIES;
    let deleted = 0;
    for (const k of store.keys()) {
      store.delete(k);
      if (++deleted >= excess) break;
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get a cached answer.
 * @param {string} question  — raw user question
 * @param {string} language  — 'ur' | 'pj' | 'en'
 * @returns {string|null}    — cached answer or null
 */
function get(question, language = 'ur') {
  if (DISABLED) return null;
  const key  = normalizeKey(question, language);
  const entry = store.get(key);
  if (!entry) { totalMisses++; return null; }
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    totalMisses++;
    return null;
  }
  entry.hits++;
  totalHits++;
  return entry.value;
}

/**
 * Store an answer.
 * @param {string} question
 * @param {string} language
 * @param {string} answer
 */
function set(question, language = 'ur', answer) {
  if (DISABLED || !answer) return;
  const key = normalizeKey(question, language);
  store.set(key, {
    value:     answer,
    expiresAt: Date.now() + TTL_MS,
    hits:      0,
    savedAt:   Date.now()
  });
  totalSets++;
  // Evict lazily (not every call — every 100 sets)
  if (totalSets % 100 === 0) evict();
}

/**
 * Stats for admin dashboard.
 */
function stats() {
  return {
    entries:     store.size,
    maxEntries:  MAX_ENTRIES,
    ttlHours:    TTL_MS / 3600000,
    hits:        totalHits,
    misses:      totalMisses,
    hitRate:     totalHits + totalMisses > 0
                   ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(1) + '%'
                   : '0%',
    sets:        totalSets,
    disabled:    DISABLED
  };
}

/**
 * Flush all entries (used by admin or tests).
 */
function flush() {
  store.clear();
  totalHits = totalMisses = totalSets = 0;
}

module.exports = { get, set, stats, flush, normalizeKey };
