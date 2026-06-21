import { useState } from 'react';

// All in square feet
const UNITS = {
  'ایکڑ':         43560,
  'کنال':         5445,
  'مرلہ':         272.25,
  'ہیکٹر':        107639,
  'سکوئر فٹ':     1,
  'سکوئر گز':     9,
  'سکوئر میٹر':   10.7639
};

export default function LandConverter() {
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('ایکڑ');
  const [results, setResults] = useState(null);

  const convert = () => {
    const v = parseFloat(value);
    if (!v || v <= 0) return;
    const sqft = v * UNITS[fromUnit];
    const r = {};
    Object.entries(UNITS).forEach(([unit, ratio]) => {
      r[unit] = (sqft / ratio);
    });
    setResults(r);
  };

  const fmt = (n) => {
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">مقدار</label>
        <input id="land-value" type="number" className="input input-number" placeholder="5" value={value} onChange={e => setValue(e.target.value)} min="0" step="any" dir="ltr" />
      </div>
      <div>
        <label className="input-label">اکائی</label>
        <select className="input" value={fromUnit} onChange={e => setFromUnit(e.target.value)} id="land-unit">
          {Object.keys(UNITS).map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-full" onClick={convert} disabled={!value} id="land-calc-btn">
        ✓ تبدیل کریں
      </button>
      {results && (
        <div className="result-card" style={{ padding: '1rem' }}>
          {Object.entries(results)
            .filter(([u]) => u !== fromUnit)
            .map(([unit, val]) => (
              <div key={unit} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', borderBottom: '1px solid var(--green-200)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{unit}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'var(--green-800)' }} dir="ltr">
                  {parseFloat(fmt(val)).toLocaleString()}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
