import { useState } from 'react';
import { SEED_RATES } from '../../data/crops';

export default function SeedRateCalc() {
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const data = SEED_RATES[crop];
    if (!data || !acres) return;
    const total = data.kg * parseFloat(acres);
    setResult({ total, note: data.note });
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">فصل</label>
        <select className="input" value={crop} onChange={e => setCrop(e.target.value)} id="seed-crop">
          <option value="">فصل منتخب کریں</option>
          {Object.keys(SEED_RATES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="input-label">زمین (ایکڑ)</label>
        <input id="seed-acres" type="number" className="input input-number" placeholder="5" value={acres} onChange={e => setAcres(e.target.value)} min="0.5" step="0.5" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!crop || !acres} id="seed-calc-btn">
        ✓ بیج حساب لگائیں
      </button>
      {result && (
        <div className="result-card">
          <div className="result-number">{result.total} کلو</div>
          <div className="result-label">کل بیج ضروری ہے</div>
          <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: '.5rem', textAlign: 'center' }}>
            📝 {result.note}
          </p>
        </div>
      )}
    </div>
  );
}
