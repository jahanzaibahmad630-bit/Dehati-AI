import { useState } from 'react';

// ─── Punjab Agriculture Dept certified variety database ──────────────────────
const VARIETY_DB = {
  'گندم': {
    icon: '🌾', unit: 'کلو', ratePerAcre: 50,
    early: {
      normal:   [{ name: 'اکبر-19', org: 'AARI فیصل آباد', yield: '50-55 من', notes: 'اکتوبر 1-15 بوائی، زنگ مزاحم' }, { name: 'فتح جنگ-2016', org: 'NARC', yield: '48-52 من', notes: 'پانی کی کمی مزاحم' }],
      moderate: [{ name: 'AARI-2011', org: 'AARI فیصل آباد', yield: '40-45 من', notes: 'درمیانی نمکیات برداشت' }, { name: 'بارانی-17', org: 'BARI', yield: '38-42 من', notes: 'بارانی علاقوں کے لیے' }],
      high:     [{ name: 'قلندر', org: 'NIAB', yield: '35-40 من', notes: 'اعلی نمکیات برداشت کرتا ہے' }, { name: 'صابر-2006', org: 'AARI', yield: '32-38 من', notes: 'کلری زمین کے لیے بہترین' }],
    },
    mid: {
      normal:   [{ name: 'دلکش-2020', org: 'AARI فیصل آباد', yield: '52-58 من', notes: 'نومبر 15-30 — پیلا زنگ مزاحم' }, { name: 'آنق-2017', org: 'NIAB', yield: '48-53 من', notes: 'سرحد علاقہ بہترین' }],
      moderate: [{ name: 'SARC-1', org: 'SARC', yield: '42-48 من', notes: 'نمک متحمل، وسطی پنجاب' }, { name: 'BARS-09', org: 'BARI', yield: '38-44 من', notes: 'کم پانی، اچھی پیداوار' }],
      high:     [{ name: 'NIAB-2008', org: 'NIAB', yield: '34-40 من', notes: 'سخت نمکیات قابل برداشت' }, { name: 'LU-26S', org: 'UAF', yield: '30-36 من', notes: 'کلری مٹی کے لیے' }],
    },
    late: {
      normal:   [{ name: 'فیصل آباد-2008', org: 'AARI', yield: '40-46 من', notes: 'دسمبر بوائی، گرم مزاحم' }, { name: 'میلودی-2010', org: 'NIAB', yield: '38-44 من', notes: 'دیر سے بوائی مناسب' }],
      moderate: [{ name: 'دھرابی-2011', org: 'AARI', yield: '35-40 من', notes: 'کم پانی، نمک برداشت' }],
      high:     [{ name: 'SARC-1', org: 'SARC', yield: '32-38 من', notes: 'دیر بوائی نمکیات علاقہ' }],
    },
  },
  'کپاس': {
    icon: '🌿', unit: 'کلو', ratePerAcre: 4,
    early: {
      normal:   [{ name: 'CIM-596', org: 'NIAB', yield: '42-48 من', notes: 'مئی بوائی، CLCuV مزاحم' }, { name: 'FH-333', org: 'FCRI', yield: '40-46 من', notes: 'اچھی ریشہ طوالت' }],
      moderate: [{ name: 'CIM-554', org: 'NIAB', yield: '38-44 من', notes: 'درمیانی نمکیات' }],
      high:     [{ name: 'MNH-886', org: 'MRRI', yield: '34-40 من', notes: 'نمکیات برداشت' }],
    },
    mid: {
      normal:   [{ name: 'CKC-1', org: 'UAF', yield: '44-50 من', notes: 'بہترین ریشہ، وائرس مزاحم' }, { name: 'NIAB-878', org: 'NIAB', yield: '40-46 من', notes: 'سندھ-پنجاب دونوں' }],
      moderate: [{ name: 'IUB-222', org: 'IUB', yield: '36-42 من', notes: 'نمکیات برداشت' }],
      high:     [{ name: 'CIM-499', org: 'NIAB', yield: '32-38 من', notes: 'اعلی نمکیات مزاحم' }],
    },
    late: {
      normal:   [{ name: 'Sitara-009', org: 'NIAB', yield: '36-42 من', notes: 'جون بوائی — گرم علاقہ' }],
      moderate: [{ name: 'FH-901', org: 'FCRI', yield: '32-38 من', notes: 'دیر بوائی نمکیات' }],
      high:     [{ name: 'NIAB-512', org: 'NIAB', yield: '28-34 من', notes: 'سخت حالات' }],
    },
  },
  'چاول': {
    icon: '🌾', unit: 'کلو', ratePerAcre: 8,
    early: {
      normal:   [{ name: 'Super Basmati', org: 'RERC/IRRI', yield: '32-36 من', notes: 'جون نرسری، برآمد معیار' }, { name: 'PK-386', org: 'RERC', yield: '38-44 من', notes: 'اعلی پیداوار غیر باسمتی' }],
      moderate: [{ name: 'KSK-133', org: 'KSK', yield: '30-36 من', notes: 'درمیانی نمکیات' }],
      high:     [{ name: 'KSK-434', org: 'KSK', yield: '26-32 من', notes: 'نمکیات برداشت' }],
    },
    mid: {
      normal:   [{ name: 'IRRI-6', org: 'IRRI', yield: '40-46 من', notes: 'جولائی نرسری، کم خرچ' }, { name: 'Kissan Basmati', org: 'RERC', yield: '34-40 من', notes: 'باسمتی، اعلی قیمت' }],
      moderate: [{ name: 'KSK-282', org: 'KSK', yield: '32-38 من', notes: 'وسطی پنجاب نمکیات' }],
      high:     [{ name: 'KSK-222', org: 'KSK', yield: '26-30 من', notes: 'سخت نمکیات علاقہ' }],
    },
    late: {
      normal:   [{ name: 'IRRI-9', org: 'IRRI', yield: '36-42 من', notes: 'آگست — گرم علاقہ' }],
      moderate: [{ name: 'Swat-1', org: 'ARI', yield: '30-36 من', notes: 'ہلکی نمکیات' }],
      high:     [{ name: 'CSR-30', org: 'CSSRI', yield: '24-28 من', notes: 'سخت نمکیات' }],
    },
  },
  'مکئی': {
    icon: '🌽', unit: 'کلو', ratePerAcre: 10,
    early: {
      normal:   [{ name: '1422 (Pioneer)', org: 'Pioneer', yield: '55-65 من', notes: 'مارچ-اپریل بوائی، اعلی پیداوار' }, { name: 'Agritech-102', org: 'Agritech', yield: '50-60 من', notes: 'گرمی مزاحم ہائبرڈ' }],
      moderate: [{ name: 'FH-949', org: 'FCRI', yield: '44-52 من', notes: 'ہلکی نمکیات برداشت' }],
      high:     [{ name: 'PB-982', org: 'PB Seeds', yield: '38-46 من', notes: 'نمکیات برداشت' }],
    },
    mid: {
      normal:   [{ name: 'Hyola-401', org: 'Bayer', yield: '52-62 من', notes: 'جولائی — بارش بعد' }, { name: 'DK-6142', org: 'Dekalb', yield: '50-60 من', notes: 'دوسری فصل بہترین' }],
      moderate: [{ name: 'Arif-2010', org: 'CCRI', yield: '40-50 من', notes: 'وسطی پنجاب' }],
      high:     [{ name: 'MMRI-Yellow', org: 'MMRI', yield: '35-44 من', notes: 'نمکیات مزاحم' }],
    },
    late: {
      normal:   [{ name: 'YH-1898', org: 'YH Seeds', yield: '46-56 من', notes: 'ستمبر-اکتوبر بوائی' }],
      moderate: [{ name: 'FH-925', org: 'FCRI', yield: '38-48 من', notes: 'دیر بوائی ہلکی نمکیات' }],
      high:     [{ name: 'CSM-335', org: 'NIAB', yield: '30-40 من', notes: 'سخت حالات' }],
    },
  },
  'گنا': {
    icon: '🎋', unit: 'کلو (پٹرے)', ratePerAcre: 600,
    early: {
      normal:   [{ name: 'SPF-213', org: 'PSDO', yield: '950-1100 من', notes: 'اکتوبر-نومبر بوائی، زیادہ شوگر' }, { name: 'HSF-240', org: 'HSRI', yield: '900-1050 من', notes: 'مرض مزاحم، بہترین' }],
      moderate: [{ name: 'NSG-311', org: 'NSDO', yield: '850-1000 من', notes: 'ہلکی نمکیات' }],
      high:     [{ name: 'S-97', org: 'SRIF', yield: '750-900 من', notes: 'نمکیات برداشت کرتا ہے' }],
    },
    mid: {
      normal:   [{ name: 'CPF-237', org: 'CFRI', yield: '900-1000 من', notes: 'بہار بوائی — مارچ-اپریل' }, { name: 'BL-4', org: 'BSRI', yield: '880-980 من', notes: 'جنوبی پنجاب بہترین' }],
      moderate: [{ name: 'B-T54/9', org: 'BSRI', yield: '800-900 من', notes: 'درمیانی نمکیات' }],
      high:     [{ name: 'Co-1148', org: 'SRI', yield: '700-850 من', notes: 'اعلی نمکیات' }],
    },
    late: {
      normal:   [{ name: 'L-116', org: 'LYARI', yield: '800-950 من', notes: 'دیر بوائی' }],
      moderate: [{ name: 'AUR-4', org: 'AURI', yield: '720-850 من', notes: 'نمکیات دیر بوائی' }],
      high:     [{ name: 'NW-6', org: 'NW Seeds', yield: '640-750 من', notes: 'سخت نمکیات' }],
    },
  },
};

