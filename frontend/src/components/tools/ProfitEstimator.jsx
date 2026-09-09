import { useState, useEffect } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

// ─── Punjab Agriculture Dept (AARI / Agri Economics Wing) 2025–2026 Benchmarks ─
const CROP_DATA = {
  'گندم': {
    yieldPerAcre: 42, mandiPrice: 3900, unit: 'من', icon: '🌾',
    benchmarks: { seed: 9000, prep: 12000, fert: 36000, water: 12000, spray: 7000, harvest: 14000 },
    defaultCost: 90000, source: 'AARI فیصل آباد 2025-26'
  },
  'کپاس': {
    yieldPerAcre: 22, mandiPrice: 7800, unit: 'من', icon: '🌿',
    benchmarks: { seed: 12000, prep: 12000, fert: 38000, water: 16000, spray: 28000, harvest: 24000 },
    defaultCost: 130000, source: 'CCRI ملتان / AARI 2025-26'
  },
  'چاول': {
    yieldPerAcre: 45, mandiPrice: 4400, unit: 'من', icon: '🌾',
    benchmarks: { seed: 6000, prep: 14000, fert: 32000, water: 22000, spray: 12000, harvest: 16000 },
    defaultCost: 102000, source: 'RRI کالا شاہ کاکو 2025-26'
  },
  'گنا': {
    yieldPerAcre: 850, mandiPrice: 450, unit: 'من', icon: '🎋',
    benchmarks: { seed: 28000, prep: 18000, fert: 48000, water: 35000, spray: 12000, harvest: 42000 },
    defaultCost: 183000, source: 'SRI فیصل آباد 2025-26'
  },
  'مکئی': {
    yieldPerAcre: 80, mandiPrice: 1850, unit: 'من', icon: '🌽',
    benchmarks: { seed: 14000, prep: 10000, fert: 34000, water: 14000, spray: 8000, harvest: 12000 },
    defaultCost: 92000, source: 'MMRI یوسف والا / AARI 2025-26'
  },
  'آلو': {
    yieldPerAcre: 280, mandiPrice: 950, unit: 'من', icon: '🥔',
    benchmarks: { seed: 55000, prep: 14000, fert: 48000, water: 18000, spray: 26000, harvest: 22000 },
    defaultCost: 183000, source: 'AARI فیصل آباد 2025-26'
  },
  'ٹماٹر': {
    yieldPerAcre: 280, mandiPrice: 1400, unit: 'من', icon: '🍅',
    benchmarks: { seed: 18000, prep: 14000, fert: 45000, water: 25000, spray: 22000, harvest: 35000 },
    defaultCost: 159000, source: 'VRI فیصل آباد 2025-26'
  },
  'پیاز': {
    yieldPerAcre: 160, mandiPrice: 1600, unit: 'من', icon: '🧅',
    benchmarks: { seed: 16000, prep: 12000, fert: 38000, water: 20000, spray: 15000, harvest: 25000 },
    defaultCost: 126000, source: 'VRI فیصل آباد 2025-26'
  },
  'مرچ': {
    yieldPerAcre: 20, mandiPrice: 17000, unit: 'من', icon: '🌶️',
    benchmarks: { seed: 15000, prep: 12000, fert: 42000, water: 22000, spray: 30000, harvest: 32000 },
    defaultCost: 153000, source: 'AARI فیصل آباد 2025-26'
  },
  'سرسوں': {
    yieldPerAcre: 22, mandiPrice: 5400, unit: 'من', icon: '🌻',
    benchmarks: { seed: 4000, prep: 8000, fert: 22000, water: 8000, spray: 5000, harvest: 9000 },
    defaultCost: 56000, source: 'ORI فیصل آباد 2025-26'
  },
};

