import { useState } from 'react';
import { CROP_DATA } from '../../data/crops';

export default function ProfitEstimator() {
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const data = CROP_DATA[crop];
    if (!data || !acres) return;
    const a = parseFloat(acres);
    const income = data.yield * data.price * a;
    const cost = data.cost * a;
    const profit = income - cost;
    setResult({ income, cost, profit, isProfit: profit >= 0 });
  };

  const fmt = n => n.toLocaleString('ur-PK');

  return (
    <div className="form-group">
      <div>
        <label className="input-label">فصل</label>
        <select className="input" value={crop} onChange={e => setCrop(e.target.value)} id="profit-crop">
          <option value="">فصل منتخب کریں</option>
          {Object.keys(CROP_DATA).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="input-label">زمین (ایکڑ)</label>
        <input id="profit-acres" type="number" className="input input-number" placeholder="5" value={acres} onChange={e => setAcres(e.target.value)} min="0.5" step="0.5" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!crop || !acres} id="profit-calc-btn">
        ✓ منافع حساب لگائیں
      </button>
      {result && (
        <div className="result-card">
          {[
            { label: 'آمدنی', value: `₨${fmt(result.income)}`, color: 'var(--green-700)' },
            { label: 'خرچہ', value: `₨${fmt(result.cost)}`, color: 'var(--danger)' },
            { label: result.isProfit ? 'منافع 🎉' : 'نقصان ⚠️', value: `₨${fmt(Math.abs(result.profit))}`, color: result.isProfit ? 'var(--green-800)' : 'var(--danger)', big: true }
          ].map(({ label, value, color, big }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--green-200)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: big ? '1.2rem' : '1rem', color }} dir="ltr">{value}</span>
            </div>
          ))}
          <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem', textAlign: 'center' }}>
            نمونہ حساب — مقامی قیمتیں مختلف ہو سکتی ہیں
          </p>
        </div>
      )}
    </div>
  );
}
