import { useState } from 'react';

export default function LoanEMICalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const a = parseFloat(amount), r = parseFloat(rate), m = parseFloat(months);
    if (!a || !r || !m) return;
    // Simple interest EMI (common in agricultural loans)
    const interest = a * (r / 100) * (m / 12);
    const total = a + interest;
    const monthly = total / m;
    setResult({ interest: Math.round(interest), monthly: Math.round(monthly), total: Math.round(total) });
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">قرضہ (روپیہ)</label>
        <input id="loan-amount" type="number" className="input input-number" placeholder="100000" value={amount} onChange={e => setAmount(e.target.value)} min="0" dir="ltr" />
      </div>
      <div>
        <label className="input-label">سالانہ مارک اپ (%)</label>
        <input id="loan-rate" type="number" className="input input-number" placeholder="14" value={rate} onChange={e => setRate(e.target.value)} min="0" step="0.1" dir="ltr" />
        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.2rem', display: 'block' }}>
          ZTBL: ~14% • کسان کارڈ: 0% • اخوت: 0%
        </span>
      </div>
      <div>
        <label className="input-label">مدت (مہینے)</label>
        <input id="loan-months" type="number" className="input input-number" placeholder="12" value={months} onChange={e => setMonths(e.target.value)} min="1" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!amount || !months} id="loan-calc-btn">
        ✓ قسط حساب لگائیں
      </button>
      {result && (
        <div className="result-card">
          {[
            { l: 'ماہوار قسط', v: `₨${result.monthly.toLocaleString()}`, big: true },
            { l: 'کل سود', v: `₨${result.interest.toLocaleString()}` },
            { l: 'کل ادائیگی', v: `₨${result.total.toLocaleString()}` }
          ].map(({ l, v, big }) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', borderBottom: '1px solid var(--green-200)' }}>
              <span style={{ fontWeight: 700 }}>{l}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: big ? '1.2rem' : '1rem', color: big ? 'var(--green-800)' : 'inherit' }} dir="ltr">{v}</span>
            </div>
          ))}
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem', textAlign: 'center' }}>
            سادہ سود کا حساب — بینک شرائط مختلف ہو سکتی ہیں
          </p>
        </div>
      )}
    </div>
  );
}
