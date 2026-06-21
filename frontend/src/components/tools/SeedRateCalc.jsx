import { useState } from 'react';

const SEED_RATES = {
  'گندم':   { kg: 50,   note: 'بہتر بیج 2 کلو فی مرلہ — اکتوبر-نومبر بوائی' },
  'چاول':   { kg: 7,    note: 'پہلے نرسری لگائیں، پھر پنیری لگائیں — جون-جولائی' },
  'کپاس':   { kg: 3.5,  note: 'قطار کا فاصلہ 30 انچ — مئی-جون بوائی' },
  'مکئی':   { kg: 8,    note: 'قطار 75×کھیلی 30 سینٹی — مارچ یا جولائی' },
  'گنا':    { kg: 600,  note: 'تین آنکھوں والے پٹرے 2 فٹ — اکتوبر-نومبر' },
  'آلو':    { kg: 800,  note: 'فاصلہ 60×25 سینٹی — اکتوبر-نومبر بوائی' },
  'پیاز':   { kg: 2,    note: 'پہلے نرسری، پھر پنیری — ستمبر-اکتوبر' },
  'سرسوں':  { kg: 4,    note: 'شخن بوائی بہتر ہے — اکتوبر بوائی' },
  'ٹماٹر':  { kg: 0.25, note: 'پہلے نرسری لگائیں — جولائی-اگست یا جنوری' },
  'مرچ':    { kg: 0.5,  note: 'پہلے نرسری — جولائی یا جنوری' }
};

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
