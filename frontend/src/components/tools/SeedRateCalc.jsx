import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

// ─── Punjab Seed Corporation (PSC) & FSC&RD Certified Varieties (2024–2026) ───
const CERTIFIED_VARIETIES = {
  'گندم': {
    icon: '🌾',
    unit: 'کلوگرام',
    cropLabel: 'گندم (Wheat)',
    timingLabel: 'بوائی کا وقت',
    timings: [
      { id: 'optimal', label: 'بروقت (1 تا 20 نومبر)', drillRate: 42, broadRate: 48, penalty: null, penaltyText: '✅ بہترین پیداواری صلاحیت — کوئی کٹوتی نہیں' },
      { id: 'late',    label: 'پچھیتی (21 نومبر تا 10 دسمبر)', drillRate: 60, broadRate: 65, penalty: '15-20%', penaltyText: '⚠️ 20 نومبر کے بعد ہر دن تاخیر پر 1% پیداوار کم (15-20 کلو فی ایکڑ روزانہ نقصان)' },
      { id: 'extreme', label: 'انتہائی پچھیتی (11 تا 31 دسمبر)', drillRate: 68, broadRate: 72, penalty: '30-50%', penaltyText: '⛔ سخت پیداواری نقصان (30% تا 50% تک کمی) — بیج کی مقدار 68 تا 72 کلو رکھیں' },
    ],
    varieties: [
      { name: 'دلکش-20 (Dilkash-20/21)', org: 'AARI فیصل آباد', yield: '50–60+ من/ایکڑ', maturity: '120–125 دن', notes: 'پنجاب کی سب سے زیادہ اگائی جانے والی میگا ورائٹی، زرد زنگ سے مکمل محفوظ، شاندار جھاڑ' },
      { name: 'اکبر-19 (Akbar-19)', org: 'AARI فیصل آباد', yield: '45–55 من/ایکڑ', maturity: '120–125 دن', notes: 'زنک اور آئرن سے بھرپور، براؤن و یلو زنگ کیخلاف انتہائی مزاحم، وسطی و جنوبی پنجاب' },
      { name: 'عروج-22 (Urooj-22)', org: 'پنجاب سیڈ کارپوریشن', yield: '48–56 من/ایکڑ', maturity: '120–125 دن', notes: 'PSC کی نئی منظور شدہ ورائٹی، لمبے سٹے، شاندار گرنے سے بچاؤ کی صلاحیت' },
      { name: 'سبحانی-21 (Subhani-21)', org: 'AARI فیصل آباد', yield: '45–55 من/ایکڑ', maturity: '120–125 دن', notes: 'گہرے سبز چوڑے پتے، موٹا چمکدار دانہ، درمیانی و پچھیتی بوائی کیلئے بہترین' },
      { name: 'فخر بھکر (Fakhar-e-Bhakkar)', org: 'AZRI بھکر / AARI', yield: '45–55 من/ایکڑ', maturity: '115–120 دن', notes: 'جنوبی پنجاب اور تھل کے علاقوں (بھکر، لیہ، مظفرگڑھ) کیلئے خشک سالی اور گرمی برداشت' },
      { name: 'غازی-19 (Ghazi-19)', org: 'AARI فیصل آباد', yield: '45–52 من/ایکڑ', maturity: '120–125 دن', notes: 'مضبوط تنا — آندھی اور بارش میں گرنے کے خلاف لاجواب مزاحمت' },
    ]
  },
  'کپاس': {
    icon: '🌿',
    unit: 'کلوگرام',
    cropLabel: 'کپاس (Bt Cotton)',
    timingLabel: 'کاشت کا موسم',
    timings: [
      { id: 'early',  label: 'اگیتی کاشت (15 فروری تا 31 مارچ)', drillRate: 7, broadRate: 9, penalty: null, penaltyText: '🌟 اگیتی کاشت سے گلابی سنڈی کے حملے سے پہلے بھرپور چنائی ممکن ہے' },
      { id: 'normal', label: 'نارمل کاشت (1 اپریل تا 31 مئی)', drillRate: 8, broadRate: 10, penalty: null, penaltyText: '✅ 15 مئی تک کاشت مکمل کرنا سب سے محفوظ پیداواری ونڈو ہے' },
    ],
    seedTypes: [
      { id: 'delinted', label: 'بر اترا بیج (Acid-Delinted >75% اگاؤ)', factor: 1.0 },
      { id: 'fuzzy',    label: 'روئیں دار بیج (Fuzzy / غیر ٹریٹ شدہ)', factor: 1.35 },
    ],
    varieties: [
      { name: 'FH-333 (Triple Gene)', org: 'AARI فیصل آباد', yield: '40–50 من/ایکڑ', maturity: '145–155 دن', notes: 'ٹرپل جین (3G) — راؤنڈ اپ ریڈی اور سنڈیوں سے محفوظ، اگیتی کاشت کی چیمپئن' },
      { name: 'CKC-01', org: 'CCRI ملتان', yield: '35–45 من/ایکڑ', maturity: '150–160 دن', notes: 'ملتان و بہاولپور زون کیلئے ہیٹ ٹولرنٹ، کیڑے مکوڑوں کے خلاف قدرتی قوت مدافعت' },
      { name: 'CKC-03', org: 'CCRI ملتان', yield: '35–45 من/ایکڑ', maturity: '150–160 دن', notes: 'شدید گرمی برداشت کرنے والی منظور شدہ قسم، سفید مکھی کے دباؤ میں بھی کارکردگی' },
      { name: 'BS-15', org: 'پنجاب سیڈ کونسل', yield: '35–42 من/ایکڑ', maturity: '150–160 دن', notes: 'جنوبی پنجاب میں وسیع پیمانے پر کاشت، اچھا ریشہ اور بوائی سے 15 مئی تک موزوں' },
      { name: 'MNH-1020', org: 'CRI ملتان', yield: '38–48 من/ایکڑ', maturity: '155–165 دن', notes: 'بھرپور مینیجمنٹ اور کھاد پر بمپر پیداوار دینے والی سرٹیفائیڈ قسم' },
    ]
  },
  'چاول': {
    icon: '🍚',
    unit: 'کلوگرام (نرسری)',
    cropLabel: 'چاول باسمتی (Rice Belt)',
    timingLabel: 'نرسری کی کاشت',
    timings: [
      { id: 'nursery', label: 'نرسری بوائی (20 مئی تا 20 جون)', drillRate: 4.5, broadRate: 5, penalty: null, penaltyText: '🌾 1 ایکڑ کھیت کیلئے 4 تا 5 کلو بیج کی پنیری کافی ہوتی ہے۔ 25-30 دن کی پنیری منتقل کریں۔' },
    ],
    varieties: [
      { name: 'سلطان سپر باسمتی (Sultan Super 2025/26)', org: 'RRI کالا شاہ کاکو', yield: '60–75 من/ایکڑ', maturity: '135–140 دن', notes: 'دنیا کا سب سے لمبا دانہ (9.66 ملی میٹر)، کالا شاہ کاکو کی نئی ریکارڈ پیداواری قسم' },
      { name: 'سپر باسمتی (Super Basmati)', org: 'RRI کالا شاہ کاکو', yield: '40–50 من/ایکڑ', maturity: '135–140 دن', notes: 'روایتی خوشبودار باسمتی، ایکسپورٹ کا عالمی معیار اور سب سے زیادہ منڈی قیمت' },
      { name: 'پی کے 1121 ایرومیٹک (PK-1121)', org: 'RRI کالا شاہ کاکو', yield: '50–65 من/ایکڑ', maturity: '135–140 دن', notes: 'غیر معمولی پکنے کے بعد لمبائی (کائنات 1121)، برآمد کنندگان کی اولین ترجیح' },
      { name: 'کسان باسمتی (Kissan Basmati)', org: 'پنجاب سیڈ کارپوریشن', yield: '45–58 من/ایکڑ', maturity: '130–135 دن', notes: 'بیماریوں (جھلساؤ) کیخلاف محفوظ، کم قد اور تیز پکنے والی قسم' },
      { name: 'باسمتی 515 (Basmati 515)', org: 'RRI کالا شاہ کاکو', yield: '45–55 من/ایکڑ', maturity: '130–135 دن', notes: 'سپر باسمتی سے 10 دن پہلے تیار، گوب کے وقت بیماریوں سے محفوظ' },
    ]
  },
  'مکئی': {
    icon: '🌽',
    unit: 'کلوگرام (ہائبرڈ)',
    cropLabel: 'مکئی (Spring / Autumn Maize)',
    timingLabel: 'کاشت کا موسم',
    timings: [
      { id: 'spring', label: 'بہاریہ مکئی (فروری تا مارچ)', drillRate: 8.5, broadRate: 10, penalty: null, penaltyText: '🌽 بہاریہ مکئی میں پودوں کی مطلوبہ تعداد (32,000 پودے فی ایکڑ) حاصل کرنا لازمی ہے' },
      { id: 'autumn', label: 'موسمی / ساہیوال بیلٹ (جولائی تا اگست)', drillRate: 8, broadRate: 9.5, penalty: null, penaltyText: '🌽 مون سون کے بعد کاشت — فال آرمی ورم سے پیشگی بچاؤ یقینی بنائیں' },
    ],
    varieties: [
      { name: 'Pioneer 1422', org: 'Corteva / Pioneer', yield: '90–110 من/ایکڑ', maturity: '110–115 دن', notes: 'پنجاب کی مقبول ترین بہاریہ ہائبرڈ، بھاری بھٹے اور یکساں دانہ' },
      { name: 'Dekalb DK-6142 / DK-6789', org: 'Bayer Pakistan', yield: '85–105 من/ایکڑ', maturity: '110–120 دن', notes: 'گرمی برداشت کرنے والی ہائبرڈ، ساہیوال، پاکپتن اور فیصل آباد کیلئے بہترین' },
      { name: 'FH-949', org: 'مکئی ریسرچ انسٹیٹیوٹ یوسف والا', yield: '70–85 من/ایکڑ', maturity: '105–110 دن', notes: 'سرکاری منظور شدہ سستا ہائبرڈ، معتدل نمکیات برداشت' },
    ]
  },
  'گنا': {
    icon: '🎋',
    unit: 'من (پٹرے / سمے)',
    cropLabel: 'کماد / گنا (Sugarcane)',
    timingLabel: 'کاشت کا وقت',
    timings: [
      { id: 'autumn_cane', label: 'ستمبر کاشت (Autumn Planting)', drillRate: 70, broadRate: 80, penalty: null, penaltyText: '🎋 ستمبر کاشت سے بہاریہ کی نسبت 20-30% زیادہ گنے کا وزن ملتا ہے' },
      { id: 'spring_cane', label: 'بہاریہ کاشت (فروری تا مارچ)', drillRate: 80, broadRate: 90, penalty: null, penaltyText: '🎋 3 آنکھوں والے 40,000 سمے یا 10-12 انچ لمبے ٹکڑے فی ایکڑ ڈالیں' },
    ],
    varieties: [
      { name: 'CPF-237', org: 'شوگر کین ریسرچ فیصل آباد', yield: '900–1100 من/ایکڑ', maturity: '300–330 دن', notes: 'سب سے زیادہ چینی کا تناسب (Recovery >11%)، درمیانی موٹائی، ریٹوننگ شاندار' },
      { name: 'SPF-213', org: 'شوگر کین ریسرچ فیصل آباد', yield: '950–1150 من/ایکڑ', maturity: '320–350 دن', notes: 'موٹا گنا، وزنی، پچھیتی کٹائی اور گڑ بنانے کیلئے بہترین' },
      { name: 'HSF-240', org: 'شوگر کین ریسرچ انسٹیٹیوٹ', yield: '850–1000 من/ایکڑ', maturity: '300–320 دن', notes: 'سخت حالات اور کم پانی میں بھی زندہ رہنے کی صلاحیت' },
    ]
  }
};

