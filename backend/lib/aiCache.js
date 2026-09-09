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

// ── Default Agricultural QA Seeds ───────────────────────────────────────────
// Pre-warm cache with authentic AARI / UVAS verified Pakistani farming answers
const SEED_AGRI_CACHE = [
  {
    q: 'گندم کی کھاد کا شیڈول کیا ہے',
    lang: 'ur',
    a: '🌾 گندم کی کھاد کا شیڈول (AARI فیصل آباد سفارشات):\n• بوائی کے وقت: 1 بوری DAP + آدھی بوری یوریا یا نائٹروفاس 2 بوری۔\n• پہلا پانی (20-25 دن بعد): 1 بوری یوریا + 6 کلو زنک سلفیٹ (33%)۔\n• دوسرا پانی (گوبھ کی حالت): 1 بوری یوریا یا کین گوارا۔\n• نوٹ: پوٹاش (SOP) 12.5 کلو بوائی کے وقت دینا پیداوار 10-15% بڑھاتا ہے۔'
  },
  {
    q: 'کپاس میں گلابی سنڈی کا علاج',
    lang: 'ur',
    a: '🐛 کپاس میں گلابی سنڈی (Pink Bollworm) کا جامع کنٹرول:\n1. جنسی پھندے (Pheromone Traps): 5 عدد فی ایکڑ بوائی کے 40 دن بعد لگائیں۔\n2. معاشی حد (ETL): 5 فیصد تازہ پھولوں یا ڈوڈوں میں سنڈی کی موجودگی۔\n3. کیمیائی سپرے: کوریجن (Coragen 20SC) 50 ملی لیٹر یا ڈیلیگیٹ (Delegate) 50 گرام یا ایمامیکٹن بینزویٹ 200 ملی لیٹر فی ایکڑ۔\n4. احتیاط: سپرے شام 5 بجے کے بعد الٹے رخ نوزل سے کریں۔'
  },
  {
    q: 'مکئی میں فال آرمی ورم کا علاج',
    lang: 'ur',
    a: '🌽 مکئی میں فال آرمی ورم (FAW) کا انسداد:\n• کونپل میں حملہ ظاہر ہونے پر کوریجن (Chlorantraniliprole) 50 ملی لیٹر یا لیوفینوران + ایمامیکٹن بینزویٹ کا سپرے کریں۔\n• ہینڈ سپرے استعمال کریں اور نوزل سیدھی پودے کی درمیانی کونپل (whorl) کے اندر رکھ کر دوائی ڈالیں تاکہ سنڈی تک پہنچے۔'
  },
  {
    q: 'نیلی راوی بھینس کا ونڈا کتنا دینا چاہیے',
    lang: 'ur',
    a: '🐄 نیلی راوی بھینس کیلئے متوازن ونڈا شیڈول (UVAS لاہور فارمولیشن):\n• جسمانی بقا (Maintenance): 1.8 کلو ونڈا روزانہ۔\n• دودھ پیداوار: ہر 2 لیٹر دودھ پر 1 کلو معیاری ونڈا (18% خام پروٹین CP)۔\n• مثال: 10 لیٹر دودھ دینے والی بھینس کیلئے روزانہ کل 6.8 کلو ونڈا (3.4 کلو صبح + 3.4 کلو شام)۔\n• ساتھ 35-40 کلو برسین یا مکئی سائیلج اور 4 کلو توڑی کھلائیں۔'
  },
  {
    q: 'سرسوں کی بجائی کا طریقہ',
    lang: 'ur',
    a: '🌱 سرسوں اور رایا کی کاشت (زرعی ماہرین پنجاب):\n• موزوں وقت: 15 ستمبر تا 15 اکتوبر۔\n• شرح بیج: 1.5 سے 2 کلو گرام فی ایکڑ معیاری اور زہر آلود بیج۔\n• طریقہ کاشت: تر وتر حالت میں سنگل رو ڈرل کے ذریعے، قطار سے قطار کا فاصلہ 1.5 فٹ۔\n• کھاد: بوائی کے وقت 1 بوری DAP اور 1 بوری یوریا پہلے پانی پر۔'
  },
  {
    q: 'یوریا اور ڈی اے پی ڈالنے کا صحیح وقت',
    lang: 'ur',
    a: '⚡ کھادوں کے استعمال کا سنہری اصول:\n1. DAP (فاسفورس): ہمیشہ زمین کی آخری تیاری یا بوائی کے وقت بذریعہ ڈرل یا چھٹہ دیں۔ کھڑی فصل میں پانی کے ساتھ DAP کا اثر 60 فیصد کم ہو جاتا ہے۔\n2. یوریا (نائٹروجن): پودے کی بڑھوتری کے وقت 2 سے 3 قسطوں میں آبپاشی کے ساتھ دیں۔ پھول یا گابھ آنے کے بعد یوریا مت ڈالیں۔'
  },
  {
    q: 'kisan card eligibility',
    lang: 'en',
    a: '💳 CM Punjab Kisan Card 2026 Eligibility & Details:\n• Eligibility: Farmers owning up to 12.5 acres registered in PLRA land record.\n• Benefit: Rs. 150,000 interest-free production loan per acre for certified seed, DAP, and Urea.\n• Application: Send SMS "PKC [13-digit CNIC]" to 8070 from your registered SIM, then collect card from Bank of Punjab (BOP).'
  },
  {
    q: 'rice blast treatment',
    lang: 'en',
    a: '🌾 Rice Blast (گردن توڑ / جھلساؤ) Management:\n• Symptoms: Spindle-shaped lesions on leaves and dark necrosis on panicle neck.\n• Chemical Control: Spray Beam 75WP (Tricyclazole) @ 120g/acre or Nativo 75WG @ 65g/acre in 100 liters of water.\n• Spray with hollow cone nozzle during early morning or evening hours.'
  }
];

