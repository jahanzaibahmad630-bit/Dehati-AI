import { useState } from 'react';
import { useOffline } from '../../hooks/useOffline';

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
  const { isOffline } = useOffline();

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
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', marginTop: 8, fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
