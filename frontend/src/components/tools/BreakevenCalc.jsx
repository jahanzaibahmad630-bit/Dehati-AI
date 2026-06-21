import { useState } from 'react';

export default function BreakevenCalc() {
  const [cost, setCost] = useState('');
  const [yieldAmt, setYieldAmt] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const c = parseFloat(cost), y = parseFloat(yieldAmt);
    if (!c || !y || y === 0) return;
    setResult(Math.ceil(c / y));
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">کل خرچ فی ایکڑ (روپیہ)</label>
        <input id="be-cost" type="number" className="input input-number" placeholder="35000" value={cost} onChange={e => setCost(e.target.value)} min="0" dir="ltr" />
      </div>
      <div>
        <label className="input-label">متوقع پیداوار (من / ایکڑ)</label>
        <input id="be-yield" type="number" className="input input-number" placeholder="35" value={yieldAmt} onChange={e => setYieldAmt(e.target.value)} min="1" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!cost || !yieldAmt} id="be-calc-btn">
        ✓ نقصان حد حساب کریں
      </button>
      {result && (
        <div className="result-card">
          <div className="result-number">₨{result.toLocaleString()}</div>
          <div className="result-label">فی من کم سے کم قیمت</div>
          <div style={{ marginTop: '.75rem', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', padding: '.6rem', fontSize: '.82rem', color: 'var(--danger)', fontWeight: 700, textAlign: 'center' }}>
            ⚠️ اس سے کم قیمت پر فصل بیچنے پر نقصان ہوگا
          </div>
          <div style={{ marginTop: '.5rem', background: 'var(--green-100)', borderRadius: 'var(--radius-sm)', padding: '.6rem', fontSize: '.82rem', color: 'var(--green-700)', fontWeight: 700, textAlign: 'center' }}>
            ✅ اس سے زیادہ قیمت = منافع
          </div>
        </div>
      )}
    </div>
  );
}