async function warmL1FromDB() {
  if (DISABLED) return;
  try {
    const rows = await db.getUnexpiredCacheEntries(200);
    for (const r of rows) {
      if (r.cache_key && r.answer) {
        l1.set(r.cache_key, {
          value: r.answer,
          expiresAt: new Date(r.expires_at).getTime()
        });
      }
    }
  } catch {}
}

async function seedCacheIfEmpty() {
  if (DISABLED) return;
  try {
    await warmL1FromDB();
    if (l1.size === 0) {
      for (const item of SEED_AGRI_CACHE) {
        set(item.q, item.lang, item.a);
      }
    }
  } catch {}
}

// Warm up / seed in background
setTimeout(seedCacheIfEmpty, 1500);

// ── Public: stats ─────────────────────────────────────────────────────────────
/**
 * Stats for admin dashboard.
 */
async function stats() {
  let dbStats = { entries: 0, totalHits: 0 };
  try { dbStats = await db.getCacheStats(); } catch {}

  const totalEntries = Math.max(l1.size, dbStats.entries || 0);
  const totalHits = (l1Hits + l2Hits) + (dbStats.totalHits || 0);
  const totalRequests = totalHits + misses;
  const hitRateNum = totalRequests > 0
    ? parseFloat(((totalHits / totalRequests) * 100).toFixed(1))
    : 0;

  return {
    entries:      totalEntries,
    totalEntries: totalEntries,
    l1Entries:    l1.size,
    l2Entries:    dbStats.entries || 0,
    hits:         totalHits,
    totalHits:    totalHits,
    l1Hits,
    l2Hits,
    dbHits:       dbStats.totalHits || 0,
    misses,
    hitRate:      hitRateNum,
    hitRateStr:   `${hitRateNum}%`,
    sets,
    ttlDays:      parseFloat((TTL_SEC / 86400).toFixed(1)),
    disabled:     DISABLED,
    persistent:   true
  };
}

module.exports = { get, set, flush, stats, normalizeKey };
