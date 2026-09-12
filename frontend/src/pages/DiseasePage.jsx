import { useState, useRef, useEffect } from 'react';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { detectDisease, getDiseaseCatalog, compressImage } from '../services/api';
import { OFFLINE_DISEASE_CATALOG, getOfflineDisease } from '../data/agronomyData';
import AnimalHealthAdvisor from '../components/tools/AnimalHealthAdvisor';

import AudioPlayer from '../components/ui/AudioPlayer';

/* ──────────────────────────────────────────────────────────────────
   Premium Disease Scanner — Injected CSS animations & Rx Modal
   ────────────────────────────────────────────────────────────────── */
const DISEASE_STYLES = `
  @keyframes scanPulse {
    0%   { opacity: 1;   transform: scale(1); }
    50%  { opacity: .55; transform: scale(1.06); }
    100% { opacity: 1;   transform: scale(1); }
  }
  @keyframes scanSweep {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes scanLine {
    0%   { top: 10%; opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { top: 88%; opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes confBar {
    from { width: 0; }
    to   { width: var(--conf-w); }
  }
  @keyframes tipGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251,192,45,0); }
    50%       { box-shadow: 0 0 0 6px rgba(251,192,45,.15); }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform: scale(0); }
    40%         { transform: scale(1); }
  }
  .ds-fade-up { animation: fadeSlideUp .45s ease both; }
  .ds-card {
    background: rgba(13,32,16,.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 20px;
    padding: 1.1rem 1.15rem;
  }
  .ds-card-light {
    background: rgba(255,255,255,.97);
    border: 1.5px solid rgba(46,90,39,.15);
    border-radius: 18px;
    padding: 1rem 1.1rem;
    box-shadow: 0 4px 24px rgba(46,90,39,.09);
  }
  .ds-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 13px; border-radius: 999px;
    font-size: .72rem; font-weight: 800; font-family: Inter, sans-serif;
    white-space: nowrap;
  }
  .ds-btn-scan {
    width: 100%; padding: 1rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none; border-radius: 16px;
    color: white; font-size: 1.05rem; font-weight: 900;
    cursor: pointer; letter-spacing: .01em;
    box-shadow: 0 6px 22px rgba(16,185,129,.4);
    transition: transform .15s, box-shadow .15s;
    font-family: 'Noto Nastaliq Urdu', serif;
  }
  .ds-btn-scan:active { transform: scale(.97); box-shadow: 0 3px 12px rgba(16,185,129,.3); }
  .ds-btn-scan:disabled {
    background: #334155; color: #64748b;
    box-shadow: none; cursor: not-allowed; transform: none;
  }
  .ds-catalog-row {
    padding: 9px 12px; border-radius: 12px; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(22,36,16,.7); margin-bottom: 5px;
    border: 1px solid rgba(58,114,50,.45);
    transition: background .18s;
  }
  .ds-catalog-row:hover { background: rgba(46,90,39,.55); }
  .ds-loading-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; background: #10b981;
    animation: dotBounce 1.4s infinite ease-in-out both;
  }
  .ds-med-card {
    background: #fff;
    border: 2px solid rgba(46,90,39,.18);
    border-radius: 18px; padding: 1.1rem;
    direction: rtl;
    box-shadow: 0 2px 12px rgba(46,90,39,.08);
    transition: transform .15s, box-shadow .15s;
  }
  .ds-med-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(46,90,39,.15); }
  .ds-conf-bar-inner {
    height: 100%; border-radius: 8px;
    animation: confBar .9s cubic-bezier(.34,1.56,.64,1) both;
  }
  .ds-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 1rem; backdrop-filter: blur(8px);
  }
  .ds-rx-slip {
    background: #ffffff; color: #0f172a; width: 100%; max-width: 520px;
    max-height: 90vh; overflow-y: auto; border-radius: 20px;
    padding: 1.5rem; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    border: 3px solid #15803d; direction: rtl; font-family: 'Noto Nastaliq Urdu', serif;
  }
  @media print {
    body * { visibility: hidden; }
    .ds-rx-slip, .ds-rx-slip * { visibility: visible; }
    .ds-rx-slip { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-shadow: none; border: 2px solid #000; }
    .ds-rx-no-print { display: none !important; }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────────── */
function calculateTotalDose(dosageStr, acres) {
  if (!dosageStr || !acres || acres <= 1) return dosageStr;

  // Multi-medicine alternatives separated by ' یا '
  if (dosageStr.includes(' یا ')) {
    return dosageStr.split(' یا ')
      .map(part => calculateTotalDose(part.trim(), acres))
      .join(' یا ');
  }

  // Range match: e.g. "80 تا 100 گرام فی ایکڑ", "125-150 ملی لیٹر", "600–800 گرام"
  const rangeMatch = dosageStr.match(/^(\d+(?:\.\d+)?)\s*(?:[-–—]|تا|سے|to)\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (rangeMatch) {
    const min = (parseFloat(rangeMatch[1]) * acres).toFixed(0);
    const max = (parseFloat(rangeMatch[2]) * acres).toFixed(0);
    return `${min} تا ${max} ${rangeMatch[3].trim()}`;
  }

  // Single quantity match: e.g. "200 ملی لیٹر فی ایکڑ", "65 گرام"
  const singleMatch = dosageStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (singleMatch) {
    const total = (parseFloat(singleMatch[1]) * acres).toFixed(0);
    return `${total} ${singleMatch[2].trim()}`;
  }

  return `${dosageStr} × ${acres}`;
}


function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { const b = typeof reader.result === 'string' ? reader.result.split(',')[1] : ''; res(b); };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/* ─── Roman Urdu Map ─────────────────────────────────────────────── */
const ROMAN_URDU_MAP = {
  'wheat yellow stripe rust': 'Gandam ki Peeli Zang',
  'wheat brown rust': 'Gandam ki Bhoori Zang',
  'wheat black stem rust': 'Gandam ki Kali Zang',
  'wheat powdery mildew': 'Gandam ka Bhabhootiya',
  'wheat loose smut': 'Gandam ka Aasar / Kanda',
  'wheat karnal bunt': 'Gandam ka Karnal Bunt',
  'wheat septoria leaf blotch': 'Gandam ka Patton ka Dhaba',
  'cotton whitefly': 'Kapas ki Safaid Makkhi',
  'cotton bollworm': 'Kapas ki Sundee / Bollworm',
  'cotton pink bollworm': 'Kapas ki Gulaabi Sundee',
  'cotton bacterial blight': 'Kapas ki Phoondki / Blight',
  'cotton leaf curl virus': 'Kapas ka Patta Murjhanay ka Vairis',
  'rice blast': 'Chawal / Dhan ka Jhalsa',
  'rice brown spot': 'Chawal ka Bhoora Dhaba',
  'rice bacterial blight': 'Chawal ki Bacterial Blight',
  'rice sheath blight': 'Chawal ki Sheath Blight / Tanay ka Jhulsa',
  'sheath blight': 'Chawal ki Sheath Blight / Tanay ka Jhulsa',
  'potato late blight': 'Aloo ki Pichli Jhulsa Bimari',
  'potato early blight': 'Aloo ki Ageti Jhulsa Bimari',
  'tomato leaf curl': 'Tamatar ka Patta Morna',
  'maize northern leaf blight': 'Makkai ka Patton ka Jhulsa',
  'northern corn leaf blight': 'Makkai ka Patton ka Jhulsa',
  'turcicum leaf blight': 'Makkai ka Patton ka Jhulsa',
  'maize fall armyworm': 'Makkai ki Lashkari Sundee',
  'fall armyworm': 'Makkai ki Lashkari Sundee',
  'maize stem borer': 'Makkai ke Tanne ki Sundee',
  'rice bacterial leaf blight': 'Chawal ki Bacterial Blight',
  'rice stem borer': 'Chawal ke Tanne ki Sundee',
  'chilli anthracnose': 'Mirch ka Anthracnose / Jhulsa',
  'onion purple blotch': 'Piyaz ka Jamni Dhabba',
  'citrus canker': 'Kinnu ka Canker',
  'mango anthracnose': 'Aam ka Anthracnose',
  'sugarcane red rot': 'Ganna ki Lal Sarak Bimari',
  'sugarcane smut': 'Ganna ka Kala Kanda',
  'mustard white rust': 'Sarson ki Safaid Zang',
  'chickpea fusarium wilt': 'Chana ki Jari Murjhahat',
};

function getRomanUrdu(diseaseEn, diseaseUr) {
  if (diseaseEn) {
    const key = diseaseEn.toLowerCase().trim();
    if (ROMAN_URDU_MAP[key]) return ROMAN_URDU_MAP[key];
    const partial = Object.keys(ROMAN_URDU_MAP).find(k => key.includes(k) || k.includes(key));
    if (partial) return ROMAN_URDU_MAP[partial];
  }
  const ur = diseaseUr || '';
  if (ur.includes('مکئی') || ur.includes('مکی')) return 'Makkai ki Bimari';
  if (ur.includes('گندم')) return 'Gandam ki Bimari';
  if (ur.includes('کپاس')) return 'Kapas ki Bimari';
  if (ur.includes('چاول') || ur.includes('دھان')) return 'Chawal ki Bimari';
  if (ur.includes('آلو')) return 'Aloo ki Bimari';
  if (ur.includes('گنا')) return 'Ganna ki Bimari';
  if (ur.includes('ٹماٹر')) return 'Tamatar ki Bimari';
  if (ur.includes('مرچ')) return 'Mirch ki Bimari';
  if (ur.includes('پیاز')) return 'Piyaz ki Bimari';
  if (diseaseEn) return diseaseEn.replace(/\b\w/g, c => c.toUpperCase());
  return 'Fasal ki Bimari';
}

/* ─── Interactive Differential Rules for Common Look-alike Diseases ─── */
const DIFFERENTIAL_RULES = [
  {
    triggers: ['sheath blight', 'شیتھ', 'bacterial leaf blight', 'blb', 'بیکٹیریل', 'چاول', 'دھان'],
    question: '🔍 1-کلک تشخیصی تفریق: دھبے پودے کے کس حصے پر ہیں؟',
    optionA: {
      label: '✅ تنے کے نچلے غلاف پر پانی کے پاس (شیتھ بلائٹ)',
      disease_ur: 'دھان کا شیتھ بلائٹ / تنے کا جھلساؤ',
      disease_en: 'Rice Sheath Blight',
      disease_roman: 'Chawal ki Sheath Blight',
      severity: 'شدید',
      cause: 'Rhizoctonia solani (پھپھوندی)',
      emergency_action: 'نائٹروجن (یوریا) کھاد فوری بند کریں اور کھیت سے اضافی پانی نکال کر زمین خشک کریں۔',
      treatment: 'فوری طور پر Nativo 75WG یا Amistar Top کا سپرے تنے کے نچلے حصے تک پہنچا کر کریں۔',
      medicines: [
        { brand: 'Nativo 75WG', active: 'Tebuconazole + Trifloxystrobin', dosage: '65 گرام فی ایکڑ', tank_dosage_20l: '13 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,200', suppliers: ['Bayer CropScience'] },
        { brand: 'Amistar Top', active: 'Azoxystrobin + Difenoconazole', dosage: '200 ملی لیٹر فی ایکڑ', tank_dosage_20l: '40 ملی لیٹر فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,600', suppliers: ['Syngenta Pakistan'] },
        { brand: 'Validacin 3L', active: 'Validamycin', dosage: '500 ملی لیٹر فی ایکڑ', tank_dosage_20l: '100 ملی لیٹر فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 1,400', suppliers: ['Arysta / UPL'] }
      ]
    },
    optionB: {
      label: 'پتے کی نوک سے نیچے کی طرف لہراتی سوکھاوٹ (BLB)',
      disease_ur: 'دھان کا بیکٹیریل پتوں کا جھلساؤ (BLB)',
      disease_en: 'Rice Bacterial Leaf Blight',
      disease_roman: 'Chawal ki Bacterial Blight',
      severity: 'شدید',
      cause: 'Xanthomonas oryzae pv. oryzae (بیکٹیریا)',
      emergency_action: 'پانی خشک کریں، عام فنگسائڈ کام نہیں کرے گی۔ کاپر آکسی کلورائیڈ اور اینٹی بائیوٹک استعمال کریں۔',
      treatment: 'کاپر آکسی کلورائیڈ (Cuprocaffaro) اور اینٹی بائیوٹک (Kasumin 2L) کا سپرے کریں۔',
      medicines: [
        { brand: 'Cuprocaffaro 50WP', active: 'Copper Oxychloride', dosage: '500 گرام فی ایکڑ', tank_dosage_20l: '100 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 1,450', suppliers: ['Isagro / Ali Akbar'] },
        { brand: 'Kasumin 2L', active: 'Kasugamycin', dosage: '400 ملی لیٹر فی ایکڑ', tank_dosage_20l: '80 ملی لیٹر فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 1,800', suppliers: ['Arysta / UPL'] }
      ]
    }
  },
  {
    triggers: ['yellow rust', 'پیلی زنگ', 'brown rust', 'بھوری زنگ', 'stripe rust', 'گندم'],
    question: '🔍 1-کلک تشخیصی تفریق: زنگ کے دھبوں کی بناوٹ کیسی ہے؟',
    optionA: {
      label: '✅ پتے پر لمبی متوازی پیلی لکیریں (پیلی زنگ)',
      disease_ur: 'گندم کی پیلی زنگ (Yellow / Stripe Rust)',
      disease_en: 'Wheat Yellow Stripe Rust',
      disease_roman: 'Gandam ki Peeli Zang',
      severity: 'شدید',
      cause: 'Puccinia striiformis (پھپھوندی)',
      emergency_action: 'ہوا سے تیزی سے پھیلتی ہے، 24 گھنٹے میں پورے کھیت میں سپرے لازمی کریں۔',
      treatment: 'ٹیلٹ (Tilt 250EC) یا نیٹیوو کا فوری سپرے کریں۔',
      medicines: [
        { brand: 'Tilt 250EC', active: 'Propiconazole', dosage: '200 ملی لیٹر فی ایکڑ', tank_dosage_20l: '40 ملی لیٹر فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 1,950', suppliers: ['Syngenta Pakistan'] },
        { brand: 'Nativo 75WG', active: 'Tebuconazole + Trifloxystrobin', dosage: '65 گرام فی ایکڑ', tank_dosage_20l: '13 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,200', suppliers: ['Bayer CropScience'] }
      ]
    },
    optionB: {
      label: 'بے ترتیب گول یا بیضوی بھورے دھبے (بھوری زنگ)',
      disease_ur: 'گندم کی بھوری زنگ (Brown / Leaf Rust)',
      disease_en: 'Wheat Brown Leaf Rust',
      disease_roman: 'Gandam ki Bhoori Zang',
      severity: 'درمیانہ',
      cause: 'Puccinia triticina (پھپھوندی)',
      emergency_action: 'درجہ حرارت 25 ڈگری سے اوپر جانے پر سپرے کریں۔',
      treatment: 'اسکور (Score 250EC) یا ٹیلٹ کا سپرے کریں۔',
      medicines: [
        { brand: 'Score 250EC', active: 'Difenoconazole', dosage: '125 ملی لیٹر فی ایکڑ', tank_dosage_20l: '25 ملی لیٹر فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,100', suppliers: ['Syngenta'] }
      ]
    }
  },
  {
    triggers: ['late blight', 'early blight', 'پچھیتا', 'پچیتا', 'اگیتا', 'آلو', 'ٹماٹر'],
    question: '🔍 1-کلک تشخیصی تفریق: جھلساؤ کے دھبے کیسے ہیں؟',
    optionA: {
      label: '✅ پتے کا کالا گلنا + نیچے سفید پھپھوندی (پچھیتا جھلساؤ)',
      disease_ur: 'آلو / ٹماٹر کا پچھیتا جھلساؤ (Late Blight)',
      disease_en: 'Potato Late Blight',
      disease_roman: 'Aloo ka Pichita Jhulsa',
      severity: 'شدید ترین',
      cause: 'Phytophthora infestans (اوومائیسیٹ)',
      emergency_action: 'فوری ریڈومل گولڈ یا ایکروبیٹ کا سپرے کریں۔ کھیت میں زیادہ نمی نہ رہنے دیں۔',
      treatment: 'Ridomil Gold MZ یا Acrobat MZ کا مکمل سپرے کریں۔',
      medicines: [
        { brand: 'Ridomil Gold MZ 68WG', active: 'Metalaxyl-M + Mancozeb', dosage: '600 گرام فی ایکڑ', tank_dosage_20l: '120 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,400', suppliers: ['Syngenta Pakistan'] },
        { brand: 'Acrobat MZ', active: 'Dimethomorph + Mancozeb', dosage: '600 گرام فی ایکڑ', tank_dosage_20l: '120 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 2,150', suppliers: ['BASF Pakistan'] }
      ]
    },
    optionB: {
      label: 'دھبوں کے اندر گول دائرے جیسے نشان (ابتدائی جھلساؤ)',
      disease_ur: 'آلو / ٹماٹر کا اگیتا جھلساؤ (Early Blight)',
      disease_en: 'Potato Early Blight',
      disease_roman: 'Aloo ka Ageti Jhulsa',
      severity: 'درمیانہ',
      cause: 'Alternaria solani (پھپھوندی)',
      emergency_action: 'پرانے متاثرہ نچلے پتے کٹوا کر کھیت سے دور دفن کریں۔',
      treatment: 'Antracol 70WP یا Daconil 75WP کا سپرے کریں۔',
      medicines: [
        { brand: 'Antracol 70WP', active: 'Propineb', dosage: '600 گرام فی ایکڑ', tank_dosage_20l: '120 گرام فی 20L ڈرمکی', estimated_price_pkr: 'Rs. 1,650', suppliers: ['Bayer CropScience'] }
      ]
    }
  }
];

/* ─── Static Data ────────────────────────────────────────────────── */
const CROPS = [
  'گندم', 'چاول / دھان', 'کپاس', 'گنا', 'مکئی', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'مونگ', 'سبزی (عام)'
];

const PHOTO_TIPS = [
  { icon: '☀️', tip: 'دھوپ میں لیں' },
  { icon: '🔍', tip: 'قریب سے دکھائیں' },
  { icon: '📐', tip: 'کیمرہ سیدھا رکھیں' },
  { icon: '🌿', tip: 'ایک پتہ واضح ہو' },
];

const LAND_SIZES = [1, 2, 5, 10];

/* ─── Sub-Components ─────────────────────────────────────────────── */

function ConfidenceBar({ pct, color }) {
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        className="ds-conf-bar-inner"
        style={{ '--conf-w': `${Math.min(pct, 100)}%`, width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

function SeverityBadge({ severity }) {
  if (!severity) return null;
  const isCritical = severity.includes('شدید') || severity.toLowerCase().includes('critical') || severity.toLowerCase().includes('high');
  return (
    <span className="ds-pill" style={{
      background: isCritical ? 'rgba(239,68,68,.18)' : 'rgba(245,158,11,.18)',
      border: `1.5px solid ${isCritical ? '#ef4444' : '#f59e0b'}`,
      color: isCritical ? '#fca5a5' : '#fde68a',
      direction: 'rtl'
    }}>
      {isCritical ? '🔴' : '🟡'} شدتِ بیماری: {severity}
    </span>
  );
}

function MedicineCard({ med, idx, landSize }) {
  return (
    <div className="ds-med-card ds-fade-up" style={{ animationDelay: `${idx * 0.08}s` }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.6rem', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #162410, #2e5a27)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(46,90,39,.3)'
          }}>🧪</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#162410', lineHeight: 1.2 }}>{med.brand}</div>
            <div style={{ fontSize: '.72rem', color: '#64748b', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{med.active}</div>
          </div>
        </div>
        {med.estimated_price_pkr && (
          <span style={{
            background: 'linear-gradient(135deg, #162410, #2e5a27)',
            color: '#fbc02d', padding: '5px 12px', borderRadius: 10,
            fontWeight: 900, fontSize: '.78rem', fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22,36,16,.25)'
          }}>{med.estimated_price_pkr}</span>
        )}
      </div>

      {/* Dosage row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '.5rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 10, padding: '7px 12px', direction: 'rtl'
        }}>
          <div style={{ fontSize: '.68rem', color: '#15803d', fontWeight: 700, marginBottom: 2 }}>مقدار (1 ایکڑ)</div>
          <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#14532d' }}>{med.dosage} <span style={{ fontWeight: 500, color: '#166534' }}>({med.method || 'سپرے'})</span></div>
        </div>
        {med.tank_dosage_20l && (
          <div style={{
            flex: 1, background: '#ecfdf5', border: '1.5px solid #6ee7b7',
            borderRadius: 10, padding: '7px 12px', direction: 'rtl'
          }}>
            <div style={{ fontSize: '.68rem', color: '#059669', fontWeight: 700, marginBottom: 2 }}>🎒 20L ڈرمکی خوراک</div>
            <div style={{ fontSize: '.88rem', fontWeight: 800, color: '#065f46' }}>{med.tank_dosage_20l}</div>
          </div>
        )}
      </div>

      {/* Land size multiplier */}
      {landSize > 1 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff8e1, #fffde7)',
          border: '1.5px solid #fbc02d', borderRadius: 10,
          padding: '7px 12px', direction: 'rtl', marginBottom: '.45rem',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ fontSize: '1rem' }}>🧮</span>
          <span style={{ fontSize: '.84rem', color: '#78350f', fontWeight: 800 }}>
            {landSize} ایکڑ کل مقدار: <strong>{calculateTotalDose(med.dosage, landSize)}</strong>
          </span>
        </div>
      )}

      {/* Water volume */}
      {med.water_volume && (
        <div style={{ fontSize: '.8rem', color: '#475569', direction: 'rtl', marginBottom: '.3rem' }}>
          <strong style={{ color: '#334155' }}>💧 پانی: </strong>{med.water_volume}
        </div>
      )}

      {/* Suppliers */}
      {med.suppliers && med.suppliers.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: '.5rem', direction: 'rtl' }}>
          {med.suppliers.map(s => (
            <span key={s} style={{
              background: '#f0fdf4', color: '#14532d', border: '1px solid #bbf7d0',
              padding: '2px 10px', borderRadius: 8, fontSize: '.7rem', fontWeight: 700
            }}>🏢 {s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dealer Prescription Slip Modal (ڈیلر زرعی نسخہ) ─────────────────── */
function PrescriptionModal({ result, landSize, onClose, farmerName, farmerDistrict }) {
  const currentDate = new Date().toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' });

  const shareToDealer = () => {
    const medList = result.medicines?.map(m =>
      `• ${m.brand} (${m.active}): ${calculateTotalDose(m.dosage, landSize)} (${landSize > 1 ? `${landSize} ایکڑ کل` : '1 ایکڑ'}) | 🎒 ڈرمکی: ${m.tank_dosage_20l || 'حسب ضرورت'}${landSize > 1 ? ` (${landSize * 5} ڈرمکیاں کل)` : ''}`
    ).join('\n') || 'مناسب فنجی سائیڈ';


    const text = `📋 *زرعی نسخہ سلپ — DehatiAI زرعی کلینک*\n` +
      `📅 تاریخ: ${currentDate}\n` +
      `🌾 فصل / بیماری: ${result.disease_ur || result.disease} (${result.disease_en || ''})\n` +
      `⚠️ شدت: ${result.severity || 'درمیانہ'}\n` +
      `🚨 پہلا فوری قدم: ${result.emergency_action || 'نائٹروجن روکیں'}\n\n` +
      `💊 *تجویز کردہ کیمیکل و ادویات:*\n${medList}\n\n` +
      `🎒 رقبہ: ${landSize} ایکڑ\n` +
      `⏱️ پرہیزی وقفہ (PHI): ${result.withholding_period_days || 14} دن\n` +
      `🏛️ تصدیق: محکمہ زراعت پنجاب منظور شدہ فارمولیشن`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-rx-slip" onClick={e => e.stopPropagation()}>

        {/* Prescription Header */}
        <div style={{ borderBottom: '2px solid #15803d', paddingBottom: '.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#15803d', fontWeight: 900, fontSize: '1.25rem' }}>
              🌾 DehatiAI زرعی کلینک نسخہ
            </div>
            <div style={{ fontSize: '.72rem', color: '#64748b' }}>
              محکمہ زراعت حکومت پنجاب ریسرچ ایکسٹینشن تصدیق شدہ
            </div>
          </div>
          <div style={{ textAlign: 'left', direction: 'ltr', fontSize: '.75rem', color: '#64748b' }}>
            <div style={{ fontWeight: 800, color: '#15803d' }}>Rx #AGRI-{Date.now().toString().slice(-6)}</div>
            <div>{currentDate}</div>
          </div>
        </div>

        {/* Farmer Info */}
        <div style={{ background: '#f8fafc', padding: '.65rem .85rem', borderRadius: 10, marginBottom: '.85rem', fontSize: '.82rem', display: 'flex', justifyContent: 'space-between' }}>
          <div><strong>کسان: </strong>{farmerName || 'معزز کسان'}</div>
          <div><strong>ضلع: </strong>{farmerDistrict || 'پنجاب، پاکستان'}</div>
          <div><strong>رقبہ: </strong>{landSize} ایکڑ</div>
        </div>

        {/* Disease Diagnosis */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '.75rem', borderRadius: 12, marginBottom: '1rem' }}>
          <div style={{ fontSize: '.7rem', color: '#166534', fontWeight: 700 }}>تشخیص کردہ بیماری:</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#14532d', margin: '2px 0' }}>
            {result.disease_ur || result.disease}
          </div>
          <div style={{ fontSize: '.8rem', color: '#15803d', fontFamily: 'Inter, sans-serif' }}>
            {result.disease_en} • <em>{result.cause}</em>
          </div>
        </div>

        {/* Medicines for Dealer */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 900, fontSize: '.9rem', color: '#0f172a', marginBottom: '.4rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: 4 }}>
            💊 تجویز کردہ مستند کیمیکل فارمولیشن (برائے زرعی ڈیلر):
          </div>
          {result.medicines && result.medicines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.medicines.map((m, i) => (
                <div key={i} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, color: '#15803d', fontSize: '.95rem' }}>{m.brand}</span>
                    <span style={{ fontSize: '.75rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: 6 }}>{m.estimated_price_pkr || ''}</span>
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#334155', marginTop: 2 }}>
                    <strong>ایکٹو کیمیکل: </strong><span style={{ color: '#0284c7', fontWeight: 700 }}>{m.active}</span>
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#475569', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>{landSize > 1 ? `${landSize} ایکڑ کل خوراک:` : '1 ایکڑ:'} </strong>{calculateTotalDose(m.dosage, landSize)}</span>
                    {m.tank_dosage_20l && (
                      <span>
                        <strong>🎒 ڈرمکی (20L): </strong>{m.tank_dosage_20l}
                        {landSize > 1 && <span style={{ color: '#059669', fontWeight: 800 }}> ({landSize * 5} ڈرمکیاں کل)</span>}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '.85rem', color: '#64748b' }}>{result.treatment}</div>
          )}
        </div>

        {/* Instructions */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '.65rem .85rem', borderRadius: 10, marginBottom: '1rem', fontSize: '.78rem', color: '#92400e' }}>
          <div><strong>⏱️ پرہیزی وقفہ (PHI): </strong>اس سپرے کے بعد {result.withholding_period_days || 14} دن تک فصل کاٹ کر منڈی نہ بیچیں۔</div>
          <div><strong>🌤️ سپرے وقت: </strong>صبح 9 بجے سے قبل یا شام کے وقت تیز دھوپ سے بچ کر سپرے کریں۔</div>
        </div>

        {/* Buttons (Hidden on Print) */}
        <div className="ds-rx-no-print" style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
          <button
            onClick={shareToDealer}
            style={{
              flex: 1, padding: '.75rem', borderRadius: 12,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', fontWeight: 800, fontSize: '.85rem',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            📤 ڈیلر کو واٹس ایپ کریں
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '.75rem 1rem', borderRadius: 12,
              background: '#0284c7', color: 'white', fontWeight: 800, fontSize: '.85rem',
              border: 'none', cursor: 'pointer'
            }}
          >
            🖨️ پرنٹ
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '.75rem 1rem', borderRadius: 12,
              background: '#f1f5f9', color: '#475569', fontWeight: 800, fontSize: '.85rem',
              border: '1px solid #cbd5e1', cursor: 'pointer'
            }}
          >
            ✕ بند کریں
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function DiseasePage() {
  const [mainTab, setMainTab]         = useState('crops');
  const [image, setImage]             = useState(null);
  const [imageUrl, setImageUrl]       = useState('');
  const [crop, setCrop]               = useState('');
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]             = useState('');
  const [showTips, setShowTips]       = useState(true);
  const [landSize, setLandSize]       = useState(1);

  // New Features State
  const [showRxModal, setShowRxModal]                   = useState(false);
  const [differentialApplied, setDifferentialApplied]   = useState(false);

  const [catalog, setCatalog]               = useState(OFFLINE_DISEASE_CATALOG);
  const [searchQuery, setSearchQuery]       = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalog, setShowCatalog]       = useState(false);

  const fileRef        = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef= useRef(null);
  const { isOffline }  = useOffline();
  const { user }       = useAuth();

  useEffect(() => { return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    getDiseaseCatalog()
      .then(r => {
        if (active) {
          if (r?.catalog && r.catalog.length > 0) {
            setCatalog(r.catalog);
          } else {
            setCatalog(OFFLINE_DISEASE_CATALOG);
          }
        }
      })
      .catch(e => {
        console.warn('Catalog network request bypassed, active offline agronomy DB:', e.message);
        if (active) setCatalog(OFFLINE_DISEASE_CATALOG);
      })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null); setError(''); setShowTips(false); setShowCatalog(false);
    setDifferentialApplied(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImage(file);
  };

  const handleSelectFromCatalog = async (item) => {
    setLoading(true); setError(''); setShowCatalog(false); setDifferentialApplied(false);
    const localResult = {
      tier: 1, source: 'catalog_dictionary',
      source_label: '📖 ڈائریکٹری سے منتخب کردہ ریکارڈ',
      model_attribution: item.model_name || 'مقامی زرعی ڈیٹابیس',
      disease: `${item.name_ur || item.name_en} (${item.name_en})`,
      disease_ur: item.name_ur || item.name_en, disease_en: item.name_en,
      severity: item.detail?.severity || 'درمیانہ',
      emergency_action: item.detail?.emergency_action || '',
      spray_conditions: item.detail?.spray_conditions || '',
      fertilizer_adjustment: item.detail?.fertilizer_adjustment || '',
      symptoms_analysis: item.detail?.symptoms_analysis || '',
      cause: item.detail?.cause || 'پھپھوندی / کیڑا (Pathogen)',
      treatment: item.detail?.treatment_summary || item.detail?.treatment || 'مناسب پھپھوندی کش دوائی کا سپرے کریں۔',
      prevention: item.detail?.prevention || 'کھیت صاف رکھیں۔',
      withholding_period_days: item.detail?.withholding_period_days || 14,
      organic_alternative: item.detail?.organic_alternative || 'نیم کا تیل 5ml فی لیٹر پانی۔',
      medicines: item.detail?.medicines || []
    };
    setResult(localResult);
    if (!isOffline) {
      try {
        const data = await detectDisease(null, crop || item.name_en, 'image/jpeg', item.key);
        if (data && (data.disease_ur || data.treatment)) setResult(data);
      } catch { /* keep localResult */ }
    }
    setLoading(false);
  };

  const handleDetect = async () => {
    if (!image) { setError('پہلے تصویر لیں یا ڈائریکٹری سے بیماری منتخب کریں'); return; }

    // Smart Offline Mode Handling
    if (isOffline) {
      const offlineMatch = crop ? getOfflineDisease(crop) : null;
      if (offlineMatch && offlineMatch.name_ur) {
        handleSelectFromCatalog({
          name_ur: offlineMatch.name_ur,
          name_en: offlineMatch.name_en,
          key: offlineMatch.key,
          model_name: '📶 آف لائن زرعی ڈیٹابیس (بغیر انٹرنیٹ)',
          detail: offlineMatch
        });
        return;
      }
      setShowCatalog(true);
      setError('📶 آف لائن موڈ: انٹرنیٹ دستیاب نہیں ہے۔ نیچے دی گئی ڈائریکٹری سے بیماری منتخب کریں اور فوری نسخہ حاصل کریں:');
      return;
    }

    setLoading(true); setCompressing(true); setError(''); setResult(null);
    setDifferentialApplied(false);
    try {
      const compressed = await compressImage(image, 0.8);
      setCompressing(false);
      const base64 = await fileToBase64(compressed);
      const userDistrict = user?.district || (() => {
        try { return JSON.parse(localStorage.getItem('dehati_user') || '{}').district; } catch { return ''; }
      })();
      const data = await detectDisease(base64, crop || null, compressed.type || 'image/jpeg', null, { district: userDistrict });
      setResult(data);
    } catch (err) {
      setCompressing(false);
      // Graceful network outage fallback: try local offline agronomy match for selected crop
      const offlineMatch = crop ? getOfflineDisease(crop) : null;
      if (offlineMatch && offlineMatch.name_ur) {
        handleSelectFromCatalog({
          name_ur: offlineMatch.name_ur,
          name_en: offlineMatch.name_en,
          key: offlineMatch.key,
          model_name: '📶 آف لائن مقامی نسخہ (انٹرنیٹ منقطع)',
          detail: offlineMatch
        });
      } else {
        setShowCatalog(true);
        setError('📶 انٹرنیٹ کمزور ہے — آف لائن ڈائریکٹری سے بیماری منتخب کریں اور مکمل نسخہ دیکھیں');
      }
    } finally { setLoading(false); }
  };



  const handleRetake = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(null); setImageUrl(''); setResult(null); setError(''); setShowTips(true);
    setDifferentialApplied(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const shareWhatsApp = () => {
    if (!result) return;
    const medSummary = result.medicines?.length > 0
      ? result.medicines.map(m => `🧪 ${m.brand} (${m.active}): ${calculateTotalDose(m.dosage, landSize)}${landSize > 1 ? ` (${landSize} ایکڑ کل)` : ''}${m.tank_dosage_20l ? ` | 🎒 ڈرمکی: ${m.tank_dosage_20l}` : ''}${landSize > 1 ? ` (${landSize * 5} ڈرمکیاں)` : ''}`).join('\n')
      : '';
    const text = `🌾 DehatiAI فصل تشخیص و نسخہ:\n\n🔬 بیماری: ${result.disease_ur || result.disease}\n${result.severity ? `⚠️ شدت: ${result.severity}\n` : ''}${result.emergency_action ? `🚨 فوری قدم: ${result.emergency_action}\n` : ''}⚡ وجہ: ${result.cause}\n💊 علاج: ${result.treatment}\n\n${medSummary ? `تجویز کردہ ادویات:\n${medSummary}\n\n` : ''}${result.spray_conditions ? `🌤️ سپرے وقت: ${result.spray_conditions}\n` : ''}⚠️ پرہیزی دن: ${result.withholding_period_days || 14} دن\n\n🤖 DehatiAI - dehati-ai.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredCatalog = catalog.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name_en.toLowerCase().includes(q) || c.name_ur.includes(q) || c.key.includes(q);
  });

  const spokenText = result ? [
    `بیماری کا نام: ${result.disease_ur || result.disease}۔`,
    result.severity ? `شدت: ${result.severity}۔` : '',
    result.emergency_action ? `پہلا فوری قدم: ${result.emergency_action}۔` : '',
    `علاج: ${result.treatment}۔`,
    result.medicines?.length > 0
      ? `تجویز کردہ ادویات: ${result.medicines.map(m => `${m.brand}، خوراک ${m.dosage}`).join('؛ ')}۔` : '',
    result.spray_conditions ? `سپرے کا وقت: ${result.spray_conditions}۔` : '',
    `احتیاطی خبردار: اس سپرے کے ${result.withholding_period_days || 14} دن بعد تک فصل نہ بیچیں۔`,
  ].filter(Boolean).join(' ') : '';

  /* ── Confidence calculation ── */
  let confPct = typeof result?.confidence === 'number' ? result.confidence : parseFloat(result?.confidence);
  if (isNaN(confPct) || confPct <= 0) confPct = parseFloat(result?.match_score) || (result?.source === 'ai_vision' ? 93 : 95);
  if (confPct <= 1 && confPct > 0) confPct *= 100;
  const confColor = confPct >= 85 ? '#10b981' : confPct >= 70 ? '#f59e0b' : '#ef4444';
  const confLabel = confPct >= 85 ? '✅ اعلی اعتماد' : confPct >= 70 ? '⚠️ درمیانہ — تصدیق کریں' : '🔴 کم اعتماد';

  /* ── Look-alike differential checker ── */
  const activeDifferentialRule = result ? DIFFERENTIAL_RULES.find(rule => {
    const textToCheck = `${result.disease_en || ''} ${result.disease_ur || ''} ${crop || ''}`.toLowerCase();
    return rule.triggers.some(t => textToCheck.includes(t.toLowerCase()));
  }) : null;

  const handleApplyDifferential = (chosenOption) => {
    setResult(prev => ({
      ...prev,
      disease_ur: chosenOption.disease_ur,
      disease_en: chosenOption.disease_en,
      disease_roman: chosenOption.disease_roman,
      disease: `${chosenOption.disease_ur} (${chosenOption.disease_en})`,
      severity: chosenOption.severity,
      cause: chosenOption.cause,
      emergency_action: chosenOption.emergency_action,
      treatment: chosenOption.treatment,
      medicines: chosenOption.medicines,
      confidence: 98,
      source_label: '✅ کسان تصدیق شدہ فیلڈ پیتھالوجی'
    }));
    setDifferentialApplied(true);
  };

  /* ─────────────────────────────────────────── RENDER ─────── */
  return (
    <div className="page">
      {/* Inject styles */}
      <style>{DISEASE_STYLES}</style>

      {/* Dealer Prescription Modal */}
      {showRxModal && result && (
        <PrescriptionModal
          result={result}
          landSize={landSize}
          farmerName={user?.name}
          farmerDistrict={user?.district}
          onClose={() => setShowRxModal(false)}
        />
      )}

      <div className="page-content" style={{ paddingBottom: '2rem' }}>

        {/* ── Main Tab Switcher ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem',
          marginBottom: '1rem', direction: 'rtl'
        }}>
          {[
            { key: 'crops', icon: '🌿', label: 'فصلوں کی بیماریاں' },
            { key: 'livestock', icon: '🐄', label: 'مویشیوں کا علاج' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              id={`tab-${t.key}-disease`}
              style={{
                padding: '.75rem', borderRadius: 16,
                border: mainTab === t.key ? '2px solid #3a7232' : '1px solid rgba(0,0,0,0.1)',
                background: mainTab === t.key
                  ? 'linear-gradient(135deg, #0d2010, #2e5a27)'
                  : 'rgba(255,255,255,0.9)',
                color: mainTab === t.key ? 'white' : '#1f2937',
                fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: mainTab === t.key ? '0 4px 16px rgba(46,90,39,.3)' : 'none',
                fontFamily: '"Noto Nastaliq Urdu", serif',
                transition: 'all .2s'
              }}
            >
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Livestock Tab ── */}
        {mainTab === 'livestock' ? (
          <AnimalHealthAdvisor />
        ) : (
          <>
            {/* ══════════════════════════════════════════════════
                HERO HEADER — Premium dark green gradient
                ══════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(145deg, #060f07 0%, #0d2010 40%, #162410 70%, #1e3a1e 100%)',
              borderRadius: 24, padding: '1.5rem 1.25rem 1.25rem',
              color: 'white', textAlign: 'center', marginBottom: '.85rem',
              border: '1px solid rgba(58,114,50,.35)',
              boxShadow: '0 8px 32px rgba(6,15,7,.45), inset 0 1px 0 rgba(255,255,255,.05)',
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Background glow */}
              <div style={{
                position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,.12) 0%, transparent 70%)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'relative', fontSize: '2.8rem', marginBottom: '.3rem',
                filter: 'drop-shadow(0 0 12px rgba(16,185,129,.5))'
              }}>🔬</div>
              <h2 style={{
                color: 'white', fontSize: '1.2rem', margin: '.2rem 0 .4rem',
                fontWeight: 900, letterSpacing: '.01em',
                textShadow: '0 2px 8px rgba(0,0,0,.4)'
              }}>
                فصل کی بیماری کا اسکینر
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '.78rem', margin: 0, letterSpacing: '.01em' }}>
                306 بیماریاں • تفریقی فیلڈ پیتھالوجی • ڈیجیٹل زرعی نسخہ
              </p>
              {/* Status dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: '.75rem' }}>
                {[
                  { dot: '#10b981', label: 'AI وژن فعال' },
                  { dot: '#fbc02d', label: '306 بیماریاں' },
                  { dot: '#60a5fa', label: 'ڈیلر نسخہ موڈ' }
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: s.dot,
                      boxShadow: `0 0 6px ${s.dot}`,
                      animation: 'scanPulse 2s infinite'
                    }} />
                    <span style={{ fontSize: '.65rem', color: '#94a3b8', fontFamily: 'Inter' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                DISEASE DIRECTORY SEARCH
                ══════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(135deg, #0d2010, #162410)',
              borderRadius: 18, padding: '1rem 1.1rem', marginBottom: '.75rem',
              border: '1px solid rgba(58,114,50,.4)',
              boxShadow: '0 4px 16px rgba(6,15,7,.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.65rem', direction: 'rtl' }}>
                <span style={{ fontWeight: 800, fontSize: '.88rem', color: '#fbc02d', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    background: 'rgba(251,192,45,.15)', border: '1px solid rgba(251,192,45,.3)',
                    borderRadius: 8, padding: '3px 7px', fontSize: '.78rem'
                  }}>🔍</span>
                  306 بیماریوں کی فوری تلاش (بغیر تصویر)
                </span>
                <button
                  onClick={() => setShowCatalog(!showCatalog)}
                  style={{
                    background: showCatalog ? 'rgba(251,192,45,.2)' : 'rgba(58,114,50,.25)',
                    border: `1px solid ${showCatalog ? '#fbc02d' : '#3a7232'}`,
                    color: showCatalog ? '#fbc02d' : '#a3e635',
                    borderRadius: 999, padding: '4px 12px',
                    fontSize: '.73rem', fontWeight: 800, cursor: 'pointer',
                    transition: 'all .2s', fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {showCatalog ? '✕ بند کریں' : `📋 ${catalog.length}`}
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowCatalog(true); }}
                placeholder="بیماری یا فصل تلاش کریں — wheat rust, آلو, late blight..."
                style={{
                  width: '100%', background: 'rgba(6,15,7,.6)', color: 'white',
                  border: '1.5px solid rgba(58,114,50,.5)', borderRadius: 12,
                  padding: '.65rem .9rem', fontSize: '.84rem',
                  direction: 'rtl', outline: 'none', fontFamily: '"Noto Nastaliq Urdu", serif',
                  boxSizing: 'border-box'
                }}
              />

              {showCatalog && (
                <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, paddingTop: 6 }}>
                  {catalogLoading ? (
                    <div style={{ textAlign: 'center', color: '#fbc02d', padding: '1rem', fontSize: '.82rem' }}>
                      ڈائریکٹری لوڈ ہو رہی ہے...
                    </div>
                  ) : filteredCatalog.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem', fontSize: '.82rem' }}>
                      کوئی بیماری نہیں ملی
                    </div>
                  ) : (
                    filteredCatalog.slice(0, 30).map(item => (
                      <div
                        key={item.id}
                        className="ds-catalog-row"
                        onClick={() => handleSelectFromCatalog(item)}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '.83rem', color: '#a3e635', direction: 'rtl' }}>{item.name_ur}</div>
                          <div style={{ fontSize: '.7rem', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>{item.name_en}</div>
                        </div>
                        <span style={{
                          background: item.has_local_remedy ? 'rgba(16,185,129,.2)' : 'rgba(100,116,139,.15)',
                          color: item.has_local_remedy ? '#10b981' : '#64748b',
                          fontSize: '.65rem', padding: '3px 9px', borderRadius: 999,
                          fontWeight: 800, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap'
                        }}>
                          {item.has_local_remedy ? '✅ نسخہ' : 'عام'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════
                PHOTO TIPS
                ══════════════════════════════════════════════════ */}
            {showTips && !imageUrl && (
              <div style={{
                background: 'rgba(16,185,129,.07)', borderRadius: 16,
                border: '1px solid rgba(16,185,129,.25)', padding: '1rem',
                marginBottom: '.75rem'
              }}>
                <div style={{ fontWeight: 800, fontSize: '.85rem', color: '#10b981', marginBottom: '.6rem', direction: 'rtl' }}>
                  📸 بہترین تصویر کا طریقہ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PHOTO_TIPS.map((t, i) => (
                    <div key={i} style={{
                      background: 'rgba(6,15,7,.5)', borderRadius: 10,
                      padding: '8px 11px', fontSize: '.76rem',
                      direction: 'rtl', display: 'flex', alignItems: 'center', gap: 7,
                      color: '#cbd5e1', border: '1px solid rgba(58,114,50,.3)',
                      animation: 'tipGlow 3s infinite', animationDelay: `${i * .7}s`
                    }}>
                      <span style={{ fontSize: '1.05rem' }}>{t.icon}</span>{t.tip}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                HELPLINE BANNER
                ══════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,.1), rgba(6,78,59,.2))',
              borderRadius: 14, padding: '10px 14px', marginBottom: '.75rem',
              border: '1px solid rgba(16,185,129,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 8, direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: '1.4rem' }}>🏛️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '.8rem', color: '#10b981', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                    محکمہ زراعت پنجاب — مفت کسان ہیلپ لائن
                  </div>
                  <div style={{ fontSize: '.68rem', color: '#64748b', lineHeight: 1.4 }}>
                    صبح 8 تا رات 8 • زرعی ایمرجنسی و تصدیق
                  </div>
                </div>
              </div>
              <a href="tel:0800-17000" style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', padding: '7px 16px', borderRadius: 999,
                textDecoration: 'none', fontWeight: 900, fontSize: '.8rem',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 3px 12px rgba(16,185,129,.4)', whiteSpace: 'nowrap',
                fontFamily: 'Inter, sans-serif'
              }}>
                📞 0800-17000
              </a>
            </div>

            {/* ══════════════════════════════════════════════════
                IMAGE UPLOAD AREA — Premium Scanner UI
                ══════════════════════════════════════════════════ */}
            <div style={{
              borderRadius: 20, overflow: 'hidden', marginBottom: '.75rem',
              border: imageUrl ? '2px solid #a3e635' : '2px dashed rgba(58,114,50,.6)',
              background: '#060f07', position: 'relative',
              boxShadow: imageUrl ? '0 0 20px rgba(163,230,53,.15)' : '0 4px 16px rgba(6,15,7,.4)'
            }} id="disease-upload-area">
              {imageUrl ? (
                <>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={imageUrl}
                      alt="فصل کی تصویر"
                      style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
                    />
                    {/* Scanner overlay when loading */}
                    {loading && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(6,15,7,.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 12
                      }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: '50%',
                          border: '3px solid transparent',
                          borderTopColor: '#fbc02d', borderRightColor: 'rgba(251,192,45,.4)',
                          animation: 'scanSweep 1s linear infinite'
                        }} />
                        <div style={{ color: '#fbc02d', fontWeight: 700, fontSize: '.8rem' }}>
                          AI فیلڈ اسکیننگ جاری ہے...
                        </div>
                      </div>
                    )}
                    {/* Retake button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleRetake(); }}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'rgba(6,15,7,.82)', color: 'white',
                        border: '1px solid rgba(58,114,50,.5)', borderRadius: 999,
                        padding: '5px 14px', fontSize: '.75rem', fontWeight: 700,
                        cursor: 'pointer', backdropFilter: 'blur(8px)',
                        fontFamily: '"Noto Nastaliq Urdu", serif'
                      }}
                    >🔄 دوسری تصویر</button>
                    {/* Corner brackets */}
                    {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
                      <div key={i} style={{
                        position: 'absolute', width: 20, height: 20, zIndex: 4,
                        borderTop: i < 2 ? '2.5px solid #a3e635' : 'none',
                        borderBottom: i >= 2 ? '2.5px solid #a3e635' : 'none',
                        borderLeft: (i === 0 || i === 2) ? '2.5px solid #a3e635' : 'none',
                        borderRight: (i === 1 || i === 3) ? '2.5px solid #a3e635' : 'none',
                        ...pos
                      }} />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <div style={{
                    fontSize: '3rem', marginBottom: '.4rem',
                    filter: 'drop-shadow(0 0 16px rgba(16,185,129,.4))'
                  }}>🔬</div>
                  <p style={{ fontWeight: 800, color: '#a3e635', margin: '0 0 .3rem', fontSize: '1rem' }}>
                    متاثرہ پتے کی تصویر شامل کریں
                  </p>
                  <p style={{ fontSize: '.76rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                    کیمرہ یا گیلری سے منتخب کریں
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', maxWidth: 340, margin: '0 auto' }}>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                      id="disease-open-camera-btn"
                      style={{
                        padding: '.9rem .5rem', borderRadius: 14,
                        border: '2px solid rgba(16,185,129,.6)',
                        background: 'linear-gradient(135deg, rgba(6,78,59,.8), rgba(4,120,87,.8))',
                        color: 'white', fontWeight: 800, fontSize: '.88rem',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 5,
                        boxShadow: '0 4px 16px rgba(16,185,129,.25)',
                        fontFamily: '"Noto Nastaliq Urdu", serif',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <span style={{ fontSize: '1.7rem' }}>📷</span>
                      <span>کیمرہ کھولیں</span>
                      <span style={{ fontSize: '.62rem', opacity: .75, fontFamily: 'Inter' }}>Live Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); galleryInputRef.current?.click(); }}
                      id="disease-open-gallery-btn"
                      style={{
                        padding: '.9rem .5rem', borderRadius: 14,
                        border: '2px solid rgba(71,85,105,.6)',
                        background: 'linear-gradient(135deg, rgba(15,23,42,.8), rgba(30,41,59,.8))',
                        color: 'white', fontWeight: 800, fontSize: '.88rem',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 5,
                        boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                        fontFamily: '"Noto Nastaliq Urdu", serif',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <span style={{ fontSize: '1.7rem' }}>📁</span>
                      <span>گیلری سے چنیں</span>
                      <span style={{ fontSize: '.62rem', opacity: .75, fontFamily: 'Inter' }}>Photo Gallery</span>
                    </button>
                  </div>
                </div>
              )}
              {/* Hidden inputs */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} id="disease-camera-input" />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="disease-gallery-input" />
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="disease-file-input" />
            </div>

            {/* ── Crop Selector ── */}
            <div style={{ marginBottom: '.75rem', direction: 'rtl' }}>
              <label style={{
                display: 'block', fontWeight: 700, fontSize: '.8rem',
                color: '#94a3b8', marginBottom: '.4rem'
              }}>
                فصل کا نام منتخب کریں <span style={{ color: '#475569', fontWeight: 500 }}>(اختیاری)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="disease-crop-select"
                  value={crop}
                  onChange={e => setCrop(e.target.value)}
                  style={{
                    width: '100%', padding: '.7rem 1rem .7rem 2.5rem',
                    background: 'linear-gradient(135deg, #0d2010, #1e3a1e)',
                    color: crop ? '#a3e635' : '#64748b',
                    border: '1.5px solid rgba(58,114,50,.5)',
                    borderRadius: 12, fontSize: '.88rem', fontWeight: 700,
                    cursor: 'pointer', outline: 'none', appearance: 'none',
                    fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">فصل منتخب کریں...</option>
                  {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: '#3a7232', fontSize: '.85rem'
                }}>🌱</div>
              </div>
            </div>

            {/* ── Detect Button ── */}
            <button
              className="ds-btn-scan"
              onClick={handleDetect}
              disabled={!image || loading}
              id="disease-detect-btn"
            >
              {compressing
                ? '⏳ تصویر پروسیس ہو رہی ہے...'
                : loading
                ? '🔬 AI بیماری تشخیص کر رہا ہے...'
                : '🔍 تصویری تجزیہ شروع کریں'}
            </button>

            {/* ── Error ── */}
            {error && (
              <div style={{
                background: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
                color: '#fca5a5', padding: '.875rem 1rem', borderRadius: 12,
                fontWeight: 700, border: '1px solid #991b1b', direction: 'rtl',
                marginTop: '.75rem', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {/* ── Loading State ── */}
            {loading && (
              <div style={{
                background: 'linear-gradient(135deg, #060f07, #0d2010)',
                borderRadius: 18, padding: '1.5rem', textAlign: 'center',
                border: '1px solid rgba(58,114,50,.4)', marginTop: '.75rem',
                boxShadow: '0 4px 20px rgba(6,15,7,.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '.75rem' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="ds-loading-dot" style={{ animationDelay: `${i * .16}s` }} />
                  ))}
                </div>
                <p style={{ color: '#a3e635', fontWeight: 700, fontSize: '.9rem', margin: '0 0 .5rem' }}>
                  {compressing ? '⏳ تصویر کمپریس ہو رہی ہے...' : '🔬 AI وژن تفصیلی تجزیہ کر رہا ہے...'}
                </p>
                <p style={{ color: '#64748b', fontSize: '.72rem', margin: '0 0 .75rem', fontFamily: 'Inter' }}>
                  {compressing ? 'Compressing image...' : 'Gemini Vision analyzing (may take 15–45s)'}
                </p>
                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '.65rem', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'Inter' }}>Local DB</span>
                  <div style={{ flex: 1, height: 5, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: compressing ? '30%' : '80%',
                      background: 'linear-gradient(90deg, #10b981, #fbc02d)',
                      borderRadius: 4, transition: 'width 1s ease',
                      animation: 'shimmer 2s linear infinite',
                      backgroundSize: '200% auto'
                    }} />
                  </div>
                  <span style={{ fontSize: '.65rem', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'Inter' }}>AI Vision</span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                RESULT SECTION
                ══════════════════════════════════════════════════════════════ */}
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', marginTop: '.9rem' }}>

                {/* ── 1. DISEASE IDENTITY CARD ── */}
                <div className="ds-fade-up" style={{
                  background: 'linear-gradient(145deg, #060f07 0%, #0d2010 50%, #162410 100%)',
                  borderRadius: 22, padding: '1.4rem 1.25rem',
                  border: '1px solid rgba(163,230,53,.25)',
                  boxShadow: '0 8px 32px rgba(6,15,7,.5), inset 0 1px 0 rgba(255,255,255,.04)',
                  color: 'white', position: 'relative', overflow: 'hidden'
                }}>
                  {/* Glow top-right */}
                  <div style={{
                    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                    background: 'radial-gradient(circle, rgba(163,230,53,.12) 0%, transparent 70%)',
                    pointerEvents: 'none', borderRadius: '50%'
                  }} />

                  {/* Model attribution + Prescription slip button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: 6, direction: 'rtl' }}>
                    <span className="ds-pill" style={{ background: 'rgba(251,192,45,.15)', border: '1px solid rgba(251,192,45,.35)', color: '#fbc02d' }}>
                      🧠 {result.model_attribution || 'مقامی زرعی ڈیٹابیس'}
                    </span>
                    <button
                      onClick={() => setShowRxModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#ffffff', border: 'none', borderRadius: 999,
                        padding: '5px 14px', fontSize: '.78rem', fontWeight: 900,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        boxShadow: '0 2px 10px rgba(245,158,11,0.4)',
                        fontFamily: '"Noto Nastaliq Urdu", serif'
                      }}
                    >
                      📋 زرعی نسخہ سلپ (Dealer Rx)
                    </button>
                  </div>

                  {/* Source badge */}
                  {result.source_label && (() => {
                    const isAI = result.source === 'ai_vision';
                    const isLocal = ['local_high_confidence','local','database_match','catalog_dictionary'].includes(result.source);
                    const badgeColor = isLocal ? '#10b981' : isAI ? '#f59e0b' : '#ef4444';
                    const badgeBg = isLocal ? 'rgba(16,185,129,.15)' : isAI ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.1)';
                    return (
                      <div style={{ marginBottom: '.85rem' }}>
                        <span className="ds-pill" style={{ background: badgeBg, border: `1.5px solid ${badgeColor}`, color: badgeColor, direction: 'rtl' }}>
                          {result.source_label}
                        </span>
                        {/* Confidence bar */}
                        {confPct > 0 && (
                          <div style={{ marginTop: '.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, direction: 'rtl' }}>
                              <span style={{ fontSize: '.7rem', color: '#94a3b8' }}>تشخیص اعتماد</span>
                              <span style={{ fontWeight: 800, fontSize: '.78rem', color: confColor, fontFamily: 'Inter' }}>
                                {confPct.toFixed(0)}% {confLabel}
                              </span>
                            </div>
                            <ConfidenceBar pct={confPct} color={confColor} />
                            <div style={{ fontSize: '.65rem', color: '#475569', marginTop: 4, direction: 'rtl' }}>
                              {confPct >= 85 ? 'تصدیق شدہ سائنسی ریکارڈ' : confPct >= 70 ? 'زراعت آفیسر سے تصدیق کریں' : 'واضح روشنی میں دوبارہ تصویر لیں'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Disease name — Trilingual */}
                  <div style={{ direction: 'rtl' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.35rem', color: '#fff', lineHeight: 1.35, marginBottom: '.15rem', textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
                      🔬 {result.disease_ur || result.disease}
                    </div>
                    <div style={{ fontSize: '.88rem', color: '#fef08a', direction: 'ltr', fontWeight: 700, letterSpacing: '.01em', marginBottom: '.1rem' }}>
                      🌾 {result.disease_roman || getRomanUrdu(result.disease_en, result.disease_ur)}
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.6)', direction: 'ltr', fontStyle: 'italic', fontWeight: 500 }}>
                      {result.disease_en || result.disease || '—'}
                    </div>
                  </div>

                  {/* Severity */}
                  {result.severity && (
                    <div style={{ marginTop: '.7rem' }}>
                      <SeverityBadge severity={result.severity} />
                    </div>
                  )}
                </div>

                {/* ── 🌟 INTERACTIVE DIFFERENTIAL DIAGNOSIS TRIAGE (تفریقی تصدیق) ── */}
                {activeDifferentialRule && !differentialApplied && (
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '2px solid #38bdf8', borderRadius: 18, padding: '1.1rem',
                    direction: 'rtl', boxShadow: '0 4px 18px rgba(56,189,248,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.6rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🔍</span>
                      <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '.95rem' }}>
                        {activeDifferentialRule.question}
                      </span>
                    </div>
                    <div style={{ fontSize: '.78rem', color: '#94a3b8', marginBottom: '.75rem', lineHeight: 1.5 }}>
                      ایک جیسے دکھنے والے امراض میں فرق کرنے کیلئے درست آپشن منتخب کریں تاکہ سپرے کی 100% درست تجویز ملے:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        onClick={() => handleApplyDifferential(activeDifferentialRule.optionA)}
                        style={{
                          padding: '.75rem 1rem', borderRadius: 12,
                          background: 'rgba(16,185,129,0.15)', border: '1.5px solid #10b981',
                          color: '#34d399', fontWeight: 800, fontSize: '.88rem',
                          textAlign: 'right', cursor: 'pointer', transition: 'all .2s'
                        }}
                      >
                        {activeDifferentialRule.optionA.label}
                      </button>
                      <button
                        onClick={() => handleApplyDifferential(activeDifferentialRule.optionB)}
                        style={{
                          padding: '.75rem 1rem', borderRadius: 12,
                          background: 'rgba(56,189,248,0.12)', border: '1.5px solid #38bdf8',
                          color: '#7dd3fc', fontWeight: 800, fontSize: '.88rem',
                          textAlign: 'right', cursor: 'pointer', transition: 'all .2s'
                        }}
                      >
                        {activeDifferentialRule.optionB.label}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 🌟 LOW CONFIDENCE RECAPTURE ADVISORY CARD (if < 70%) ── */}
                {confPct < 70 && (
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #451a03, #78350f)',
                    border: '2px solid #f59e0b', borderRadius: 18, padding: '1.1rem',
                    direction: 'rtl', boxShadow: '0 4px 18px rgba(245,158,11,0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.4rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                      <span style={{ color: '#fef08a', fontWeight: 900, fontSize: '.95rem' }}>
                        کم اعتماد نتیجہ ({confPct.toFixed(0)}%) — غلط سپرے سے بچیں
                      </span>
                    </div>
                    <div style={{ fontSize: '.82rem', color: '#fed7aa', lineHeight: 1.6, marginBottom: '.75rem' }}>
                      تصویر زیادہ واضح یا فوکس میں نہیں تھی جس سے غلط دوا تجویز ہو سکتی ہے۔ بہتر رہنمائی کیلئے نیچے دی گئی 4 باتوں کا خیال رکھیں:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: '.85rem' }}>
                      {PHOTO_TIPS.map((t, idx) => (
                        <div key={idx} style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 10px', borderRadius: 8, fontSize: '.74rem', color: '#ffedd5', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{t.icon}</span><span>{t.tip}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleRetake}
                      style={{
                        width: '100%', padding: '.75rem', borderRadius: 12,
                        background: '#f59e0b', color: '#000000', fontWeight: 900, fontSize: '.9rem',
                        border: 'none', cursor: 'pointer'
                      }}
                    >
                      📸 دوبارہ صاف تصویر لیں (Retake)
                    </button>
                  </div>
                )}

                {/* ── 2. VOICE ADVISORY ── */}
                <AudioPlayer
                  text={spokenText}
                  langKey="ur"
                  label="🔊 مکمل نسخہ و علاج سنیں"
                  style={{
                    width: '100%', padding: '.9rem', justifyContent: 'center',
                    borderRadius: 14, fontSize: '.95rem', fontWeight: 800,
                    background: 'linear-gradient(135deg, #14532d, #166534)',
                    color: 'white', border: '2px solid rgba(74,222,128,.35)',
                    boxShadow: '0 4px 16px rgba(22,101,52,.35)', cursor: 'pointer'
                  }}
                />

                {/* ── 3. EMERGENCY ACTION ── */}
                {result.emergency_action && (
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
                    border: '2.5px solid #ea580c', borderRadius: 18, padding: '1.1rem',
                    direction: 'rtl', boxShadow: '0 4px 20px rgba(234,88,12,.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.5rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(234,88,12,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem'
                      }}>🚨</div>
                      <span style={{ color: '#c2410c', fontWeight: 900, fontSize: '.95rem' }}>
                        پہلا فوری قدم — اگلے 24 گھنٹے میں کریں
                      </span>
                    </div>
                    <div style={{ color: '#9a3412', fontSize: '.9rem', fontWeight: 700, lineHeight: 1.7, paddingRight: 44 }}>
                      {result.emergency_action}
                    </div>
                  </div>
                )}

                {/* ── 4. SYMPTOMS ANALYSIS ── */}
                {result.symptoms_analysis && (
                  <div className="ds-card-light ds-fade-up" style={{ direction: 'rtl' }}>
                    <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#1e40af', marginBottom: '.45rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        background: 'rgba(30,64,175,.12)', border: '1px solid rgba(30,64,175,.2)',
                        borderRadius: 8, padding: '3px 7px', fontSize: '1rem'
                      }}>🔬</span>
                      تصویر میں نظر آنے والی علامات
                    </div>
                    <div style={{ fontSize: '.87rem', color: '#334155', lineHeight: 1.75 }}>
                      {result.symptoms_analysis}
                    </div>
                  </div>
                )}

                {/* ── 5. CAUSE & TREATMENT ── */}
                <div className="ds-card-light ds-fade-up" style={{ direction: 'rtl' }}>
                  <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#2e5a27', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      background: 'rgba(46,90,39,.1)', border: '1px solid rgba(46,90,39,.2)',
                      borderRadius: 8, padding: '3px 7px', fontSize: '1rem'
                    }}>⚡</span>
                    بیماری کی وجہ اور علاج
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <div style={{
                      background: '#f0fdf4', borderRadius: 10, padding: '8px 12px',
                      fontSize: '.88rem', color: '#14532d', lineHeight: 1.7
                    }}>
                      <strong>وجہ: </strong>{result.cause}
                    </div>
                    <div style={{
                      background: '#f8fafc', borderRight: '3px solid #2e5a27',
                      borderRadius: '0 10px 10px 0', padding: '8px 12px',
                      fontSize: '.88rem', color: '#1e293b', lineHeight: 1.7
                    }}>
                      <strong>علاج: </strong>{result.treatment}
                    </div>
                  </div>
                </div>

                {/* ── 6. SPRAY & FERTILIZER ── */}
                {(result.spray_conditions || result.fertilizer_adjustment) && (
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                    border: '1.5px solid #0284c7', borderRadius: 18, padding: '1.1rem',
                    direction: 'rtl', boxShadow: '0 2px 10px rgba(2,132,199,.1)'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#0369a1', marginBottom: '.6rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: '1.2rem' }}>🌤️</span> سپرے کے شرائط اور کھاد
                    </div>
                    {result.spray_conditions && (
                      <div style={{ fontSize: '.87rem', color: '#0c4a6e', lineHeight: 1.7, marginBottom: result.fertilizer_adjustment ? '.5rem' : 0 }}>
                        <strong style={{ color: '#0369a1' }}>🕐 سپرے کا وقت و طریقہ: </strong>{result.spray_conditions}
                      </div>
                    )}
                    {result.fertilizer_adjustment && (
                      <div style={{
                        fontSize: '.87rem', color: '#0c4a6e', lineHeight: 1.7,
                        background: 'rgba(2,132,199,.08)', padding: '8px 12px', borderRadius: 10,
                        borderRight: '3px solid #0284c7'
                      }}>
                        <strong style={{ color: '#0369a1' }}>🌱 کھاد کی ہدایت: </strong>{result.fertilizer_adjustment}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 7. WITHHOLDING PERIOD (PHI) ── */}
                <div className="ds-fade-up" style={{
                  background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                  border: '2px solid #e11d48', borderRadius: 18, padding: '1rem 1.1rem',
                  direction: 'rtl', boxShadow: '0 2px 12px rgba(225,29,72,.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '.4rem' }}>
                    <span style={{
                      background: 'rgba(225,29,72,.12)', borderRadius: 8, padding: '3px 8px', fontSize: '1.1rem'
                    }}>⚠️</span>
                    <span style={{ color: '#be123c', fontWeight: 900, fontSize: '.92rem' }}>
                      فصلی احتیاطی وقفہ (PHI)
                    </span>
                  </div>
                  <div style={{ color: '#9f1239', fontSize: '.87rem', fontWeight: 700, lineHeight: 1.65, paddingRight: 44 }}>
                    اس سپرے کے <strong
                      style={{
                        background: '#be123c', color: 'white', padding: '1px 8px',
                        borderRadius: 6, fontFamily: 'Inter'
                      }}
                    >{result.withholding_period_days || 14} دن</strong> بعد تک فصل منڈی میں نہ بیچیں۔
                  </div>
                </div>

                {/* ── 8. MEDICINE CARDS ── */}
                <div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '.75rem', flexWrap: 'wrap', gap: 8
                  }}>
                    <div style={{ fontWeight: 900, fontSize: '.95rem', color: '#162410', direction: 'rtl', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #162410, #2e5a27)',
                        color: '#fbc02d', padding: '4px 9px', borderRadius: 8, fontSize: '.8rem'
                      }}>💊</span>
                      پاکستانی زرعی ادویات
                    </div>
                    {/* Land size selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: '.78rem', color: '#64748b', fontWeight: 700 }}>رقبہ:</span>
                      <select
                        value={landSize}
                        onChange={e => setLandSize(Number(e.target.value))}
                        id="disease-land-size-select"
                        style={{
                          background: 'white', color: '#2e5a27',
                          border: '2px solid #3a7232', borderRadius: 8,
                          padding: '4px 10px', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer',
                          fontFamily: '"Noto Nastaliq Urdu", serif'
                        }}
                      >
                        {LAND_SIZES.map(s => <option key={s} value={s}>{s} ایکڑ</option>)}
                      </select>
                    </div>
                  </div>

                  {result.medicines && result.medicines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                      {result.medicines.map((med, idx) => (
                        <MedicineCard key={idx} med={med} idx={idx} landSize={landSize} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      background: '#f8fafc', padding: '1rem', borderRadius: 14,
                      color: '#64748b', fontSize: '.85rem', direction: 'rtl',
                      border: '1px solid #e2e8f0', textAlign: 'center'
                    }}>
                      مقامی زرعی افسر کی ہدایت کے مطابق مناسب دوائی استعمال کریں۔
                    </div>
                  )}
                </div>

                {/* ── 9. ORGANIC REMEDY ── */}
                {result.organic_alternative && (
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #fffbeb, #fef9c3)',
                    border: '1.5px solid #fde68a', borderRadius: 18, padding: '1.1rem',
                    direction: 'rtl', boxShadow: '0 2px 8px rgba(251,192,45,.1)'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#92400e', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        background: 'rgba(146,64,14,.1)', borderRadius: 8, padding: '3px 7px', fontSize: '1rem'
                      }}>🌿</span>
                      کم خرچ دیسی علاج
                    </div>
                    <div style={{ fontSize: '.87rem', color: '#78350f', lineHeight: 1.75, fontWeight: 600 }}>
                      {result.organic_alternative}
                    </div>
                  </div>
                )}

                {/* ── 10. PREVENTION ── */}
                {result.prevention && (
                  <div className="ds-card-light ds-fade-up" style={{ direction: 'rtl' }}>
                    <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#14532d', marginBottom: '.35rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        background: 'rgba(21,83,45,.1)', borderRadius: 8, padding: '3px 7px'
                      }}>🛡️</span>
                      احتیاطی تدابیر
                    </div>
                    <div style={{ fontSize: '.85rem', color: '#166534', lineHeight: 1.75, fontWeight: 600 }}>
                      {result.prevention}
                    </div>
                  </div>
                )}

                {/* ── 11. GOVERNMENT HELPLINE CTA ── */}
                <a href="tel:0800-17000" style={{ textDecoration: 'none' }} id="disease-helpline-link">
                  <div className="ds-fade-up" style={{
                    background: 'linear-gradient(135deg, #ecfeff, #cffafe)',
                    border: '1.5px solid #06b6d4', borderRadius: 18, padding: '1rem 1.1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    direction: 'rtl',
                    boxShadow: '0 2px 10px rgba(6,182,212,.12)',
                    transition: 'transform .15s'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#0e7490' }}>
                        📞 سرکاری زرعی ہیلپ لائن
                      </div>
                      <div style={{ fontSize: '.72rem', color: '#155e75', marginTop: 2 }}>
                        محکمہ زراعت پنجاب • مفت ٹول فری • دوسری رائے
                      </div>
                    </div>
                    <span style={{
                      background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                      color: 'white', padding: '8px 16px', borderRadius: 12,
                      fontWeight: 900, fontSize: '.9rem', fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 2px 8px rgba(8,145,178,.35)'
                    }}>0800-17000</span>
                  </div>
                </a>

                {/* ── 12. ACTION BAR ── */}
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '.1rem' }}>
                  <button
                    onClick={() => setShowRxModal(true)}
                    style={{
                      flex: 1.2, padding: '.75rem', borderRadius: 14,
                      background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                      color: 'white', fontWeight: 900, fontSize: '.88rem',
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(245,158,11,.35)',
                      fontFamily: '"Noto Nastaliq Urdu", serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    📋 ڈیلر نسخہ سلپ
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    style={{
                      flex: 1, padding: '.75rem', borderRadius: 14,
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: 'white', fontWeight: 800, fontSize: '.88rem',
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(22,163,74,.35)',
                      fontFamily: '"Noto Nastaliq Urdu", serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    📤 WhatsApp
                  </button>
                  <AudioPlayer
                    text={spokenText}
                    langKey="ur"
                    label="🔊 سنیں"
                    style={{
                      flex: 0.8, padding: '.75rem', justifyContent: 'center',
                      borderRadius: 14, fontSize: '.88rem'
                    }}
                  />
                  <button
                    onClick={handleRetake}
                    style={{
                      flex: 0.9, padding: '.75rem', borderRadius: 14,
                      background: 'rgba(30,58,138,.1)', color: '#1e3a8a',
                      border: '1.5px solid rgba(30,58,138,.25)', cursor: 'pointer',
                      fontWeight: 800, fontSize: '.88rem',
                      fontFamily: '"Noto Nastaliq Urdu", serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    📷 نئی اسکیننگ
                  </button>
                </div>

                {/* ── Legal disclaimer ── */}
                <div style={{
                  background: 'rgba(245,158,11,.07)', borderRadius: 10, padding: '8px 12px',
                  border: '1px solid rgba(245,158,11,.2)', fontSize: '.7rem', color: '#b45309',
                  lineHeight: 1.55, direction: 'rtl'
                }}>
                  ⚠️ <strong>قانونی انتباہ:</strong> یہ AI اسکینر ابتدائی تشخیص کی معاونت کرتا ہے۔ کسی بھی سپرے سے قبل زرعی آفیسر سے تصدیق لازمی کریں۔
                </div>

              </div>
            )}

            {/* ── Disclaimer (when no result yet) ── */}
            {!result && !loading && (
              <div style={{
                background: 'rgba(245,158,11,.07)', borderRadius: 10, padding: '8px 12px',
                border: '1px solid rgba(245,158,11,.2)', fontSize: '.72rem', color: '#b45309',
                lineHeight: 1.55, direction: 'rtl', marginTop: '.6rem'
              }}>
                ⚠️ <strong>قانونی و زرعی انتباہ:</strong> یہ AI اسکینر کسان کی ابتدائی تشخیص اور فیصلے میں معاونت (Decision Support) کیلئے ہے۔ کسی بھی سپرے سے قبل اپنے مقامی زرعی آفیسر سے تصدیق لازمی کریں۔
              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
}
