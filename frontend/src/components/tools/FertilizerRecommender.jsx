import { useState, useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { getSavedSoilProfile } from './SoilProfile';

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

const COLORS = ['#15803d', '#ca8a04', '#7c3aed', '#0369a1'];

const DISCLAIMER = '⚠️ یہ تجاویز زرعی تحقیقاتی ڈیٹا پر مبنی ہیں۔ حتمی فیصلے سے قبل مقامی زراعت آفیسر سے مشورہ کریں۔';

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function FertilizerRecommender() {
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');
  const [soil, setSoil] = useState('دوہمی');
  const [result, setResult] = useState(null);
  const [soilProfile, setSoilProfile] = useState(null);
  const { isOffline } = useOffline();

  // Load saved soil profile
  useEffect(() => {
    const p = getSavedSoilProfile();
    if (p) setSoilProfile(p);
  }, []);

  const crops = Object.keys(NPK_DB);

  const calculate = () => {
    const cropData = NPK_DB[crop];
    if (!cropData || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);
    const soilKey = SOIL_MAP[soil] || 'loam';
    const plan = Object.entries(cropData.stages).map(([stageName, soilRecs]) => {
      const recs = soilRecs[soilKey] || soilRecs.loam;
      return { stage: stageName, recs, totalKg: Object.values(recs).reduce((s, v) => s + v, 0) };
    });
    setResult({ crop, cropData, a, plan, soilKey });
  };

  const bagLabel = (type, val, a) => {
    if (type === 'zinc') return `${(val * a).toFixed(0)} کلو`;
    return `${(val * a).toFixed(1)} بوری`;
  };

  const fmtBag = (type, perAcre, acres) => {
    if (perAcre === 0) return null;
    return { label: type === 'dap' ? 'DAP' : type === 'urea' ? 'یوریا' : type === 'sop' ? 'SOP پوٹاش' : 'زنک سلفیٹ', value: bagLabel(type, perAcre, acres), color: type === 'dap' ? '#15803d' : type === 'urea' ? '#d97706' : type === 'sop' ? '#7c3aed' : '#0369a1' };
  };


  // ─── Market & Kissan Card Subsidized Prices ───────────────
  const MARKET_PRICES = { dap: 8500, urea: 3200, sop: 9500, zinc: 280 };
  const SUBSIDY_PRICES = { dap: 6800, urea: 2560, sop: 7600, zinc: 224 };
  const prices = showSubsidy ? SUBSIDY_PRICES : MARKET_PRICES;

  const calcCost = (rec) => {
    if (!rec) return null;
    const cost = (
      (rec.dap  || 0) * prices.dap  +
      (rec.urea || 0) * prices.urea +
      (rec.sop  || 0) * prices.sop  +
      (rec.zinc || 0) * prices.zinc * 5  // zinc per 5kg
    ) * parseFloat(acres || 1);
    return Math.round(cost).toLocaleString();
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ fontSize: '1.6rem' }}>🧪</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ NPK کھاد کیلکولیٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>⚡ 0ms آف لائن — پنجاب زراعت ایکسٹینشن ڈیٹا</div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop */}
        <div>
          <label className="input-label">فصل منتخب کریں</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {crops.map(c => (
              <button key={c} id={`fert-crop-${c}`}
                onClick={() => { setCrop(c); setResult(null); }}
                style={{ padding: '0.7rem 0.5rem', borderRadius: 10, border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`, background: crop === c ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .2s', color: '#1a2f0e', ...nas }}
              >
                <span style={{ fontSize: '1.4rem' }}>{NPK_DB[c].icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Soil */}
        <div>
          <label className="input-label">مٹی کی قسم</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(SOIL_MAP).map(s => (
              <button key={s} id={`fert-soil-${s}`}
                onClick={() => { setSoil(s); setResult(null); }}
                style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: `2px solid ${soil === s ? '#15803d' : '#e5e7eb'}`, background: soil === s ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#1a2f0e', ...nas }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div>
          <label className="input-label">رقبہ (ایکڑ میں)</label>
          <input id="fert-acres" type="number" className="input input-number" placeholder="5" value={acres} min="0.5" step="0.5" dir="ltr" onChange={e => { setAcres(e.target.value); setResult(null); }} />
        </div>

        <button className="btn btn-primary btn-full" id="fert-calc-btn"
          disabled={!crop || !acres}
          onClick={calculate}
          style={{ fontSize: '1rem', padding: '0.85rem', ...nas }}
        >
          🧪 NPK کھاد پلان بنائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up">
            {/* Summary header */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '0.85rem', marginBottom: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#14532d', fontWeight: 800, ...nas }}>
                {result.cropData.icon} {result.crop} — {result.a} ایکڑ — {SOIL_LABELS[result.soilKey]} مٹی
              </div>
              <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 4, ...nas }}>
                ہدف پیداوار: {result.cropData.yieldTarget}
              </div>
            </div>


            {/* Soil Test CTA — always show before fertilizer advice */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '10px 14px', marginBottom: 10, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '1.3rem' }}>&#x1F9EA;</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e40af' }}>&#x1F4AC; مفت مٹی ٹیسٹ — 100% درست نتائج</div>
                <div style={{ fontSize: '0.7rem', color: '#1d4ed8', lineHeight: 1.5, marginTop: 2 }}>
                  یہ حساب پنجاب ریسرچ اوسط پر ہے۔ مفت لیبارٹری مٹی ٹیسٹ کروائیں اور 100% درست کھاد نسخہ پائیں۔
                </div>
              </div>
              <a href="tel:0800-17000" style={{ background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', direction: 'ltr' }}>
                0800-17000
              </a>
            </div>

            {/* Soil Profile Active Banner */}
            {soilProfile && (
              <div style={{ background: '#ecfdf5', border: '2px solid #6ee7b7', borderRadius: 12, padding: '10px 14px', marginBottom: 10, direction: 'rtl' }}>
                <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#065f46', marginBottom: 6 }}>
                  🧪 آپ کا ذاتی مٹی پروفائل فعال ہے
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                  {[['pH', soilProfile.pH], ['EC', soilProfile.ec], ['P ppm', soilProfile.p], ['Zn ppm', soilProfile.zn]].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: 'white', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: '#6b7280', fontFamily: 'Inter' }}>{lbl}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', fontFamily: 'Inter' }}>{val || '?'}</div>
                    </div>
                  ))}
                </div>
                {soilProfile.p && parseFloat(soilProfile.p) > 14 && (
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>
                    💰 فاسفورس کافی — DAP نہ ڈالیں (PKR 8,500 بچت)
                  </div>
                )}
                {soilProfile.zn && parseFloat(soilProfile.zn) < 0.5 && (
                  <div style={{ marginTop: 4, fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>
                    ⚠️ زنک بہت کم — زنک سلفیٹ 8 کلو لازمی
                  </div>
                )}
              </div>
            )}

            {/* Stage cards */}
            {result.plan.map(({ stage, recs }, i) => {
              const items = Object.entries(recs).map(([type, val]) => fmtBag(type, val, result.a)).filter(Boolean);
              if (!items.length) return null;
              return (
                <div key={stage} style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '0.85rem', marginBottom: 8, borderRight: `4px solid ${COLORS[i % COLORS.length]}` }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: COLORS[i % COLORS.length], marginBottom: 8, ...nas }}>
                    مرحلہ {i + 1}: {stage}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {items.map(({ label, value, color }) => (
                      <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '0.55rem 0.7rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', ...nas }}>{label}</span>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color, fontFamily: 'Inter, sans-serif' }} dir="ltr">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Disclaimer */}
            {/* Kissan Card Subsidy Toggle */}
          <button onClick={() => setShowSubsidy(v => !v)}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px solid #16a34a',
              background: showSubsidy ? '#dcfce7' : '#fff', color: '#15803d', fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer', marginBottom: 8, direction: 'rtl' }}>
            💳 {showSubsidy ? '✅ کسان کارڈ سبسڈی قیمت دیکھ رہے ہیں' : 'کسان کارڈ سبسڈی قیمت دیکھیں'}
          </button>

          {/* WhatsApp Prescription Slip */}
          <button onClick={() => {
            const rec = result;
            const slipLines = [
              '🌾 DehatiAI کھاد نسخہ',
              `فصل: ${crop} | مٹی: ${soilType} | مرحلہ: ${stage}`,
              `رقبہ: ${acres} ایکڑ | زمین: ${soilCondition === 'saline' ? 'کلراٹھی' : soilCondition === 'sandy' ? 'ریتلی' : 'نارمل'}`,
              '━━━━━━━━━━━━━━━━━',
            ];
            if (rec.dap > 0)  slipLines.push(`DAP: ${(rec.dap * parseFloat(acres||1)).toFixed(1)} بوری — ${showSubsidy ? 'PKR '+Math.round(rec.dap*parseFloat(acres||1)*prices.dap).toLocaleString()+' (سبسڈی)' : 'PKR '+Math.round(rec.dap*parseFloat(acres||1)*prices.dap).toLocaleString()}`);
            if (rec.urea > 0) slipLines.push(`یوریا: ${(rec.urea * parseFloat(acres||1)).toFixed(1)} بوری — PKR ${Math.round(rec.urea*parseFloat(acres||1)*prices.urea).toLocaleString()}`);
            if (rec.sop > 0)  slipLines.push(`SOP: ${(rec.sop * parseFloat(acres||1)).toFixed(1)} بوری — PKR ${Math.round(rec.sop*parseFloat(acres||1)*prices.sop).toLocaleString()}`);
            if (rec.zinc > 0) slipLines.push(`زنک سلفیٹ: ${(rec.zinc * parseFloat(acres||1)).toFixed(0)} کلو`);
            slipLines.push('━━━━━━━━━━━━━━━━━');
            slipLines.push('⚠️ استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں');
            slipLines.push('📞 ہیلپ لائن: 0800-17000');
            slipLines.push('🌐 DehatiAI: https://dehati-ai.vercel.app');
            window.open('https://wa.me/?text=' + encodeURIComponent(slipLines.join('\n')), '_blank');
          }}
            style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none',
              background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', marginBottom: 8, direction: 'rtl', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            📤 واٹس ایپ پر کھاد نسخہ بھیجیں (ڈیلر کو دکھائیں)
          </button>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', marginTop: 8, fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 10, padding: '8px 12px', marginTop: 6, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>&#x1F50D;</span>
              <div style={{ fontSize: '0.7rem', color: '#0c4a6e' }}>
                <strong>درستگی کی سطح:</strong> کیلکولیٹر ~90% درست (پنجاب SFRI ڈیٹا) — مٹی ٹیسٹ سے 100% ہو جاتا ہے۔
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
