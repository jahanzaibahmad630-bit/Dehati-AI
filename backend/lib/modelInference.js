/**
 * DehatiAI — Backend Inference Engine
 */

const fs    = require('fs');
const path  = require('path');

const CLASSES_PATH  = path.join(__dirname, 'diseaseClasses.json');
const AGRONOMY_PATH = path.join(__dirname, 'agronomyDatabase.json');

let diseaseClasses   = {};
let agronomyDb       = {};
let isModelAvailable = false;
const activeLearningCache = new Map();

try {
  if (fs.existsSync(CLASSES_PATH)) {
    diseaseClasses = JSON.parse(fs.readFileSync(CLASSES_PATH, 'utf8'));
    console.log(`✅ Disease Index: ${Object.keys(diseaseClasses).length} classes`);
  }
  if (fs.existsSync(AGRONOMY_PATH)) {
    agronomyDb = JSON.parse(fs.readFileSync(AGRONOMY_PATH, 'utf8'));
    console.log(`✅ Agronomy DB: ${Object.keys(agronomyDb).length} verified prescriptions`);
  }
} catch (err) {
  console.error('[ModelInference] Bootstrap error:', err.message);
}

// Map common Urdu and English crop names to primary disease keys in agronomyDb
const CROP_NAME_MAP = {
  'مکئی': 'maize_northern_leaf_blight',
  'مکی': 'maize_northern_leaf_blight',
  'corn': 'maize_northern_leaf_blight',
  'maize': 'maize_northern_leaf_blight',
  'گندم': 'wheat_yellow_stripe_rust',
  'wheat': 'wheat_yellow_stripe_rust',
  'کپاس': 'cotton_whitefly',
  'cotton': 'cotton_whitefly',
  'چاول': 'rice_bacterial_leaf_blight',
  'دھان': 'rice_bacterial_leaf_blight',
  'چاول / دھان': 'rice_bacterial_leaf_blight',
  'rice': 'rice_bacterial_leaf_blight',
  'آلو': 'potato_late_blight',
  'potato': 'potato_late_blight',
  'گنا': 'sugarcane_red_rot',
  'sugarcane': 'sugarcane_red_rot',
  'ٹماٹر': 'tomato_early_blight',
  'tomato': 'tomato_early_blight',
  'مرچ': 'chilli_anthracnose',
  'chilli': 'chilli_anthracnose',
  'chili': 'chilli_anthracnose',
  'پیاز': 'onion_purple_blotch',
  'onion': 'onion_purple_blotch',
  'آم': 'mango_anthracnose',
  'mango': 'mango_anthracnose',
  'کنو': 'citrus_canker',
  'کینوں': 'citrus_canker',
  'citrus': 'citrus_canker'
};

