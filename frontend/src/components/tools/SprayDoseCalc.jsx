import { useState } from 'react';

export default function SprayDoseCalc() {
  const [tankSize, setTankSize] = useState(15);
  const [dosePerAcre, setDosePerAcre] = useState('');
  const [waterPerAcre, setWaterPerAcre] = useState(100);
  const [result, setResult] = useState(null);

  const calculate = () => {
    const d = parseFloat(dosePerAcre), w = parseFloat(waterPerAcre), t = parseFloat(tankSize);
    if (!d || !w || !t || w === 0) return;
    setResult(((d / w) * t).toFixed(2));
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">ٹینک کا سائز (لیٹر)</label>
        <select className="input" value={tankSize} onChange={e => setTankSize(e.target.value)} id="spray-tank-size">
          <option value={15}>15 لیٹر</option>
          <option value={16}>16 لیٹر</option>
          <option value={20}>20 لیٹر</option>
          <option value={25}>25 لیٹر</option>
        </select>
      </div>
      <div>
        <label className="input-label">فی ایکڑ دوائی (مل یا گرام)</label>
        <input id="spray-dose" type="number" className="input input-number" placeholder="50" value={dosePerAcre} onChange={e => setDosePerAcre(e.target.value)} min="0" step="0.1" dir="ltr" />
      </div>
      <div>
        <label className="input-label">فی ایکڑ پانی (لیٹر)</label>
        <input id="spray-water" type="number" className="input input-number" placeholder="100" value={waterPerAcre} onChange={e => setWaterPerAcre(e.target.value)} min="1" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} id="spray-calc-btn">✓ حساب لگائیں</button>
      {result && (
        <div className="result-card">
          <div className="result-number">{result}</div>
          <div className="result-label">مل / گرام — فی ٹینک</div>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.5rem', textAlign: 'center' }}>
            ہر {tankSize} لیٹر پانی میں {result} مل/گرام دوائی ملائیں
          </p>
        </div>
      )}
    </div>
  );
}
