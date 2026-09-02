import { useState } from 'react';

// ─── Punjab Agriculture Dept crop yield, mandi price & benchmark cost data ────
const CROP_DATA = {
  'گندم':   { yieldPerAcre: 40,  mandiPrice: 3900,  unit: 'من', icon: '🌾', defaultCost: 85000 },
  'کپاس':   { yieldPerAcre: 22,  mandiPrice: 7500,  unit: 'من', icon: '🌿', defaultCost: 110000 },
  'چاول':   { yieldPerAcre: 45,  mandiPrice: 4200,  unit: 'من', icon: '🌾', defaultCost: 95000 },
  'گنا':    { yieldPerAcre: 850, mandiPrice: 425,   unit: 'من', icon: '🎋', defaultCost: 180000 },
  'مکئی':   { yieldPerAcre: 75,  mandiPrice: 1800,  unit: 'من', icon: '🌽', defaultCost: 90000 },
  'آلو':    { yieldPerAcre: 260, mandiPrice: 850,   unit: 'من', icon: '🥔', defaultCost: 160000 },
  'ٹماٹر':  { yieldPerAcre: 250, mandiPrice: 1200,  unit: 'من', icon: '🍅', defaultCost: 150000 },
  'پیاز':   { yieldPerAcre: 150, mandiPrice: 1400,  unit: 'من', icon: '🧅', defaultCost: 120000 },
  'مرچ':    { yieldPerAcre: 18,  mandiPrice: 16000, unit: 'من', icon: '🌶️', defaultCost: 140000 },
  'سرسوں':  { yieldPerAcre: 22,  mandiPrice: 5000,  unit: 'من', icon: '🌻', defaultCost: 55000 },
};

const COST_FIELDS = [
  { key: 'seed',    label: 'بیج / پنیری',                 icon: '🌱', placeholder: '7000' },
  { key: 'prep',    label: 'زمین تیاری (لیزر+ہل)',       icon: '🚜', placeholder: '12000' },
  { key: 'fert',    label: 'کھاد (DAP+یوریا+پوٹاش)',     icon: '🧪', placeholder: '30000' },
  { key: 'water',   label: 'آبپاشی / ڈیزل / ٹیوب ویل',    icon: '💧', placeholder: '15000' },
  { key: 'spray',   label: 'سپرے / جڑی بوٹی و کیڑے',      icon: '💊', placeholder: '10000' },
  { key: 'harvest', label: 'کٹائی / تھریشر / مزدوری',     icon: '✂️', placeholder: '12000' },
];