const GERMINATION_STEPS = [
  '1. 100 دانے بیج کے گن کر لیں اور گیلے کپڑے یا بوری میں لپیٹیں۔',
  '2. 3 سے 5 دن تک گرم نمی والی جگہ (25 تا 30 ڈگری سینٹی گریڈ) پر رکھیں۔',
  '3. کپڑا کھول کر اگنے والے دانوں کی تعداد گنیں۔',
  '4. اگر 85 سے زائد دانے اگ آئیں تو بیج بہترین معیار کا ہے۔',
  '5. اگر اگاؤ 70-80% ہو تو بیج کی فی ایکڑ مقدار میں 15% اضافہ کریں۔',
];

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function SeedRateCalc() {
  const [crop, setCrop] = useState('گندم');
  const [timing, setTiming] = useState('optimal');
  const [method, setMethod] = useState('drill'); // 'drill' | 'broadcast'
  const [cottonSeedType, setCottonSeedType] = useState('delinted');
  const [acres, setAcres] = useState('1');
  const [result, setResult] = useState(null);

  const cropData = CERTIFIED_VARIETIES[crop];

  const calculate = () => {
    if (!cropData || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);
    const selectedTiming = cropData.timings.find(t => t.id === timing) || cropData.timings[0];

    let baseRate = method === 'drill' ? selectedTiming.drillRate : selectedTiming.broadRate;

    // Apply cotton seed type factor
    if (crop === 'کپاس' && cottonSeedType === 'fuzzy') {
      baseRate = +(baseRate * 1.35).toFixed(1);
    }

    const totalSeed = +(baseRate * a).toFixed(1);

    setResult({
      crop,
      cropData,
      a,
      selectedTiming,
      method,
      cottonSeedType,
      baseRate,
      totalSeed,
      varieties: cropData.varieties
    });
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>🌱</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>سرکاری سرٹیفائیڈ بیج و ورائٹی ڈائریکٹری</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>
            پنجاب سیڈ کارپوریشن (PSC) + AARI فیصل آباد مصدقہ 2024–2026
          </div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop Selection */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>فصل منتخب کریں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {Object.keys(CERTIFIED_VARIETIES).map(c => (
              <button key={c} id={`seed-crop-${c}`}
                onClick={() => {
                  setCrop(c);
                  setTiming(CERTIFIED_VARIETIES[c].timings[0].id);
                  setResult(null);
                }}
                style={{
                  padding: '0.55rem 0.2rem', borderRadius: 10,
                  border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`,
                  background: crop === c ? '#f0fdf4' : 'white',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  color: crop === c ? '#15803d' : '#1e293b', ...nas
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{CERTIFIED_VARIETIES[c].icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sowing Window Selection */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
            {cropData.timingLabel}:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cropData.timings.map(t => (
              <button key={t.id}
                onClick={() => { setTiming(t.id); setResult(null); }}
                style={{
                  padding: '0.65rem 0.8rem', borderRadius: 8, textAlign: 'right',
                  border: `2px solid ${timing === t.id ? '#15803d' : '#e5e7eb'}`,
                  background: timing === t.id ? '#f0fdf4' : 'white',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  color: timing === t.id ? '#15803d' : '#334155', ...nas
                }}
              >
                <div>{t.label}</div>
                {t.penalty && (
                  <div style={{ fontSize: '.7rem', color: '#dc2626', marginTop: 2 }}>
                    {t.penaltyText}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sowing Method (Drill vs Broadcast) */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>کاشت کا طریقہ:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => { setMethod('drill'); setResult(null); }}
              style={{
                padding: '0.55rem', borderRadius: 8,
                border: `2px solid ${method === 'drill' ? '#15803d' : '#cbd5e1'}`,
                background: method === 'drill' ? '#f0fdf4' : 'white',
                color: method === 'drill' ? '#15803d' : '#475569',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', ...nas
              }}
            >
              🚜 ڈرل سے کاشت (منظور شدہ)
            </button>
            <button
              onClick={() => { setMethod('broadcast'); setResult(null); }}
              style={{
                padding: '0.55rem', borderRadius: 8,
                border: `2px solid ${method === 'broadcast' ? '#15803d' : '#cbd5e1'}`,
                background: method === 'broadcast' ? '#f0fdf4' : 'white',
                color: method === 'broadcast' ? '#15803d' : '#475569',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', ...nas
              }}
            >
              ✋ چھٹہ / دستی کاشت (+10% بیج)
            </button>
          </div>
        </div>

        {/* Cotton Seed Type (Delinted vs Fuzzy) */}
        {crop === 'کپاس' && (
          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>بیج کی قسم:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {cropData.seedTypes.map(st => (
                <button key={st.id}
                  onClick={() => { setCottonSeedType(st.id); setResult(null); }}
                  style={{
                    padding: '0.5rem', borderRadius: 8,
                    border: `2px solid ${cottonSeedType === st.id ? '#15803d' : '#cbd5e1'}`,
                    background: cottonSeedType === st.id ? '#f0fdf4' : 'white',
                    color: cottonSeedType === st.id ? '#15803d' : '#475569',
                    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', ...nas
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Acreage Input */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>رقبہ (ایکڑ میں):</label>
          <input id="seed-acres" type="number" className="input" placeholder="1" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => { setAcres(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Action Button */}
        <button className="btn btn-primary btn-full" id="seed-calc-btn"
          disabled={!crop || !acres}
          onClick={calculate}
          style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.8rem', background: 'linear-gradient(135deg, #14532d, #16a34a)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
        >
          🌱 سرٹیفائیڈ بیج کی مقدار و ورائٹیاں دیکھیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {/* Total Seed Banner */}
            <div style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 12, color: 'white' }}>
              <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                {result.cropData.icon} {result.cropData.cropLabel} — {result.a} ایکڑ ({result.selectedTiming.label})
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 4 }} dir="ltr">
                {result.totalSeed.toLocaleString()} {result.cropData.unit}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#bbf7d0', marginTop: 2 }}>
                فی ایکڑ بیج شرح: <strong>{result.baseRate} {result.cropData.unit}</strong> ({result.method === 'drill' ? 'ڈرل کاشت' : 'چھٹہ کاشت'})
              </div>
            </div>

            {/* Yield Penalty Warning Banner */}
            {result.selectedTiming.penaltyText && (
              <div style={{ background: result.selectedTiming.penalty ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${result.selectedTiming.penalty ? '#f87171' : '#86efac'}`, borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '.78rem', color: result.selectedTiming.penalty ? '#b91c1c' : '#15803d' }}>
                  {result.selectedTiming.penaltyText}
                </div>
              </div>
            )}

            {/* Certified Varieties Section */}
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#14532d', marginBottom: 8 }}>
              🏛️ پنجاب سیڈ کارپوریشن سرٹیفائیڈ ورائٹیاں (2024–2026):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.varieties.map((v, i) => (
                <div key={i} style={{ background: 'white', border: '1.5px solid #d1fae5', borderRadius: 12, padding: '0.85rem', borderRight: `4px solid ${i === 0 ? '#15803d' : i === 1 ? '#0284c7' : '#d97706'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#14532d', fontSize: '0.92rem' }}>
                        {i === 0 ? '⭐ سب سے مقبول:' : '✓'} {v.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: 2, fontWeight: 700 }}>
                        🏛️ ادارہ: {v.org} | پکنے کا وقت: {v.maturity}
                      </div>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', color: '#15803d', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      پیداواری صلاحیت: {v.yield}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#374151', marginTop: 6, lineHeight: 1.5 }}>
                    📝 <strong>خصوصیات:</strong> {v.notes}
                  </div>
                </div>
              ))}
            </div>

            {/* Provenance Badge */}
            <div style={{ marginTop: 10 }}>
              <InstitutionalBadge type="aari" helpline="0800-17000" />
            </div>

            {/* Germination Protocol */}
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '0.85rem', marginTop: 10 }}>
              <div style={{ fontWeight: 800, color: '#c2410c', fontSize: '0.85rem', marginBottom: 6 }}>
                🔬 سرکاری اگاؤ ٹیسٹ (بوائی سے 5 دن قبل لازمی کریں):
              </div>
              {GERMINATION_STEPS.map((step, idx) => (
                <div key={idx} style={{ fontSize: '0.72rem', color: '#9a3412', marginBottom: 4, lineHeight: 1.4 }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
