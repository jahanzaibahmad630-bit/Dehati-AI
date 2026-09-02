import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

// ── Punjab Crop Budget Data (Agriculture Economics Wing / AARI 2024–25) ────────
const CROP_BUDGETS = [
  {
    id: 'wheat', icon: '🌾', name: 'گندم', season: 'ربیع (نومبر–اپریل)',
    zone: 'وسطی و جنوبی پنجاب',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 5000,  max: 8000  },
      seed:       { label: 'بیج (PSC)',      min: 5000,  max: 9000  },
      fertilizer: { label: 'کھادیں',         min: 25000, max: 35000 },
      irrigation: { label: 'آبپاشی',         min: 3000,  max: 12000 },
      pesticides: { label: 'زرعی دوائیں',   min: 3000,  max: 8000  },
      labor:      { label: 'مزدوری',         min: 5000,  max: 10000 },
      harvesting: { label: 'کٹائی',           min: 5000,  max: 8000  },
      misc:       { label: 'متفرق',            min: 2000,  max: 5000  },
    },
    yield_min: 35, yield_max: 50, yield_unit: 'من/ایکڑ',
    price_min: 3500, price_max: 4200, price_unit: 'روپے/من',
    storage_benefit: 'اکتوبر تک روکنے سے 10–15% اضافی منافع',
    risk: 'کم', risk_color: '#15803d',
    source: 'AARI فیصل آباد / زرعی اکنامکس ونگ 2024–25',
  },
  {
    id: 'cotton', icon: '🌿', name: 'کپاس', season: 'خریف (اپریل–نومبر)',
    zone: 'ملتان، بہاولپور، ساہیوال',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 7000,  max: 10000 },
      seed:       { label: 'بیج (CCRI)',     min: 8000,  max: 15000 },
      fertilizer: { label: 'کھادیں',         min: 28000, max: 40000 },
      irrigation: { label: 'آبپاشی',         min: 8000,  max: 18000 },
      pesticides: { label: 'زرعی دوائیں',   min: 15000, max: 30000 },
      labor:      { label: 'مزدوری/چنائی',  min: 18000, max: 35000 },
      harvesting: { label: 'کٹائی',           min: 3000,  max: 6000  },
      misc:       { label: 'متفرق',            min: 3000,  max: 6000  },
    },
    yield_min: 12, yield_max: 22, yield_unit: 'من/ایکڑ',
    price_min: 7500, price_max: 9500, price_unit: 'روپے/من',
    storage_benefit: 'جنوری–مارچ میں 20–25% زیادہ قیمت',
    risk: 'زیادہ', risk_color: '#be123c',
    source: 'CCRI ملتان / زرعی اکنامکس ونگ 2024–25',
  },
  {
    id: 'rice', icon: '🍚', name: 'باسمتی چاول', season: 'خریف (جون–اکتوبر)',
    zone: 'گوجرانوالہ، شیخوپورہ، حافظ آباد',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 7000,  max: 12000 },
      seed:       { label: 'نرسری بیج',     min: 3000,  max: 6000  },
      fertilizer: { label: 'کھادیں',         min: 22000, max: 32000 },
      irrigation: { label: 'آبپاشی',         min: 12000, max: 25000 },
      pesticides: { label: 'زرعی دوائیں',   min: 8000,  max: 15000 },
      labor:      { label: 'مزدوری/پنیری',  min: 8000,  max: 15000 },
      harvesting: { label: 'کٹائی',           min: 5000,  max: 8000  },
      misc:       { label: 'متفرق',            min: 2000,  max: 5000  },
    },
    yield_min: 40, yield_max: 65, yield_unit: 'من/ایکڑ',
    price_min: 3000, price_max: 4500, price_unit: 'روپے/من',
    storage_benefit: 'مارچ–مئی میں 15–20% زیادہ قیمت',
    risk: 'درمیانہ', risk_color: '#d97706',
    source: 'RRI کالا شاہ کاکو / زرعی اکنامکس ونگ 2024–25',
  },
  {
    id: 'maize', icon: '🌽', name: 'مکئی', season: 'خریف (اپریل–ستمبر)',
    zone: 'وسطی پنجاب',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 5000,  max: 8000  },
      seed:       { label: 'ہائبرڈ بیج',    min: 8000,  max: 14000 },
      fertilizer: { label: 'کھادیں',         min: 22000, max: 30000 },
      irrigation: { label: 'آبپاشی',         min: 5000,  max: 12000 },
      pesticides: { label: 'زرعی دوائیں',   min: 4000,  max: 8000  },
      labor:      { label: 'مزدوری',         min: 5000,  max: 9000  },
      harvesting: { label: 'کٹائی',           min: 4000,  max: 7000  },
      misc:       { label: 'متفرق',            min: 2000,  max: 4000  },
    },
    yield_min: 60, yield_max: 100, yield_unit: 'من/ایکڑ',
    price_min: 1400, price_max: 1800, price_unit: 'روپے/من',
    storage_benefit: 'دسمبر–فروری میں 10–15% اضافی',
    risk: 'کم', risk_color: '#15803d',
    source: 'AARI فیصل آباد 2024–25',
  },
  {
    id: 'potato', icon: '🥔', name: 'آلو', season: 'ربیع (اکتوبر–مارچ)',
    zone: 'اوکاڑہ، ساہیوال، پاکپتن',
    costs: {
      land_prep:  { label: 'زمین تیاری',    min: 8000,  max: 14000 },
      seed:       { label: 'بیج آلو',       min: 30000, max: 55000 },
      fertilizer: { label: 'کھادیں',         min: 30000, max: 50000 },
      irrigation: { label: 'آبپاشی',         min: 8000,  max: 18000 },
      pesticides: { label: 'زرعی دوائیں',   min: 15000, max: 30000 },
      labor:      { label: 'مزدوری',         min: 15000, max: 28000 },
      harvesting: { label: 'کٹائی',           min: 8000,  max: 15000 },
      misc:       { label: 'متفرق',            min: 5000,  max: 10000 },
    },
    yield_min: 200, yield_max: 350, yield_unit: 'من/ایکڑ',
    price_min: 400, price_max: 900, price_unit: 'روپے/من',
    storage_benefit: 'کولڈ اسٹور سے 30–50% اضافی منافع',
    risk: 'زیادہ', risk_color: '#be123c',
    source: 'AARI فیصل آباد / زرعی اکنامکس ونگ 2024–25',
  },
  {
    id: 'tomato', icon: '🍅', name: 'ٹماٹر', season: 'بہار/خریف (مارچ–اکتوبر)',
    zone: 'فیصل آباد، ساہیوال، ملتان',
    costs: {
      land_prep:  { label: 'زمین تیاری',      min: 8000,  max: 14000 },
      seed:       { label: 'ہائبرڈ پنیری',   min: 10000, max: 20000 },
      fertilizer: { label: 'کھادیں',           min: 30000, max: 55000 },
      irrigation: { label: 'آبپاشی',           min: 15000, max: 30000 },
      pesticides: { label: 'زرعی دوائیں',     min: 10000, max: 25000 },
      labor:      { label: 'مزدوری/توڑائی',   min: 25000, max: 50000 },
      harvesting: { label: 'کٹائی',             min: 5000,  max: 10000 },
      misc:       { label: 'متفرق',              min: 5000,  max: 10000 },
    },
    yield_min: 200, yield_max: 400, yield_unit: 'من/ایکڑ',
    price_min: 500, price_max: 2500, price_unit: 'روپے/من',
    storage_benefit: 'مارکیٹ انتہائی متغیر — اچھی قیمت آنے پر فوری بیچیں',
    risk: 'بہت زیادہ', risk_color: '#991b1b',
    source: 'زرعی اکنامکس ونگ پنجاب / AARI 2024–25',
  },
];

