import { useState } from 'react';

export default function TubeWellCost() {
  const [hp, setHp] = useState('');
  const [fuel, setFuel] = useState('electric');
  const [hours, setHours] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const h = parseFloat(hp), hrs = parseFloat(hours);
    if (!h || !hrs) return;
    let daily;
    if (fuel === 'electric') {
      // kW = HP × 0.746, units = kW × hrs, cost = units × 8 Rs
      const kw = h * 0.746;
      daily = kw * hrs * 8;
    } else {
      // diesel: L/hr = HP × 0.25, cost = L × 310
      daily = h * 0.25 * hrs * 310;
    }
    setResult({ daily: Math.round(daily), monthly: Math.round(daily * 30) });
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">موٹر کی طاقت (HP)</label>
        <input id="tw-hp" type="number" className="input input-number" placeholder="10" value={hp} onChange={e => setHp(e.target.value)} min="1" dir="ltr" />
      </div>
      <div>
        <label className="input-label">ایندھن کی قسم</label>
        <select className="input" value={fuel} onChange={e => setFuel(e.target.value)} id="tw-fuel">
          <option value="electric">بجلی (یونٹ ریٹ ₨8/یونٹ)</option>
          <option value="diesel">ڈیزل (ریٹ ₨310/لیٹر)</option>
        </select>
      </div>
      <div>
        <label className="input-label">روزانہ گھنٹے</label>
        <input id="tw-hours" type="number" className="input input-number" placeholder="4" value={hours} onChange={e => setHours(e.target.value)} min="0.5" step="0.5" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!hp || !hours} id="tw-calc-btn">
        ✓ خرچ حساب لگائیں
      </button>
      {result && (
        <div className="result-card">
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {[{ l: 'روزانہ', v: `₨${result.daily.toLocaleString()}` }, { l: 'مہینہ وار', v: `₨${result.monthly.toLocaleString()}` }].map(({ l, v }) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div className="result-number" style={{ fontSize: '1.5rem' }}>{v}</div>
                <div className="result-label">{l}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem', textAlign: 'center' }}>
            تخمینہ — اصل ریٹ کے مطابق بدل سکتا ہے
          </p>
        </div>
      )}
    </div>
  );
}