function normalizeKey(str) {
  if (!str) return '';
  const trimmed = str.toString().trim();
  if (/[^\x00-\x7F]/.test(trimmed)) {
    return trimmed.toLowerCase().replace(/\s+/g, ' ');
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getAgronomyRecord(keyOrName) {
  if (!keyOrName) return null;
  const raw = keyOrName.toString().trim();
  const clean = normalizeKey(raw);

  // 1. Direct agronomyDb key
  if (agronomyDb[raw]) return { key: raw, data: agronomyDb[raw] };
  if (agronomyDb[clean]) return { key: clean, data: agronomyDb[clean] };

  // 2. Active learning memory cache
  if (activeLearningCache.has(raw)) return { key: raw, data: activeLearningCache.get(raw) };
  if (activeLearningCache.has(clean)) return { key: clean, data: activeLearningCache.get(clean) };

  // 3. Crop map lookup
  if (CROP_NAME_MAP[raw] && agronomyDb[CROP_NAME_MAP[raw]]) {
    return { key: CROP_NAME_MAP[raw], data: agronomyDb[CROP_NAME_MAP[raw]] };
  }
  if (CROP_NAME_MAP[clean] && agronomyDb[CROP_NAME_MAP[clean]]) {
    return { key: CROP_NAME_MAP[clean], data: agronomyDb[CROP_NAME_MAP[clean]] };
  }

  // 4. Search by Urdu or English name in agronomyDb values
  for (const [k, val] of Object.entries(agronomyDb)) {
    if (k === 'note') continue;
    if (val.name_ur && (val.name_ur.includes(raw) || raw.includes(val.name_ur))) {
      return { key: k, data: val };
    }
    if (val.name_en && clean && (normalizeKey(val.name_en).includes(clean) || clean.includes(normalizeKey(val.name_en)))) {
      return { key: k, data: val };
    }
  }

  // 5. Substring key matching
  if (clean && clean.length > 2) {
    const fwd = Object.keys(agronomyDb).find(k => k !== 'note' && k.includes(clean));
    if (fwd) return { key: fwd, data: agronomyDb[fwd] };
    const rev = Object.keys(agronomyDb).find(k => k !== 'note' && clean.includes(k));
    if (rev) return { key: rev, data: agronomyDb[rev] };
  }

  return null;
}

function predictDisease(imageBase64, cropName, requestedKey = null) {
  let matchedClassName = null;
  let source = 'requires_ai_analysis';
  let model_attribution = '🤖 AI وژن تجزیہ ضروری';

  if (imageBase64) {
    source = 'requires_ai_analysis';
    model_attribution = '🤖 AI وژن تجزیہ ضروری';
  } else if (requestedKey) {
    const cleanKey = normalizeKey(requestedKey);
    const entry    = Object.entries(diseaseClasses).find(([, name]) =>
      normalizeKey(name) === cleanKey || cleanKey.includes(normalizeKey(name))
    );
    if (entry) {
      matchedClassName = entry[1];
    } else {
      matchedClassName = requestedKey;
    }
    source = 'database_match';
    model_attribution = '✓ مقامی ڈیٹابیس ریکارڈ';
  } else if (cropName) {
    const cleanSearch = normalizeKey(cropName);
    const entry       = Object.entries(diseaseClasses).find(([, name]) => {
      const n = normalizeKey(name);
      return cleanSearch && (n.includes(cleanSearch) || cleanSearch.includes(n));
    });
    if (entry) {
      matchedClassName = entry[1];
    } else {
      matchedClassName = cropName;
    }
    source = 'database_match';
    model_attribution = '✓ مقامی ڈیٹابیس ریکارڈ';
  }

  const localMatch =
    getAgronomyRecord(requestedKey)     ||
    getAgronomyRecord(cropName)         ||
    getAgronomyRecord(matchedClassName);

  const hasLocalRecord = !!(localMatch && localMatch.data);
  const record         = hasLocalRecord ? localMatch.data : null;

  return {
    source,
    hasLocalRecord,
    localKey: hasLocalRecord ? localMatch.key : null,
    isModelActive: isModelAvailable,
    model_attribution,

    disease_en:             record ? record.name_en : (matchedClassName || cropName || ''),
    disease_ur:             record ? record.name_ur : (matchedClassName || cropName || ''),
    disease:                record
      ? `${record.name_ur} (${record.name_en})`
      : (matchedClassName || cropName || ''),

    cause:                  record ? (record.cause || 'پھپھوندی / پاتھوجن') : 'پھپھوندی / پاتھوجن',
    severity:               record ? (record.severity || 'درمیانہ (Moderate)') : 'درمیانہ',
    emergency_action:       record ? (record.emergency_action || 'فوری طور پر نائٹروجن (یوریا) کا استعمال روکیں اور نکاسی آب بہتر بنائیں') : '',
    spray_conditions:       record ? (record.spray_conditions || 'صبح 9 بجے سے پہلے یا شام کے وقت سپرے کریں۔ تیز ہوا یا تیز دھوپ میں سپرے مت کریں۔') : '',
    fertilizer_adjustment:  record ? (record.fertilizer_adjustment || 'یوریا کھاد کا استعمال فوری روکیں۔ پوٹاش (SOP) کا استعمال پودے کو بیماری سے بچاتا ہے۔') : '',
    symptoms_analysis:      record ? (record.symptoms_analysis || '') : '',
    treatment:              record ? (record.treatment_summary || record.treatment) : 'بیماری کی ابتدائی علامات پر فوری مقامی زرعی افسر سے مشورہ کریں۔',
    prevention:             record ? record.prevention         : 'کھیت صاف رکھیں اور متوازن کھاد دیں۔',
    withholding_period_days: record ? (record.withholding_period_days || 14) : 14,
    organic_alternative:    record
      ? (record.organic_alternative || 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔')
      : 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔',
    medicines:              record ? (record.medicines || []) : []
  };
}

function saveToAgronomyDb(key, prescription) {
  if (!key || !prescription || !prescription.disease_ur) return;
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return;

  if (agronomyDb[normalizedKey] || activeLearningCache.has(normalizedKey)) {
    console.log(`[ActiveLearning] Skipped "${normalizedKey}" — already known`);
    return;
  }

  try {
    activeLearningCache.set(normalizedKey, {
      name_ur:                prescription.disease_ur,
      name_en:                prescription.disease_en || key,
      treatment_summary:      prescription.treatment  || '',
      severity:               prescription.severity   || 'درمیانہ',
      emergency_action:       prescription.emergency_action || '',
      spray_conditions:       prescription.spray_conditions || '',
      fertilizer_adjustment:  prescription.fertilizer_adjustment || '',
      symptoms_analysis:      prescription.symptoms_analysis || '',
      withholding_period_days: prescription.withholding_period_days || 14,
      organic_alternative:    prescription.organic_alternative || '',
      medicines:              prescription.medicines || [],
      prevention:             prescription.prevention || '',
      _source:                'ai_vision_generated',
      _saved_at:              new Date().toISOString()
    });
    console.log(`[ActiveLearning] ✅ Cached in-memory diagnosis for "${normalizedKey}"`);
  } catch (err) {
    console.warn('[ActiveLearning] Error:', err.message);
  }
}

module.exports = {
  isModelAvailable,
  predictDisease,
  getAgronomyRecord,
  saveToAgronomyDb,
  diseaseClasses,
  get agronomyDb() { return agronomyDb; }
};
