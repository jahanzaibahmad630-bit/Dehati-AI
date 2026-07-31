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

function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getAgronomyRecord(keyOrName) {
  if (!keyOrName) return null;
  const clean = normalizeKey(keyOrName);
  if (!clean) return null;

  if (agronomyDb[clean])                            return { key: clean, data: agronomyDb[clean] };
  const fwd = Object.keys(agronomyDb).find(k => k.includes(clean));
  if (fwd)                                          return { key: fwd,   data: agronomyDb[fwd]   };
  const rev = Object.keys(agronomyDb).find(k => clean.includes(k));
  if (rev)                                          return { key: rev,   data: agronomyDb[rev]   };
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
      source = 'database_match';
      model_attribution = '✓ مقامی ڈیٹابیس ریکارڈ';
    } else {
      matchedClassName = requestedKey;
      source = 'database_match';
      model_attribution = '✓ مقامی ڈیٹابیس ریکارڈ';
    }
  } else if (cropName) {
    const cleanSearch = normalizeKey(cropName);
    const entry       = Object.entries(diseaseClasses).find(([, name]) => {
      const n = normalizeKey(name);
      return n.includes(cleanSearch) || cleanSearch.includes(n);
    });
    if (entry) {
      matchedClassName = entry[1];
      source = 'database_match';
      model_attribution = '✓ مقامی ڈیٹابیس ریکارڈ';
    } else {
      matchedClassName = cropName;
      source = 'requires_ai_analysis';
      model_attribution = '🤖 AI وژن تجزیہ ضروری';
    }
  }

  const localMatch =
    getAgronomyRecord(requestedKey)    ||
    getAgronomyRecord(matchedClassName) ||
    getAgronomyRecord(cropName);

  const hasLocalRecord = !!(localMatch && localMatch.data);
  const record         = hasLocalRecord ? localMatch.data : null;

  return {
    source,
    hasLocalRecord,
    localKey: hasLocalRecord ? localMatch.key : null,
    isModelActive: isModelAvailable,
    model_attribution,

    disease_en:             record ? record.name_en : (matchedClassName || ''),
    disease_ur:             record ? record.name_ur : (matchedClassName || ''),
    disease:                record
      ? `${record.name_ur} (${record.name_en})`
      : (matchedClassName || ''),

    cause:                  'پھپھوندی / پاتھوجن',
    treatment:              record ? record.treatment_summary  : 'بیماری کی ابتدائی علامات پر فوری مقامی زرعی افسر سے مشورہ کریں۔',
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

  if (agronomyDb[normalizedKey]) {
    console.log(`[ActiveLearning] Skipped "${normalizedKey}" — already in local DB`);
    return;
  }

  try {
    agronomyDb[normalizedKey] = {
      name_ur:                prescription.disease_ur,
      name_en:                prescription.disease_en || key,
      treatment_summary:      prescription.treatment  || '',
      withholding_period_days: prescription.withholding_period_days || 14,
      organic_alternative:    prescription.organic_alternative || '',
      medicines:              prescription.medicines || [],
      prevention:             prescription.prevention || '',
      _source:                'ai_vision_generated',
      _saved_at:              new Date().toISOString()
    };

    fs.writeFile(
      AGRONOMY_PATH,
      JSON.stringify(agronomyDb, null, 2),
      'utf8',
      (writeErr) => {
        if (writeErr) {
          console.warn('[ActiveLearning] Write error:', writeErr.message);
        } else {
          console.log(`[ActiveLearning] ✅ Saved "${normalizedKey}" → agronomyDatabase.json`);
        }
      }
    );
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
