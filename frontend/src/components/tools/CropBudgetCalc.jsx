import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

// ── Punjab Crop Budget Data (Agriculture Economics Wing / AARI 2025–26) ────────
const CROP_BUDGETS = [
  {
    id: 'wheat', icon: '🌾', name: 'گندم', season: 'ربیع (نومبر–اپریل)',
    zone: 'وسطی و جنوبی پنجاب',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 8000,  max: 13000 },
      seed:       { label: 'بیج (PSC)',      min: 7000,  max: 10000 },
      fertilizer: { label: 'کھادیں',         min: 30000, max: 42000 },
      irrigation: { label: 'آبپاشی',         min: 6000,  max: 14000 },
      pesticides: { label: 'زرعی دوائیں',   min: 5000,  max: 9000  },
      labor:      { label: 'مزدوری',         min: 6000,  max: 12000 },
      harvesting: { label: 'کٹائی و تھریشر', min: 8000,  max: 14000 },
      misc:       { label: 'متفرق',            min: 3000,  max: 6000  },
    },
    yield_min: 38, yield_max: 52, yield_unit: 'من/ایکڑ',
    price_min: 3800, price_max: 4300, price_unit: 'روپے/من',
    storage_benefit: 'اکتوبر تک روکنے سے 10–15% اضافی منافع',
    risk: 'کم', risk_color: '#15803d',
    source: 'AARI فیصل آباد / زرعی اکنامکس ونگ 2025–26',
  },
  {
    id: 'cotton', icon: '🌿', name: 'کپاس', season: 'خریف (اپریل–نومبر)',
    zone: 'ملتان، بہاولپور، ساہیوال',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 9000,  max: 14000 },
      seed:       { label: 'بیج (CCRI)',     min: 10000, max: 16000 },
      fertilizer: { label: 'کھادیں',         min: 32000, max: 46000 },
      irrigation: { label: 'آبپاشی',         min: 10000, max: 20000 },
      pesticides: { label: 'زرعی دوائیں',   min: 20000, max: 35000 },
      labor:      { label: 'مزدوری/چنائی',  min: 20000, max: 38000 },
      harvesting: { label: 'کٹائی',           min: 4000,  max: 7000  },
      misc:       { label: 'متفرق',            min: 4000,  max: 7000  },
    },
    yield_min: 14, yield_max: 24, yield_unit: 'من/ایکڑ',
    price_min: 7500, price_max: 9500, price_unit: 'روپے/من',
    storage_benefit: 'جنوری–مارچ میں 20–25% زیادہ قیمت',
    risk: 'زیادہ', risk_color: '#be123c',
    source: 'CCRI ملتان / زرعی اکنامکس ونگ 2025–26',
  },
  {
    id: 'rice', icon: '🍚', name: 'باسمتی چاول', season: 'خریف (جون–اکتوبر)',
    zone: 'گوجرانوالہ، شیخوپورہ، حافظ آباد',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 9000,  max: 15000 },
      seed:       { label: 'نرسری بیج',     min: 4000,  max: 7000  },
      fertilizer: { label: 'کھادیں',         min: 26000, max: 38000 },
      irrigation: { label: 'آبپاشی',         min: 14000, max: 28000 },
      pesticides: { label: 'زرعی دوائیں',   min: 10000, max: 18000 },
      labor:      { label: 'مزدوری/پنیری',  min: 10000, max: 18000 },
      harvesting: { label: 'کٹائی',           min: 6000,  max: 10000 },
      misc:       { label: 'متفرق',            min: 3000,  max: 6000  },
    },
    yield_min: 40, yield_max: 65, yield_unit: 'من/ایکڑ',
    price_min: 3800, price_max: 5200, price_unit: 'روپے/من',
    storage_benefit: 'مارچ–مئی میں 15–20% زیادہ قیمت',
    risk: 'درمیانہ', risk_color: '#d97706',
    source: 'RRI کالا شاہ کاکو / زرعی اکنامکس ونگ 2025–26',
  },
  {
    id: 'maize', icon: '🌽', name: 'مکئی', season: 'خریف (اپریل–ستمبر)',
    zone: 'وسطی پنجاب',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 7000,  max: 11000 },
      seed:       { label: 'ہائبرڈ بیج',    min: 10000, max: 16000 },
      fertilizer: { label: 'کھادیں',         min: 28000, max: 38000 },
      irrigation: { label: 'آبپاشی',         min: 7000,  max: 15000 },
      pesticides: { label: 'زرعی دوائیں',   min: 5000,  max: 10000 },
      labor:      { label: 'مزدوری',         min: 6000,  max: 11000 },
      harvesting: { label: 'کٹائی',           min: 5000,  max: 9000  },
      misc:       { label: 'متفرق',            min: 3000,  max: 5000  },
    },
    yield_min: 65, yield_max: 105, yield_unit: 'من/ایکڑ',
    price_min: 1600, price_max: 2200, price_unit: 'روپے/من',
    storage_benefit: 'دسمبر–فروری میں 10–15% اضافی',
    risk: 'کم', risk_color: '#15803d',
    source: 'AARI فیصل آباد 2025–26',
  },
  {
    id: 'potato', icon: '🥔', name: 'آلو', season: 'ربیع (اکتوبر–مارچ)',
    zone: 'اوکاڑہ، ساہیوال، پاکپتن',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 10000, max: 16000 },
      seed:       { label: 'بیج آلو',       min: 40000, max: 65000 },
      fertilizer: { label: 'کھادیں',         min: 35000, max: 55000 },
      irrigation: { label: 'آبپاشی',         min: 10000, max: 20000 },
      pesticides: { label: 'زرعی دوائیں',   min: 18000, max: 32000 },
      labor:      { label: 'مزدوری',         min: 18000, max: 30000 },
      harvesting: { label: 'کٹائی',           min: 10000, max: 18000 },
      misc:       { label: 'متفرق',            min: 6000,  max: 12000 },
    },
    yield_min: 220, yield_max: 360, yield_unit: 'من/ایکڑ',
    price_min: 500, price_max: 1100, price_unit: 'روپے/من',
    storage_benefit: 'کولڈ اسٹور سے 30–50% اضافی منافع',
    risk: 'زیادہ', risk_color: '#be123c',
    source: 'AARI فیصل آباد / زرعی اکنامکس ونگ 2025–26',
  },
  {
    id: 'tomato', icon: '🍅', name: 'ٹماٹر', season: 'بہار/خریف (مارچ–اکتوبر)',
    zone: 'فیصل آباد، ساہیوال، ملتان',
    costs: {
      land_prep:  { label: 'زمین تیاری',      min: 10000, max: 16000 },
      seed:       { label: 'ہائبرڈ پنیری',   min: 12000, max: 22000 },
      fertilizer: { label: 'کھادیں',           min: 35000, max: 60000 },
      irrigation: { label: 'آبپاشی',           min: 18000, max: 35000 },
      pesticides: { label: 'زرعی دوائیں',     min: 12000, max: 28000 },
      labor:      { label: 'مزدوری/توڑائی',   min: 28000, max: 55000 },
      harvesting: { label: 'کٹائی',             min: 6000,  max: 12000 },
      misc:       { label: 'متفرق',              min: 6000,  max: 12000 },
    },
    yield_min: 220, yield_max: 420, yield_unit: 'من/ایکڑ',
    price_min: 700, price_max: 2800, price_unit: 'روپے/من',
    storage_benefit: 'مارکیٹ انتہائی متغیر — اچھی قیمت آنے پر فوری بیچیں',
    risk: 'بہت زیادہ', risk_color: '#991b1b',
    source: 'زرعی اکنامکس ونگ پنجاب / AARI 2025–26',
  },
];