const COLORS = ['#15803d', '#be123c', '#0369a1', '#d97706', '#7c3aed', '#0891b2'];

export default function CropBudgetCalc() {
  const [acres, setAcres] = useState('1');
  const [priceScenario, setPriceScenario] = useState('mid');
  const [selectedCrop, setSelectedCrop] = useState(null);

  const a = parseFloat(acres) || 1;

  const getVal = (min, max) => {
    if (priceScenario === 'low') return min;
    if (priceScenario === 'high') return max;
    return Math.round((min + max) / 2);
  };

  const calcBudget = (crop) => {
    const totalCost = Object.values(crop.costs).reduce((s, c) => s + getVal(c.min, c.max), 0) * a;
    const yld = getVal(crop.yield_min, crop.yield_max) * a;
    const price = getVal(crop.price_min, crop.price_max);
    const revenue = yld * price;
    const profit = revenue - totalCost;
    const roi = totalCost > 0 ? +((profit / totalCost) * 100).toFixed(0) : 0;
    const breakeven = yld > 0 ? Math.ceil(totalCost / yld) : 0;
    return { totalCost, revenue, profit, roi, yld, price, breakeven };
  };

  const budgets = CROP_BUDGETS.map((crop, i) => ({
    ...crop, budget: calcBudget(crop), color: COLORS[i % COLORS.length]
  }));
  const sorted = [...budgets].sort((x, y) => y.budget.profit - x.budget.profit);

  return (
    <div className="form-group">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0369a1)', borderRadius: 14, padding: '0.9rem 1rem', marginBottom: 12, color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>📊</div>
        <div style={{ fontWeight: 900, fontSize: '1rem', ...nas }}>فصل موازنہ کیلکولیٹر</div>
        <div style={{ fontSize: '.72rem', opacity: .85, ...nas }}>لاگت، آمدنی اور منافع — ایکڑ کے حساب سے</div>
        <div style={{ fontSize: '.6rem', opacity: .7, marginTop: 4 }}>ماخذ: زرعی اکنامکس ونگ پنجاب + AARI 2024–25</div>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4, ...nas }}>رقبہ (ایکڑ):</label>
          <input type="number" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => setAcres(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4, ...nas }}>قیمت کا اندازہ:</label>
          <select value={priceScenario} onChange={e => setPriceScenario(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '.82rem', background: 'white', fontWeight: 700 }}>
            <option value="low">😟 کم قیمت (بدترین)</option>
            <option value="mid">😐 اوسط قیمت</option>
            <option value="high">😊 اچھی قیمت (بہترین)</option>
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
          const { totalCost, revenue, profit, roi } = crop.budget;
          const isTop = i === 0;
          return (
            <div key={crop.id}
              onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
              style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '9px 10px', borderBottom: '1px solid #334155', background: selectedCrop === crop.id ? '#0c2340' : isTop ? '#0d2212' : '#1e293b', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '.78rem', color: isTop ? '#86efac' : '#f1f5f9', fontWeight: 800, ...nas }}>{crop.name} {crop.icon}</div>
                  {isTop && <div style={{ fontSize: '.58rem', color: '#4ade80' }}>⭐ سب سے منافع بخش</div>}
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

      {/* Detail Card */}
      {selectedCrop && (() => {
        const crop = budgets.find(c => c.id === selectedCrop);
        if (!crop) return null;
        const { totalCost, revenue, profit, roi, breakeven } = crop.budget;
        return (
          <div className="animate-fade-in-up" style={{ background: 'white', border: `2px solid ${crop.color}`, borderRadius: 14, padding: '1rem', marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: crop.color, marginBottom: 6, ...nas }}>
              {crop.icon} {crop.name} — {a} ایکڑ
            </div>
            <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: 10, lineHeight: 1.5, ...nas }}>
              {crop.season} | {crop.zone} | خطرہ: <strong style={{ color: crop.risk_color }}>{crop.risk}</strong>
            </div>

            {/* Cost breakdown */}
            <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#1e293b', marginBottom: 6, ...nas }}>💰 اخراجات کی تفصیل:</div>
            {Object.entries(crop.costs).map(([k, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '.7rem', color: '#6b7280', ...nas }}>{c.label}</span>
                <span style={{ fontSize: '.7rem', fontWeight: 700, fontFamily: 'Inter', color: '#374151' }} dir="ltr">
                  ₨{(getVal(c.min, c.max) * a).toLocaleString()}
                </span>
              </div>
            ))}

            {/* Summary */}
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'کل لاگت', value: `₨${(totalCost / 1000).toFixed(0)}K`, bg: '#fef2f2', color: '#be123c' },
                { label: 'متوقع آمدنی', value: `₨${(revenue / 1000).toFixed(0)}K`, bg: '#eff6ff', color: '#0369a1' },
                { label: 'خالص منافع', value: `${profit > 0 ? '+' : ''}₨${(profit / 1000).toFixed(0)}K`, bg: profit > 0 ? '#f0fdf4' : '#fef2f2', color: profit > 0 ? '#15803d' : '#be123c' },
              ].map(({ label, value, bg, color }) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.62rem', color, ...nas }}>{label}</div>
                  <div style={{ fontWeight: 900, fontSize: '.85rem', color, fontFamily: 'Inter' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: '.7rem', color: '#374151', ...nas }}>
              💡 <strong>نقصان کی حد:</strong> قیمت ₨{breakeven.toLocaleString()}/من سے کم نہ ہو | ROI: <strong style={{ color: roi > 0 ? '#15803d' : '#be123c' }}>{roi}%</strong>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: '.7rem', color: '#78350f', ...nas }}>
              📦 <strong>ذخیرہ مشورہ:</strong> {crop.storage_benefit}
            </div>
            <div style={{ marginTop: 6, fontSize: '.6rem', color: '#9ca3af', ...nas }}>📋 {crop.source}</div>
          </div>
        );
      })()}

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', fontSize: '.68rem', color: '#92400e', ...nas }}>
        ⚠️ یہ اوسط تخمینہ ہے — اصل لاگت اور قیمت مقامی منڈی اور موسم پر منحصر ہے۔
      </div>
      <div style={{ marginTop: 8 }}>
        <InstitutionalBadge type="aari" helpline="0800-17000" />
      </div>
    </div>
  );
}