const DISCLAIMER = '⚠️ یہ تجاویز زرعی تحقیقاتی ڈیٹا پر مبنی ہیں۔ حتمی فیصلے سے قبل مقامی زراعت آفیسر سے مشورہ کریں۔';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function ProfitEstimator() {
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');
  const [costs, setCosts] = useState({});
  const [mandiOverride, setMandiOverride] = useState('');
  const [result, setResult] = useState(null);

  const setField = (key, val) => setCosts(prev => ({ ...prev, [key]: val }));

  const calculate = () => {
    const cropInfo = CROP_DATA[crop];
    if (!cropInfo || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);

    // Mandi price: try live snapshot first, then override, then default
    let mandiPrice = cropInfo.mandiPrice;
    try {
      const snap = JSON.parse(localStorage.getItem('dehati_mandi_prices_snapshot') || '[]');
      const match = snap.find(r => r.crop?.includes(crop.slice(0, 3)) || crop.includes(r.crop?.slice(0, 3)));
      if (match?.price) mandiPrice = parseFloat(match.price);
    } catch {}
    if (mandiOverride && parseFloat(mandiOverride) > 0) mandiPrice = parseFloat(mandiOverride);

    // Investment: sum user-entered costs; if all left blank, fallback to crop's realistic benchmark
    const customSum = COST_FIELDS.reduce((sum, f) => sum + (parseFloat(costs[f.key]) || 0), 0);
    const isDefaultCostUsed = customSum === 0;
    const totalCostPerAcre = isDefaultCostUsed ? (cropInfo.defaultCost || 85000) : customSum;
    const totalCost = totalCostPerAcre * a;

    // Revenue
    const totalYield = cropInfo.yieldPerAcre * a;
    const grossRevenue = totalYield * mandiPrice;
    const netProfit = grossRevenue - totalCost;
    const roi = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : 0;
    const breakevenPerUnit = totalCost > 0 && totalYield > 0 ? Math.ceil(totalCost / totalYield) : 0;

    setResult({
      a, crop, cropInfo, totalCost, grossRevenue, netProfit, roi,
      totalYield, mandiPrice, breakevenPerUnit, isDefaultCostUsed, totalCostPerAcre
    });
  };

  const fmt = n => Math.abs(n).toLocaleString('ur-PK');

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ fontSize: '1.6rem' }}>📈</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ منافع کیلکولیٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>ROI تجزیہ + منڈی انضمام + بریک ایون قیمت</div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop Selection */}
        <div>
          <label className="input-label">فصل منتخب کریں</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {Object.entries(CROP_DATA).map(([c, d]) => (
              <button key={c} id={`profit-crop-${c}`}
                onClick={() => { setCrop(c); setResult(null); }}
                style={{ padding: '0.55rem 0.3rem', borderRadius: 10, border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`, background: crop === c ? '#f0fdf4' : 'white', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#1a2f0e', ...nas }}
              >
                <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div>
          <label className="input-label">کل رقبہ (ایکڑ)</label>
          <input id="profit-acres" type="number" className="input input-number" placeholder="5" value={acres} min="0.5" step="0.5" dir="ltr" onChange={e => { setAcres(e.target.value); setResult(null); }} />
        </div>

        {/* Cost Inputs */}
        <div>
          <label className="input-label" style={{ marginBottom: 8 }}>خرچہ فی ایکڑ (روپے میں)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {COST_FIELDS.map(f => (
              <div key={f.key}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 3, ...nas }}>{f.icon} {f.label}</div>
                <input id={`profit-cost-${f.key}`} type="number" className="input input-number" placeholder={f.placeholder} value={costs[f.key] || ''} min="0" dir="ltr" style={{ padding: '0.55rem 0.7rem', fontSize: '0.9rem' }} onChange={e => { setField(f.key, e.target.value); setResult(null); }} />
              </div>
            ))}
          </div>
        </div>

        {/* Optional mandi override */}
        <div>
          <label className="input-label">منڈی قیمت (فی من) — اختیاری</label>
          <div style={{ position: 'relative' }}>
            <input id="profit-mandi" type="number" className="input input-number" placeholder={crop ? `${CROP_DATA[crop]?.mandiPrice} (خودکار)` : 'منڈی قیمت'} value={mandiOverride} min="0" dir="ltr" onChange={e => { setMandiOverride(e.target.value); setResult(null); }} />
            {!mandiOverride && crop && (
              <div style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: '#15803d', pointerEvents: 'none', fontFamily: 'Inter' }}>
                ₨{CROP_DATA[crop]?.mandiPrice}/من (خودکار)
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-primary btn-full" id="profit-calc-btn"
          disabled={!crop || !acres}
          onClick={calculate}
          style={{ fontSize: '1rem', padding: '0.85rem', ...nas }}
        >
          📊 منافع و ROI حساب لگائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up">
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'کل پیداوار', value: `${result.totalYield.toLocaleString()} من`, color: '#0369a1', bg: '#eff6ff' },
                { label: 'مارکیٹ قیمت', value: `₨${fmt(result.mandiPrice)}/من`, color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'مجموعی آمدنی', value: `₨${fmt(result.grossRevenue)}`, color: '#15803d', bg: '#f0fdf4' },
                { label: result.isDefaultCostUsed ? 'کل خرچہ (علاقائی اوسط)' : 'کل خرچہ', value: `₨${fmt(result.totalCost)}`, color: '#dc2626', bg: '#fef2f2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginBottom: 4, ...nas }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color, fontFamily: 'Inter' }} dir="ltr">{value}</div>
                </div>
              ))}
            </div>

            {result.isDefaultCostUsed && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', fontSize: '.72rem', color: '#166534', marginBottom: 8, textAlign: 'center' }}>
                💡 خرچہ فیلڈز خالی تھیں، اس لیے پنجاب زرعی اکنامکس کی اوسط لاگت (₨{result.totalCostPerAcre.toLocaleString()} فی ایکڑ) لاگو کی گئی ہے۔
              </div>
            )}

            {/* Net Profit Banner */}
            <div style={{ background: result.netProfit >= 0 ? 'linear-gradient(135deg, #14532d, #15803d)' : 'linear-gradient(135deg, #7f1d1d, #dc2626)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 8 }}>
              <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '0.78rem', ...nas }}>
                {result.netProfit >= 0 ? '🎉 خالص منافع' : '⚠️ خالص نقصان'}
              </div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '2rem', fontFamily: 'Inter' }} dir="ltr">
                ₨{fmt(result.netProfit)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                <div style={{ color: 'rgba(255,255,255,.9)', fontSize: '0.78rem', ...nas }}>
                  ROI: <span style={{ fontFamily: 'Inter', fontWeight: 800 }}>{result.roi}%</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,.9)', fontSize: '0.78rem', ...nas }}>
                  فی ایکڑ: <span style={{ fontFamily: 'Inter', fontWeight: 800 }}>₨{fmt(result.netProfit / result.a)}</span>
                </div>
              </div>
            </div>

            {/* Breakeven */}
            {result.breakevenPerUnit > 0 && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '0.85rem', textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', ...nas }}>⚖️ بریک ایون قیمت (فی من)</div>
                <div style={{ fontWeight: 800, fontSize: '1.6rem', color: '#92400e', fontFamily: 'Inter' }} dir="ltr">
                  ₨{result.breakevenPerUnit.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a16207', marginTop: 4, ...nas }}>
                  ₨{result.breakevenPerUnit.toLocaleString()} فی من سے کم ریٹ پر نہ بیچیں
                </div>
              </div>
            )}

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