const WINDOW_LABELS = { early: 'جلد بوائی', mid: 'درمیانی', late: 'دیر بوائی' };
const SALINITY_LABELS = { normal: 'نارمل', moderate: 'درمیانی', high: 'زیادہ نمکیات' };
const SALINITY_COLORS = { normal: '#15803d', moderate: '#ca8a04', high: '#dc2626' };

const GERMINATION_STEPS = [
  '1. 100 بیج لیں اور گیلے کپڑے میں لپیٹیں',
  '2. 3-5 دن گرم جگہ (25-30°C) پر رکھیں',
  '3. اگنے والے بیج گنیں',
  '4. اگر 85%+ اگے تو بیج قابل استعمال ہے',
  '5. کم ہو تو بیج کی مقدار 10-15% بڑھائیں',
];

const DISCLAIMER = '⚠️ یہ تجاویز زرعی تحقیقاتی ڈیٹا پر مبنی ہیں۔ حتمی فیصلے سے قبل مقامی زراعت آفیسر سے مشورہ کریں۔';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function SeedRateCalc() {
  const [crop, setCrop] = useState('');
  const [window, setWindow] = useState('mid');
  const [salinity, setSalinity] = useState('normal');
  const [acres, setAcres] = useState('');
  const [result, setResult] = useState(null);

  const crops = Object.keys(VARIETY_DB);

  const calculate = () => {
    const cropData = VARIETY_DB[crop];
    if (!cropData || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);
    const varieties = (cropData[window]?.[salinity] || cropData.mid?.normal || []).slice(0, 3);
    const totalSeed = cropData.ratePerAcre * a;
    setResult({ crop, cropData, a, varieties, totalSeed, window, salinity });
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ fontSize: '1.6rem' }}>🌱</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ بیج ورائٹی کیلکولیٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>⚡ 0ms آف لائن — پنجاب زراعت محکمہ سرٹیفائیڈ</div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop Selection */}
        <div>
          <label className="input-label">فصل منتخب کریں</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {crops.map(c => (
              <button key={c} id={`seed-crop-${c}`}
                onClick={() => { setCrop(c); setResult(null); }}
                style={{ padding: '0.5rem 0.2rem', borderRadius: 10, border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`, background: crop === c ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#1a2f0e', ...nas }}
              >
                <span style={{ fontSize: '1.2rem' }}>{VARIETY_DB[c].icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sowing Window */}
        <div>
          <label className="input-label">بوائی کا موسم</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(WINDOW_LABELS).map(([key, label]) => (
              <button key={key} id={`seed-window-${key}`}
                onClick={() => { setWindow(key); setResult(null); }}
                style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: 8, border: `2px solid ${window === key ? '#15803d' : '#e5e7eb'}`, background: window === key ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', color: '#1a2f0e', ...nas }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Soil Salinity */}
        <div>
          <label className="input-label">زمین کی نمکیات</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(SALINITY_LABELS).map(([key, label]) => (
              <button key={key} id={`seed-salinity-${key}`}
                onClick={() => { setSalinity(key); setResult(null); }}
                style={{ flex: 1, padding: '0.6rem 0.2rem', borderRadius: 8, border: `2px solid ${salinity === key ? SALINITY_COLORS[key] : '#e5e7eb'}`, background: salinity === key ? '#f9fafb' : 'white', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', color: salinity === key ? SALINITY_COLORS[key] : '#6b7280', ...nas }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div>
          <label className="input-label">رقبہ (ایکڑ)</label>
          <input id="seed-acres" type="number" className="input input-number" placeholder="5" value={acres} min="0.5" step="0.5" dir="ltr" onChange={e => { setAcres(e.target.value); setResult(null); }} />
        </div>

        <button className="btn btn-primary btn-full" id="seed-calc-btn"
          disabled={!crop || !acres}
          onClick={calculate}
          style={{ fontSize: '1rem', padding: '0.85rem', ...nas }}
        >
          🌱 بہترین ورائٹی اور بیج مقدار دیکھیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up">
            {/* Seed Quantity Banner */}
            <div style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 12 }}>
              <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '0.78rem', ...nas }}>
                {result.cropData.icon} {result.crop} — {result.a} ایکڑ — {WINDOW_LABELS[result.window]} — {SALINITY_LABELS[result.salinity]}
              </div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '2rem', fontFamily: 'Inter', marginTop: 4 }} dir="ltr">
                {result.totalSeed.toLocaleString()} {result.cropData.unit}
              </div>
              <div style={{ color: '#bbf7d0', fontSize: '0.72rem', ...nas }}>کل بیج ضروری (فی ایکڑ {result.cropData.ratePerAcre} {result.cropData.unit})</div>
            </div>

            {/* Variety Cards */}
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#14532d', marginBottom: 8, ...nas }}>
              🏆 سرکاری سرٹیفائیڈ ورائٹیاں:
            </div>
            {result.varieties.map((v, i) => (
              <div key={i} style={{ background: 'white', border: '1.5px solid #d1fae5', borderRadius: 12, padding: '0.85rem', marginBottom: 8, borderRight: `4px solid ${i === 0 ? '#15803d' : i === 1 ? '#ca8a04' : '#6b7280'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 800, color: i === 0 ? '#15803d' : i === 1 ? '#ca8a04' : '#6b7280', fontSize: '0.95rem', ...nas }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {v.name}
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.68rem', color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap', ...nas }}>
                    {v.yield}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4, ...nas }}>🏛️ {v.org}</div>
                <div style={{ fontSize: '0.75rem', color: '#374151', marginTop: 4, ...nas }}>📝 {v.notes}</div>
              </div>
            ))}

            {/* Germination Test */}
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '0.85rem', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, color: '#c2410c', fontSize: '0.85rem', marginBottom: 8, ...nas }}>🔬 اگاؤ ٹیسٹ (بوائی سے پہلے)</div>
              {GERMINATION_STEPS.map((step, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: '#9a3412', marginBottom: 4, ...nas }}>{step}</div>
              ))}
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