const COLORS = ['#15803d', '#be123c', '#0369a1', '#d97706', '#7c3aed', '#0891b2'];

export default function CropBudgetCalc() {
  const [acres, setAcres]                 = useState('1');
  const [priceScenario, setPriceScenario] = useState('mid');
  const [selectedCrop, setSelectedCrop]   = useState(null);
  const [customPrices, setCustomPrices]   = useState({}); // { [cropId]: number }
  const [customCosts, setCustomCosts]     = useState({});   // { [cropId]: { [costKey]: number } }
  const [showCostEditor, setShowCostEditor] = useState(false);

  const parsedAcres = parseFloat(acres);
  const a = (!isNaN(parsedAcres) && parsedAcres > 0) ? parsedAcres : 1;

  const getVal = (min, max) => {
    if (priceScenario === 'low') return min;
    if (priceScenario === 'high') return max;
    return Math.round((min + max) / 2);
  };

  const getCropPrice = (crop) => {
    if (customPrices[crop.id] && parseFloat(customPrices[crop.id]) > 0) {
      return parseFloat(customPrices[crop.id]);
    }
    return getVal(crop.price_min, crop.price_max);
  };

  const getCropCostItem = (crop, key, min, max) => {
    if (customCosts[crop.id]?.[key] !== undefined && customCosts[crop.id][key] !== '') {
      return parseFloat(customCosts[crop.id][key]) || 0;
    }
    return getVal(min, max);
  };

  const calcBudget = (crop) => {
    const costPerAcre = Object.entries(crop.costs).reduce(
      (s, [k, c]) => s + getCropCostItem(crop, k, c.min, c.max), 0
    );
    const totalCost = costPerAcre * a;
    const yld = getVal(crop.yield_min, crop.yield_max) * a;
    const price = getCropPrice(crop);
    const revenue = yld * price;
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? +((profit / totalCost) * 100).toFixed(0) : 0;
    const breakeven = yld > 0 ? Math.ceil(totalCost / yld) : 0;
    const isCustomized = !!customPrices[crop.id] || !!customCosts[crop.id];
    return { totalCost, revenue, profit, roi, yld, price, breakeven, costPerAcre, isCustomized };
  };

  const setCropCostField = (cropId, costKey, val) => {
    setCustomCosts(prev => ({
      ...prev,
      [cropId]: {
        ...(prev[cropId] || {}),
        [costKey]: val
      }
    }));
  };

  const resetCropCustoms = (cropId) => {
    setCustomPrices(prev => { const n = { ...prev }; delete n[cropId]; return n; });
    setCustomCosts(prev => { const n = { ...prev }; delete n[cropId]; return n; });
  };

  const budgets = CROP_BUDGETS.map((crop, i) => ({
    ...crop, budget: calcBudget(crop), color: COLORS[i % COLORS.length]
  }));
  const sorted = [...budgets].sort((x, y) => y.budget.profit - x.budget.profit);

  return (
    <div className="form-group" dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0369a1)', borderRadius: 14, padding: '0.9rem 1rem', marginBottom: 12, color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>📊</div>
        <div style={{ fontWeight: 900, fontSize: '1rem' }}>فصل موازنہ کیلکولیٹر</div>
        <div style={{ fontSize: '.72rem', opacity: .85 }}>لاگت، آمدنی اور منافع — ایکڑ کے حساب سے</div>
        <div style={{ fontSize: '.64rem', color: '#93c5fd', marginTop: 4 }}>
          ماخذ: زرعی اکنامکس ونگ پنجاب + AARI فیصل آباد 2025–26
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4 }}>رقبہ (ایکڑ):</label>
          <input type="number" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => setAcres(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4 }}>قیمت کا اندازہ:</label>
          <select value={priceScenario} onChange={e => setPriceScenario(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '.82rem', background: 'white', fontWeight: 700 }}>
            <option value="low">😟 کم قیمت (بدترین مارکیٹ)</option>
            <option value="mid">😐 اوسط قیمت (AARI اوسط)</option>
            <option value="high">😊 اچھی قیمت (بہترین سیزن)</option>
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '8px 10px', background: '#0f172a' }}>
          {['فصل', 'لاگت', 'آمدنی', 'منافع'].map((h, i) => (
            <div key={i} style={{ fontSize: '.65rem', color: '#94a3b8', fontWeight: 700, textAlign: i === 0 ? 'right' : 'center', direction: 'rtl' }}>{h}</div>
          ))}
        </div>
        {sorted.map((crop, i) => {
          const { totalCost, revenue, profit, roi, isCustomized } = crop.budget;
          const isTop = i === 0;
          return (
            <div key={crop.id}
              onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
              style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '9px 10px', borderBottom: '1px solid #334155', background: selectedCrop === crop.id ? '#0c2340' : isTop ? '#0d2212' : '#1e293b', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '.78rem', color: isTop ? '#86efac' : '#f1f5f9', fontWeight: 800 }}>
                    {crop.name} {crop.icon}
                  </div>
                  {isCustomized ? (
                    <div style={{ fontSize: '.55rem', color: '#38bdf8' }}>📍 کسٹم ریٹ لاگو</div>
                  ) : isTop ? (
                    <div style={{ fontSize: '.58rem', color: '#4ade80' }}>⭐ سب سے منافع بخش</div>
                  ) : null}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: '.75rem', color: '#fda4af', alignSelf: 'center' }}>
                {(totalCost / 1000).toFixed(0)}K
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: '.75rem', color: '#93c5fd', alignSelf: 'center' }}>
                {(revenue / 1000).toFixed(0)}K
              </div>
              <div style={{ textAlign: 'center', alignSelf: 'center' }}>
                <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '.78rem', color: profit > 0 ? '#4ade80' : '#f87171' }}>
                  {profit > 0 ? '+' : ''}{(profit / 1000).toFixed(0)}K
                </div>
                <div style={{ fontSize: '.58rem', color: roi > 0 ? '#86efac' : '#fca5a5', fontFamily: 'Inter' }}>{roi}% ROI</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Card with Custom Inputs */}
      {selectedCrop && (() => {
        const crop = budgets.find(c => c.id === selectedCrop);
        if (!crop) return null;
        const { totalCost, revenue, profit, roi, breakeven, isCustomized } = crop.budget;
        const currentMandi = customPrices[crop.id] || getVal(crop.price_min, crop.price_max);

        return (
          <div className="animate-fade-in-up" style={{ background: 'white', border: `2px solid ${crop.color}`, borderRadius: 14, padding: '1rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: crop.color }}>
                {crop.icon} {crop.name} — {a} ایکڑ
              </div>
              {isCustomized && (
                <button
                  onClick={() => resetCropCustoms(crop.id)}
                  style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f8fafc', color: '#64748b', fontSize: '.68rem', cursor: 'pointer' }}
                >
                  🔄 AARI اوسط پر ری سیٹ
                </button>
              )}
            </div>

            <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>
              {crop.season} | {crop.zone} | خطرہ: <strong style={{ color: crop.risk_color }}>{crop.risk}</strong>
            </div>

            {/* Custom Local Mandi Price Input */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '.76rem', fontWeight: 800, color: '#166534' }}>
                  📍 مقامی منڈی کی موجودہ قیمت (روپے / {crop.price_unit?.split('/')[1] || 'من'}):
                </label>
                <span style={{ fontSize: '.65rem', color: '#15803d', fontWeight: 700 }}>
                  {customPrices[crop.id] ? 'کسان کا اپنا ریٹ' : 'AARI سرکاری اوسط'}
                </span>
              </div>
              <input
                type="number"
                value={currentMandi}
                placeholder="منڈی ریٹ درج کریں"
                dir="ltr"
                onChange={e => setCustomPrices(p => ({ ...p, [crop.id]: e.target.value }))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter', color: '#166534', background: 'white' }}
              />
              <div style={{ fontSize: '.65rem', color: '#16a34a', marginTop: 3 }}>
                💡 اپنے علاقے کی منڈی کا ریٹ درج کریں تاکہ آمدنی اور منافع کا فوری لائیو حساب مل سکے۔
              </div>
            </div>

            {/* Cost Breakdown & Optional Custom Edit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '.78rem', color: '#1e293b' }}>💰 اخراجات کی تفصیل (فی ایکڑ):</div>
              <button
                type="button"
                onClick={() => setShowCostEditor(!showCostEditor)}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #94a3b8', background: showCostEditor ? '#e2e8f0' : 'white', color: '#334155', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {showCostEditor ? '✖️ اخراجات چھپائیں' : '✏️ اپنی اصل لاگت درج کریں'}
              </button>
            </div>

            {/* Interactive Custom Cost Editor */}
            {showCostEditor ? (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ fontSize: '.68rem', color: '#64748b', marginBottom: 6 }}>
                  ہر مد میں اپنا اصل خرچہ درج کریں (فی ایکڑ):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.entries(crop.costs).map(([k, c]) => (
                    <div key={k}>
                      <div style={{ fontSize: '.65rem', color: '#475569', marginBottom: 2 }}>{c.label}:</div>
                      <input
                        type="number"
                        placeholder={getVal(c.min, c.max).toString()}
                        value={customCosts[crop.id]?.[k] ?? ''}
                        dir="ltr"
                        onChange={e => setCropCostField(crop.id, k, e.target.value)}
                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '.8rem', fontWeight: 700, fontFamily: 'Inter' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {Object.entries(crop.costs).map(([k, c]) => {
                  const valPerAcre = getCropCostItem(crop, k, c.min, c.max);
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: '.7rem', color: '#6b7280' }}>{c.label}</span>
                      <span style={{ fontSize: '.7rem', fontWeight: 700, fontFamily: 'Inter', color: '#374151' }} dir="ltr">
                        ₨{(valPerAcre * a).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'کل لاگت', value: `₨${(totalCost / 1000).toFixed(0)}K`, bg: '#fef2f2', color: '#be123c' },
                { label: 'متوقع آمدنی', value: `₨${(revenue / 1000).toFixed(0)}K`, bg: '#eff6ff', color: '#0369a1' },
                { label: 'خالص منافع', value: `${profit > 0 ? '+' : ''}₨${(profit / 1000).toFixed(0)}K`, bg: profit > 0 ? '#f0fdf4' : '#fef2f2', color: profit > 0 ? '#15803d' : '#be123c' },
              ].map(({ label, value, bg, color }) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.62rem', color }}>{label}</div>
                  <div style={{ fontWeight: 900, fontSize: '.85rem', color, fontFamily: 'Inter' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: '.7rem', color: '#374151' }}>
              💡 <strong>نقصان کی حد:</strong> قیمت ₨{breakeven.toLocaleString()}/من سے کم نہ ہو | ROI: <strong style={{ color: roi > 0 ? '#15803d' : '#be123c' }}>{roi}%</strong>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: '.7rem', color: '#78350f' }}>
              📦 <strong>ذخیرہ مشورہ:</strong> {crop.storage_benefit}
            </div>
            <div style={{ marginTop: 6, fontSize: '.6rem', color: '#9ca3af' }}>📋 {crop.source}</div>
          </div>
        );
      })()}

      {/* Prominent Legal / Agronomic Warning & Disclaimer */}
      <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: '.72rem', color: '#78350f', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4, fontSize: '.78rem' }}>
          ⚠️ تحریری ڈس کلیمر (قانونی و زرعی وارننگ):
        </div>
        یہ بجٹ موازنہ ایوب زرعی تحقیقاتی ادارہ (AARI) فیصل آباد اور زرعی اکنامکس ونگ کے 2025–2026 فیلڈ سروے کا اوسط تخمینہ ہے۔ اصل اخراجات اور منافع آپ کے بیج، کھاد، ڈیزل کے مقامی نرخ اور غلہ منڈی کی یومیہ بولی پر منحصر ہیں۔ حتمی فصل کے انتخاب سے قبل اپنے مقامی زراعت آفیسر یا غلہ منڈی سے ریٹ کی تصدیق لازماً کریں۔
      </div>

      <div style={{ marginTop: 8 }}>
        <InstitutionalBadge type="aari" helpline="0800-17000" />
      </div>
    </div>
  );
}