const COST_FIELDS = [
  { key: 'seed',    label: 'بیج / پنیری',                 icon: '🌱', placeholder: '9000' },
  { key: 'prep',    label: 'زمین تیاری (لیزر+ہل)',       icon: '🚜', placeholder: '12000' },
  { key: 'fert',    label: 'کھاد (DAP+یوریا+پوٹاش)',     icon: '🧪', placeholder: '36000' },
  { key: 'water',   label: 'آبپاشی / ڈیزل / ٹیوب ویل',    icon: '💧', placeholder: '12000' },
  { key: 'spray',   label: 'سپرے / جڑی بوٹی و کیڑے',      icon: '💊', placeholder: '7000' },
  { key: 'harvest', label: 'کٹائی / تھریشر / مزدوری',     icon: '✂️', placeholder: '14000' },
];

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function ProfitEstimator() {
  const [crop, setCrop]                 = useState('گندم');
  const [acres, setAcres]               = useState('5');
  const [expectedYield, setExpectedYield] = useState('42');
  const [costs, setCosts]               = useState({});
  const [mandiOverride, setMandiOverride] = useState('');
  const [result, setResult]             = useState(null);

  const setField = (key, val) => setCosts(prev => ({ ...prev, [key]: val }));

  // Auto-load defaults when crop changes
  useEffect(() => {
    if (CROP_DATA[crop]) {
      setExpectedYield(CROP_DATA[crop].yieldPerAcre.toString());
      setMandiOverride(CROP_DATA[crop].mandiPrice.toString());
      setResult(null);
    }
  }, [crop]);

  // Fill official AARI 2025-26 benchmarks
  const handleAutoFillBenchmarks = () => {
    const info = CROP_DATA[crop];
    if (!info) return;
    setCosts({ ...info.benchmarks });
    setExpectedYield(info.yieldPerAcre.toString());
    setMandiOverride(info.mandiPrice.toString());
    setResult(null);
  };

  // Clear to customize from scratch
  const handleClearCosts = () => {
    setCosts({});
    setResult(null);
  };

  const calculate = () => {
    const cropInfo = CROP_DATA[crop];
    if (!cropInfo || !acres || parseFloat(acres) <= 0) return;
    const a = parseFloat(acres);

    // Mandi price: user local input takes top priority, then snapshot, then default
    let mandiPrice = parseFloat(mandiOverride) || cropInfo.mandiPrice;

    // Yield: user custom yield takes priority, otherwise crop default
    const yldPerAcre = parseFloat(expectedYield) > 0 ? parseFloat(expectedYield) : cropInfo.yieldPerAcre;

    // Costs: sum user-entered costs; if blank, fallback to crop's realistic benchmark
    const customSum = COST_FIELDS.reduce((sum, f) => sum + (parseFloat(costs[f.key]) || 0), 0);
    const isDefaultCostUsed = customSum === 0;
    const totalCostPerAcre = isDefaultCostUsed ? cropInfo.defaultCost : customSum;
    const totalCost = totalCostPerAcre * a;

    // Revenue
    const totalYield = yldPerAcre * a;
    const grossRevenue = totalYield * mandiPrice;
    const netProfit = grossRevenue - totalCost;
    const roi = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : 0;
    const breakevenPerUnit = totalCost > 0 && totalYield > 0 ? Math.ceil(totalCost / totalYield) : 0;

    setResult({
      a, crop, cropInfo, totalCost, grossRevenue, netProfit, roi,
      totalYield, yldPerAcre, mandiPrice, breakevenPerUnit, isDefaultCostUsed, totalCostPerAcre
    });
  };

  const fmt = n => Math.abs(n).toLocaleString('ur-PK');

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>📈</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ منافع و ROI کیلکولیٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>
            مقامی منڈی قیمت + کسان کے اصل اخراجات + AARI 2025-26 ڈیٹا
          </div>
        </div>
      </div>

      <div className="form-group">
        {/* Crop Selection */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>فصل منتخب کریں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {Object.entries(CROP_DATA).map(([c, d]) => (
              <button key={c} id={`profit-crop-${c}`}
                onClick={() => { setCrop(c); setResult(null); }}
                style={{
                  padding: '0.55rem 0.3rem', borderRadius: 10,
                  border: `2px solid ${crop === c ? '#15803d' : '#e5e7eb'}`,
                  background: crop === c ? '#f0fdf4' : 'white',
                  fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  color: crop === c ? '#15803d' : '#334155', ...nas
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Acreage & Custom Expected Yield */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>کل رقبہ (ایکڑ):</label>
            <input
              id="profit-acres" type="number" className="input input-number" placeholder="5"
              value={acres} min="0.5" step="0.5" dir="ltr"
              onChange={e => { setAcres(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
          </div>
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>متوقع پیداوار (من / ایکڑ):</label>
            <input
              type="number" className="input input-number" placeholder="42"
              value={expectedYield} min="1" step="1" dir="ltr"
              onChange={e => { setExpectedYield(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            <div style={{ fontSize: '.65rem', color: '#166534', marginTop: 2 }}>AARI اوسط: {CROP_DATA[crop]?.yieldPerAcre} من/ایکڑ</div>
          </div>
        </div>

        {/* Local Mandi Price Input */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="input-label" style={{ fontWeight: 700, margin: 0 }}>
              مقامی منڈی قیمت (روپے فی من):
            </label>
            <span style={{ fontSize: '.68rem', color: '#15803d', fontWeight: 700 }}>
              {mandiOverride === CROP_DATA[crop]?.mandiPrice.toString() ? '🏛️ AARI سرکاری اوسط' : '📍 کسان کی مقامی منڈی'}
            </span>
          </div>
          <input
            id="profit-mandi" type="number" className="input input-number" placeholder="3900"
            value={mandiOverride} min="10" dir="ltr"
            onChange={e => { setMandiOverride(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
          />
          <div style={{ fontSize: '.68rem', color: '#6b7280', marginTop: 3 }}>
            💡 اپنے ضلع (مثلاً ملتان، ساہیوال، فیصل آباد، اوکاڑہ) کی موجودہ منڈی بولی درج کریں تاکہ خالص منافع 100% درست ہو سکے۔
          </div>
        </div>

        {/* Cost Inputs & Benchmark Auto-Fill Tools */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="input-label" style={{ fontWeight: 700, margin: 0 }}>خرچہ فی ایکڑ (روپے میں):</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button" onClick={handleAutoFillBenchmarks}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #10b981', background: '#ecfdf5', color: '#047857', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⚡ AARI 2025-26 اوسط بھریں
              </button>
              <button
                type="button" onClick={handleClearCosts}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f8fafc', color: '#64748b', fontSize: '.68rem', cursor: 'pointer' }}
              >
                🔄 خالی کریں
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {COST_FIELDS.map(f => (
              <div key={f.key}>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 3, ...nas }}>{f.icon} {f.label}</div>
                <input
                  id={`profit-cost-${f.key}`} type="number" className="input input-number"
                  placeholder={CROP_DATA[crop]?.benchmarks?.[f.key] ? `${CROP_DATA[crop].benchmarks[f.key]}` : f.placeholder}
                  value={costs[f.key] || ''} min="0" dir="ltr"
                  style={{ width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.9rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontFamily: 'Inter', fontWeight: 700 }}
                  onChange={e => { setField(f.key, e.target.value); setResult(null); }}
                />
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full" id="profit-calc-btn"
          disabled={!crop || !acres}
          onClick={calculate}
          style={{ width: '100%', marginTop: 14, fontSize: '1rem', padding: '0.85rem', background: 'linear-gradient(135deg, #14532d, #15803d)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
        >
          📊 منافع و ROI حساب لگائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'کل پیداوار', value: `${result.totalYield.toLocaleString()} من`, color: '#0369a1', bg: '#eff6ff', sub: `${result.yldPerAcre} من/ایکڑ` },
                { label: 'مارکیٹ قیمت', value: `₨${fmt(result.mandiPrice)}/من`, color: '#7c3aed', bg: '#f5f3ff', sub: 'مقامی منڈی ریٹ' },
                { label: 'مجموعی آمدنی', value: `₨${fmt(result.grossRevenue)}`, color: '#15803d', bg: '#f0fdf4', sub: 'Gross Revenue' },
                { label: result.isDefaultCostUsed ? 'کل خرچہ (علاقائی اوسط)' : 'کل خرچہ (کسان کی لاگت)', value: `₨${fmt(result.totalCost)}`, color: '#dc2626', bg: '#fef2f2', sub: `₨${fmt(result.totalCostPerAcre)} فی ایکڑ` },
              ].map(({ label, value, color, bg, sub }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginBottom: 2, ...nas }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color, fontFamily: 'Inter' }} dir="ltr">{value}</div>
                  {sub && <div style={{ fontSize: '.62rem', color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {result.isDefaultCostUsed && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 10px', fontSize: '.72rem', color: '#166534', marginBottom: 8, textAlign: 'center' }}>
                💡 آپ نے خرچہ فیلڈز خالی رکھی تھیں، اس لیے AARI فیصل آباد کی سرکاری اوسط (₨{result.totalCostPerAcre.toLocaleString()} فی ایکڑ) لاگو کی گئی ہے۔
              </div>
            )}

            {/* Net Profit Banner */}
            <div style={{ background: result.netProfit >= 0 ? 'linear-gradient(135deg, #14532d, #15803d)' : 'linear-gradient(135deg, #7f1d1d, #dc2626)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 8, color: 'white' }}>
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: '0.78rem', ...nas }}>
                {result.netProfit >= 0 ? '🎉 خالص متوقع منافع' : '⚠️ متوقع نقصان'}
              </div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '2.1rem', fontFamily: 'Inter', margin: '4px 0' }} dir="ltr">
                ₨{fmt(result.netProfit)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6, fontSize: '.8rem' }}>
                <div>ROI: <strong style={{ fontFamily: 'Inter' }}>{result.roi}%</strong></div>
                <div>فی ایکڑ منافع: <strong style={{ fontFamily: 'Inter' }}>₨{fmt(result.netProfit / result.a)}</strong></div>
              </div>
            </div>

            {/* Breakeven */}
            {result.breakevenPerUnit > 0 && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '0.85rem', textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', ...nas }}>⚖️ نقصان سے بچاؤ کی بریک ایون حد (Breakeven Price):</div>
                <div style={{ fontWeight: 900, fontSize: '1.6rem', color: '#92400e', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                  ₨{result.breakevenPerUnit.toLocaleString()} / من
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a16207', marginTop: 4, ...nas }}>
                  اگر منڈی میں قیمت ₨{result.breakevenPerUnit.toLocaleString()} سے کم ہو تو بیعانہ یا فروخت نہ کریں۔
                </div>
              </div>
            )}

            {/* Prominent Legal / Agronomic Warning & Disclaimer */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: '0.72rem', color: '#78350f', lineHeight: 1.6, ...nas }}>
              <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4, fontSize: '.78rem' }}>
                ⚠️ تحریری ڈس کلیمر (قانونی و مارکیٹ وارننگ):
              </div>
              یہ حساب کتاب ایوب زرعی تحقیقاتی ادارہ (AARI) فیصل آباد اور زرعی اکنامکس ونگ پنجاب کے 2025–2026 سروے ڈیٹا پر مبنی ایک تخمینہ ہے۔ اصل آمدنی، کھاد و ڈیزل کی لاگت اور غلہ منڈی کی روزانہ بولیاں موسمی حالات کے مطابق تبدیل ہوتی رہتی ہیں۔ کسی بھی بڑے تجارتی سودے یا زمین ٹھیکے سے قبل مقامی غلہ منڈی کے نرخ کی تصدیق ضرور کریں۔
            </div>

            <InstitutionalBadge type="aari" helpline="0800-17000" />
          </div>
        )}
      </div>
    </div>
  );
}
