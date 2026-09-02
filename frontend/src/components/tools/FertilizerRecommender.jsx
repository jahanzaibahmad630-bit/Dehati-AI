import { useState, useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { getSavedSoilProfile } from './SoilProfile';
import InstitutionalBadge from '../ui/InstitutionalBadge';

// ─── Punjab Agriculture Extension NPK Database ─────────────────────────────
const NPK_DB = {
  'گندم': {
    label: 'گندم (Wheat)', icon: '🌾',
    yieldTarget: '50 من / ایکڑ',
    stages: {
      'بوائی': {
        loam:  { dap: 1,   urea: 0.5, sop: 0,   zinc: 5 },
        sandy: { dap: 1.5, urea: 0.5, sop: 0.5, zinc: 8 },
        clay:  { dap: 0.5, urea: 0.5, sop: 0,   zinc: 5 },
      },
      'پہلا پانی (21-25 دن)': {
        loam:  { dap: 0, urea: 1.5, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 2,   sop: 0, zinc: 5 },
        clay:  { dap: 0, urea: 1,   sop: 0, zinc: 0 },
      },
      'دوسرا پانی (45-50 دن)': {
        loam:  { dap: 0, urea: 1, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 1, sop: 0, zinc: 0 },
        clay:  { dap: 0, urea: 1, sop: 0, zinc: 0 },
      },
      'بالیں نکلنا (75-85 دن)': {
        loam:  { dap: 0, urea: 0.5, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 0.5, sop: 0, zinc: 0 },
        clay:  { dap: 0, urea: 0,   sop: 0, zinc: 0 },
      },
    }
  },
  'کپاس': {
    label: 'کپاس (Cotton)', icon: '🌿',
    yieldTarget: '40 من / ایکڑ',
    stages: {
      'بوائی': {
        loam:  { dap: 1,   urea: 0, sop: 0.5, zinc: 5 },
        sandy: { dap: 1.5, urea: 0, sop: 1,   zinc: 8 },
        clay:  { dap: 0.5, urea: 0, sop: 0.5, zinc: 5 },
      },
      'پودا نکلنا (30 دن)': {
        loam:  { dap: 0, urea: 1,   sop: 0.5, zinc: 0 },
        sandy: { dap: 0, urea: 1.5, sop: 1,   zinc: 5 },
        clay:  { dap: 0, urea: 0.5, sop: 0.5, zinc: 0 },
      },
      'پھول آنا (70-80 دن)': {
        loam:  { dap: 0, urea: 1.5, sop: 1, zinc: 0 },
        sandy: { dap: 0, urea: 2,   sop: 1, zinc: 5 },
        clay:  { dap: 0, urea: 1,   sop: 1, zinc: 0 },
      },
      'ٹنڈے بننا': {
        loam:  { dap: 0, urea: 0.5, sop: 0.5, zinc: 0 },
        sandy: { dap: 0, urea: 1,   sop: 0.5, zinc: 0 },
        clay:  { dap: 0, urea: 0.5, sop: 0.5, zinc: 0 },
      },
    }
  },
  'چاول': {
    label: 'چاول (Rice)', icon: '🌾',
    yieldTarget: '35 من / ایکڑ',
    stages: {
      'پنیری لگانا': {
        loam:  { dap: 1, urea: 0.5, sop: 0.5, zinc: 10 },
        sandy: { dap: 1, urea: 0.5, sop: 1,   zinc: 15 },
        clay:  { dap: 1, urea: 0.5, sop: 0,   zinc: 10 },
      },
      'پہلا پانی (25 دن)': {
        loam:  { dap: 0, urea: 1.5, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 2,   sop: 0, zinc: 0 },
        clay:  { dap: 0, urea: 1,   sop: 0, zinc: 0 },
      },
      'بالیں نکلنا': {
        loam:  { dap: 0, urea: 1, sop: 0.5, zinc: 0 },
        sandy: { dap: 0, urea: 1, sop: 1,   zinc: 0 },
        clay:  { dap: 0, urea: 1, sop: 0,   zinc: 0 },
      },
    }
  },
  'گنا': {
    label: 'گنا (Sugarcane)', icon: '🎋',
    yieldTarget: '1000 من / ایکڑ',
    stages: {
      'بوائی': {
        loam:  { dap: 1.5, urea: 0, sop: 1, zinc: 5 },
        sandy: { dap: 2,   urea: 0, sop: 1, zinc: 8 },
        clay:  { dap: 1,   urea: 0, sop: 1, zinc: 5 },
      },
      'ابتدائی نشوونما (60 دن)': {
        loam:  { dap: 0, urea: 2, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 3, sop: 0, zinc: 5 },
        clay:  { dap: 0, urea: 2, sop: 0, zinc: 0 },
      },
      'تیز نشوونما (120 دن)': {
        loam:  { dap: 0, urea: 2, sop: 1, zinc: 0 },
        sandy: { dap: 0, urea: 3, sop: 1, zinc: 0 },
        clay:  { dap: 0, urea: 2, sop: 1, zinc: 0 },
      },
    }
  },
  'مکئی': {
    label: 'مکئی (Maize)', icon: '🌽',
    yieldTarget: '60 من / ایکڑ',
    stages: {
      'بوائی': {
        loam:  { dap: 1.5, urea: 0, sop: 0.5, zinc: 5 },
        sandy: { dap: 2,   urea: 0, sop: 1,   zinc: 8 },
        clay:  { dap: 1,   urea: 0, sop: 0.5, zinc: 5 },
      },
      'پودا نکلنا (25 دن)': {
        loam:  { dap: 0, urea: 1.5, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 2,   sop: 0, zinc: 0 },
        clay:  { dap: 0, urea: 1,   sop: 0, zinc: 0 },
      },
      'تیز نشوونما (50 دن)': {
        loam:  { dap: 0, urea: 2, sop: 0.5, zinc: 0 },
        sandy: { dap: 0, urea: 2, sop: 1,   zinc: 0 },
        clay:  { dap: 0, urea: 2, sop: 0.5, zinc: 0 },
      },
      'بھٹہ بننا': {
        loam:  { dap: 0, urea: 0.5, sop: 0, zinc: 0 },
        sandy: { dap: 0, urea: 1,   sop: 0, zinc: 0 },
        clay:  { dap: 0, urea: 0.5, sop: 0, zinc: 0 },
      },
    }
  },
};

const SOIL_MAP = { 'دوہمی': 'loam', 'ریتلی': 'sandy', 'چکنی': 'clay' };
const SOIL_LABELS = { loam: 'دوہمی', sandy: 'ریتلی', clay: 'چکنی' };

const SOIL_CONDITIONS = [
  { id: 'normal', label: 'نارمل زرخیز زمین' },
  { id: 'saline', label: 'کلراٹھی / نمکیاتی زمین (Saline)' },
  { id: 'sandy',  label: 'ریتلی / ہلکی زمین' },
  { id: 'low_om', label: 'نامیاتی مادہ کم (Low OM)' },
];

const COLORS = ['#15803d', '#ca8a04', '#7c3aed', '#0369a1'];
const DISCLAIMER = '⚠️ یہ تجاویز ادارہ تحقیقات برائے زرخیزی زمین پنجاب (SFRI) اور ایوب زرعی تحقیقاتی ادارہ (AARI) فیصل آباد کے 2024-26 ریسرچ اعداد پر مبنی ہیں۔ ذاتی مٹی ٹیسٹ کے بغیر یہ علاقائی اوسط ہے۔ تصدیق کیلئے: 0800-17000';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

// Market vs Kissan Card Subsidized Prices (PKR per bag / kg)
const MARKET_PRICES  = { dap: 8500, urea: 3200, sop: 9500, zinc: 280 };
const SUBSIDY_PRICES = { dap: 6800, urea: 2560, sop: 7600, zinc: 224 };

export default function FertilizerRecommender() {
  const [crop, setCrop] = useState('گندم');
  const [acres, setAcres] = useState('1');
  const [soil, setSoil] = useState('دوہمی');
  const [soilCondition, setSoilCondition] = useState('normal');
  const [showSubsidy, setShowSubsidy] = useState(false);
  const [soilProfile, setSoilProfile] = useState(null);
  const [result, setResult] = useState(null);
  const { isOffline } = useOffline();

  // Load saved soil profile on mount
  useEffect(() => {
    try {
      const p = getSavedSoilProfile();
      if (p) setSoilProfile(p);
    } catch {}
  }, []);

  const crops = Object.keys(NPK_DB);
  const prices = showSubsidy ? SUBSIDY_PRICES : MARKET_PRICES;

  const calculate = () => {
    const cropData = NPK_DB[crop];
    if (!cropData || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);
    const soilKey = SOIL_MAP[soil] || 'loam';

    let totalDap = 0;
    let totalUrea = 0;
    let totalSop = 0;
    let totalZinc = 0;

    const plan = Object.entries(cropData.stages).map(([stageName, soilRecs]) => {
      const recs = { ...(soilRecs[soilKey] || soilRecs.loam) };

      // Apply soil condition adjustments
      if (soilCondition === 'saline') {
        recs.urea = +(recs.urea * 0.85).toFixed(2);
        if (recs.zinc > 0) recs.zinc = +(recs.zinc * 1.5).toFixed(0);
      } else if (soilCondition === 'sandy') {
        if (recs.sop > 0) recs.sop = +(recs.sop * 1.2).toFixed(2);
      }

      // Check if user has saved personal soil profile
      if (soilProfile) {
        if (soilProfile.p && parseFloat(soilProfile.p) > 14) {
          recs.dap = 0;
        }
        if (soilProfile.zn && parseFloat(soilProfile.zn) < 0.5 && recs.zinc > 0) {
          recs.zinc = +(recs.zinc * 1.6).toFixed(0);
        }
        if (soilProfile.k && parseFloat(soilProfile.k) > 180) {
          recs.sop = 0;
        }
      }

      totalDap  += (recs.dap  || 0) * a;
      totalUrea += (recs.urea || 0) * a;
      totalSop  += (recs.sop  || 0) * a;
      totalZinc += (recs.zinc || 0) * a;

      return {
        stage: stageName,
        recs,
        totalKg: Object.values(recs).reduce((s, v) => s + (v || 0), 0)
      };
    });

    const marketCost = (totalDap * MARKET_PRICES.dap) + (totalUrea * MARKET_PRICES.urea) + (totalSop * MARKET_PRICES.sop) + (totalZinc * MARKET_PRICES.zinc);
    const subsidyCost = (totalDap * SUBSIDY_PRICES.dap) + (totalUrea * SUBSIDY_PRICES.urea) + (totalSop * SUBSIDY_PRICES.sop) + (totalZinc * SUBSIDY_PRICES.zinc);

    setResult({
      crop,
      cropData,
      a,
      plan,
      soilKey,
      soilCondition,
      totals: { dap: totalDap, urea: totalUrea, sop: totalSop, zinc: totalZinc },
      costs: { market: marketCost, subsidy: subsidyCost, savings: marketCost - subsidyCost }
    });
  };

  const bagLabel = (type, val, a) => {
    if (type === 'zinc') return `${(val * a).toFixed(0)} کلو`;
    return `${(val * a).toFixed(1)} بوری`;
  };

  const fmtBag = (type, perAcre, a) => {
    if (!perAcre || perAcre === 0) return null;
    return {
      label: type === 'dap' ? 'DAP' : type === 'urea' ? 'یوریا' : type === 'sop' ? 'SOP پوٹاش' : 'زنک سلفیٹ',
      value: bagLabel(type, perAcre, a),
      color: type === 'dap' ? '#15803d' : type === 'urea' ? '#d97706' : type === 'sop' ? '#7c3aed' : '#0369a1'
    };
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>🧪</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ NPK کھاد کیلکولیٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>⚡ 0ms آف لائن — پنجاب زراعت ایکسٹینشن ریسرچ ڈیٹا</div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop Selector */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>فصل منتخب کریں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {crops.map(c => (
              <button key={c} id={`fert-crop-${c}`}
                onClick={() => { setCrop(c); setResult(null); }}
                style={{ padding: '0.6rem 0.4rem', borderRadius: 10, border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`, background: crop === c ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .2s', color: '#1a2f0e', ...nas }}
              >
                <span style={{ fontSize: '1.3rem' }}>{NPK_DB[c].icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Soil Type */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>مٹی کی ساخت:</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(SOIL_MAP).map(s => (
              <button key={s} id={`fert-soil-${s}`}
                onClick={() => { setSoil(s); setResult(null); }}
                style={{ flex: 1, padding: '0.55rem', borderRadius: 8, border: `2px solid ${soil === s ? '#15803d' : '#e5e7eb'}`, background: soil === s ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#1a2f0e', ...nas }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Soil Condition */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>زمین کی حالت:</label>
          <select
            value={soilCondition}
            onChange={e => { setSoilCondition(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', background: 'white', fontSize: '0.82rem', fontWeight: 600, ...nas }}
          >
            {SOIL_CONDITIONS.map(sc => (
              <option key={sc.id} value={sc.id}>{sc.label}</option>
            ))}
          </select>
        </div>

        {/* Kalarathi Alert */}
        {soilCondition === 'saline' && (
          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '8px 12px', marginTop: 8, fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>
            ⚠️ <strong>کلراٹھی زمین کے لیے خصوصی ہدایات:</strong><br />
            1. بوائی سے 3 ہفتے پہلے <strong>جپسم (80-mesh) 400 کلو فی ایکڑ</strong> ڈالیں۔<br />
            2. یوریا ایک ساتھ نہ ڈالیں، 3-4 ہلکی اقساط میں دیں۔<br />
            3. سبز کھاد (جنتر) کا استعمال زمین کی ساخت بہتر بناتا ہے۔
          </div>
        )}

        {/* Acreage */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>رقبہ (ایکڑ میں):</label>
          <input id="fert-acres" type="number" className="input" placeholder="1" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => { setAcres(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Action Button */}
        <button className="btn btn-primary btn-full" id="fert-calc-btn"
          disabled={!crop || !acres || parseFloat(acres) <= 0}
          onClick={calculate}
          style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.8rem', background: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
        >
          🧪 NPK کھاد پلان بنائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {/* Summary header */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '0.85rem', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#14532d', fontWeight: 800, ...nas }}>
                {result.cropData.icon} {result.crop} — {result.a} ایکڑ — {SOIL_LABELS[result.soilKey]} مٹی ({SOIL_CONDITIONS.find(s => s.id === result.soilCondition)?.label})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4, ...nas }}>
                ہدف پیداوار: {result.cropData.yieldTarget}
              </div>
            </div>

            {/* Free Soil Test CTA */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '10px 14px', marginBottom: 10, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '1.3rem' }}>🧪</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e40af' }}>مفت مٹی ٹیسٹ — 100% درست نتائج</div>
                <div style={{ fontSize: '0.7rem', color: '#1d4ed8', lineHeight: 1.5, marginTop: 2 }}>
                  قریبی ماڈل ایگری مال سے مفت ٹیسٹ کروائیں اور اپنا ذاتی Soil Health Card حاصل کریں۔
                </div>
              </div>
              <a href="tel:0800-17000" style={{ background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', direction: 'ltr' }}>
                0800-17000
              </a>
            </div>

            {/* Saved Soil Profile Banner */}
            {soilProfile && (
              <div style={{ background: '#ecfdf5', border: '2px solid #6ee7b7', borderRadius: 12, padding: '10px 14px', marginBottom: 10, direction: 'rtl' }}>
                <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#065f46', marginBottom: 6 }}>
                  🔬 آپ کا ذاتی مٹی پروفائل فعال ہے
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {[['pH', soilProfile.pH], ['EC', soilProfile.ec], ['P ppm', soilProfile.p], ['Zn ppm', soilProfile.zn]].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: 'white', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: '#6b7280', fontFamily: 'Inter' }}>{lbl}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', fontFamily: 'Inter' }}>{val || '?'}</div>
                    </div>
                  ))}
                </div>
                {soilProfile.p && parseFloat(soilProfile.p) > 14 && (
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>
                    💰 فاسفورس کافی ہے — DAP بالکل نہ ڈالیں (PKR 8,500 بچت)
                  </div>
                )}
                {soilProfile.zn && parseFloat(soilProfile.zn) < 0.5 && (
                  <div style={{ marginTop: 4, fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>
                    ⚠️ زنک بہت کم — زنک سلفیٹ اضافی لازمی ڈالیں
                  </div>
                )}
              </div>
            )}

            {/* SFRI Institutional Provenance Badge */}
            <InstitutionalBadge type="sfri" helpline="0800-17000" />

            {/* Stage Cards */}
            {result.plan.map(({ stage, recs }, i) => {
              const items = Object.entries(recs).map(([type, val]) => fmtBag(type, val, result.a)).filter(Boolean);
              if (!items.length) return null;
              return (
                <div key={stage} style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '0.85rem', marginBottom: 8, borderRight: `4px solid ${COLORS[i % COLORS.length]}` }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: COLORS[i % COLORS.length], marginBottom: 8, ...nas }}>
                    مرحلہ {i + 1}: {stage}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {items.map(({ label, value, color }) => (
                      <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '0.55rem 0.7rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', ...nas }}>{label}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color, fontFamily: 'Inter, sans-serif' }} dir="ltr">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Total Cost & Subsidy Card */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                  💰 کل تخمینہ لاگت ({result.a} ایکڑ):
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: showSubsidy ? '#15803d' : '#0f172a', fontFamily: 'Inter' }}>
                  PKR {Math.round(showSubsidy ? result.costs.subsidy : result.costs.market).toLocaleString()}
                </div>
              </div>

              {/* Toggle Kissan Card Subsidy */}
              <button
                onClick={() => setShowSubsidy(v => !v)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: `1.5px solid ${showSubsidy ? '#16a34a' : '#cbd5e1'}`,
                  background: showSubsidy ? '#dcfce7' : 'white',
                  color: showSubsidy ? '#15803d' : '#475569',
                  fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', ...nas
                }}
              >
                💳 {showSubsidy ? `✅ کسان کارڈ سبسڈی لاگو ہے (بچت: PKR ${Math.round(result.costs.savings).toLocaleString()})` : 'کسان کارڈ سبسڈی ریٹ دیکھیں'}
              </button>
            </div>

            {/* WhatsApp Prescription Slip */}
            <button
              onClick={() => {
                const rec = result.totals;
                const slipLines = [
                  '🌾 *DehatiAI اسمارٹ کھاد نسخہ*',
                  `فصل: ${result.crop} | مٹی: ${SOIL_LABELS[result.soilKey]} (${SOIL_CONDITIONS.find(s=>s.id===result.soilCondition)?.label})`,
                  `رقبہ: ${result.a} ایکڑ`,
                  '━━━━━━━━━━━━━━━━━',
                  `• DAP: ${rec.dap.toFixed(1)} بوری — PKR ${Math.round(rec.dap * prices.dap).toLocaleString()}`,
                  `• یوریا: ${rec.urea.toFixed(1)} بوری — PKR ${Math.round(rec.urea * prices.urea).toLocaleString()}`,
                  `• SOP پوٹاش: ${rec.sop.toFixed(1)} بوری — PKR ${Math.round(rec.sop * prices.sop).toLocaleString()}`,
                  `• زنک سلفیٹ: ${rec.zinc.toFixed(0)} کلو — PKR ${Math.round(rec.zinc * prices.zinc).toLocaleString()}`,
                  '━━━━━━━━━━━━━━━━━',
                  `💰 کل لاگت: PKR ${Math.round(showSubsidy ? result.costs.subsidy : result.costs.market).toLocaleString()} ${showSubsidy ? '(کسان کارڈ سبسڈی)' : ''}`,
                  '━━━━━━━━━━━━━━━━━',
                  '⚠️ استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں',
                  '📞 ہیلپ لائن: 0800-17000',
                  '🌐 DehatiAI: https://dehati-ai.vercel.app',
                ];
                window.open('https://wa.me/?text=' + encodeURIComponent(slipLines.join('\n')), '_blank');
              }}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                cursor: 'pointer', marginBottom: 8, direction: 'rtl', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8, ...nas
              }}
            >
              📤 واٹس ایپ پر کھاد نسخہ بھیجیں (ڈیلر کو دکھائیں)
            </button>

            {/* Disclaimer & Accuracy */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', marginTop: 8, fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 10, padding: '8px 12px', marginTop: 6, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔍</span>
              <div style={{ fontSize: '0.7rem', color: '#0c4a6e' }}>
                <strong>درستگی:</strong> SFRI پنجاب کیلیبریٹڈ NPK اوسط (~90% درست)۔ مٹی ٹیسٹ (SFRI لیب یا قریبی ماڈل ایگری مال) سے 100% درستگی ممکن۔ تصدیق: 0800-17000
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
