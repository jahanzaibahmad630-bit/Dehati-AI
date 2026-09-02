import { useState } from 'react';

const LOAN_PRESETS = [
  { id: 'kisan_card', label: '💳 کسان کارڈ (0% بلا سود — 6 ماہ)', amount: 150000, rate: 0, months: 6, type: 'seasonal', note: 'فصل کٹائی پر 6 ماہ بعد بغیر سود کے اصل رقم واپس کریں' },
  { id: 'ztbl_crop',   label: '🌾 ZTBL فصلی قرضہ (6 ماہ کٹائی پر)', amount: 200000, rate: 16, months: 6, type: 'seasonal', note: '6 ماہ بعد فصل بیچ کر اصل + مارک اپ یکمشت ادا کریں' },
  { id: 'tractor',     label: '🚜 ٹریکٹر / ٹیوب ویل فنانسنگ (3 سال)', amount: 1500000, rate: 18, months: 36, type: 'monthly', note: 'ماہانہ یا ششماہی قسطوں میں باقاعدہ ادائیگی' },
  { id: 'akhuwat',     label: '🤝 اخوت زرعی فنانسنگ (0% سود)', amount: 100000, rate: 0, months: 12, type: 'monthly', note: 'بلا سود قرض حسنہ — صرف 1 سال میں آسان اقساط' },
];

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function LoanEMICalc() {
  const [loanType, setLoanType] = useState('seasonal'); // 'seasonal' (bullet on harvest) | 'monthly' (EMI)
  const [amount, setAmount] = useState('150000');
  const [rate, setRate] = useState('0');
  const [months, setMonths] = useState('6');
  const [result, setResult] = useState(null);

  const applyPreset = (p) => {
    setLoanType(p.type);
    setAmount(p.amount.toString());
    setRate(p.rate.toString());
    setMonths(p.months.toString());
    setResult(null);
  };

  const calculate = () => {
    const a = parseFloat(amount);
    const r = parseFloat(rate || '0');
    const m = parseFloat(months);
    if (!a || isNaN(r) || !m || a <= 0 || m <= 0) return;

    // Simple interest for agricultural loans
    const totalInterest = a * (r / 100) * (m / 12);
    const totalRepayment = a + totalInterest;

    if (loanType === 'seasonal') {
      // 6-month bullet crop loan repayment on harvest
      setResult({
        type: 'seasonal',
        principal: Math.round(a),
        interest: Math.round(totalInterest),
        total: Math.round(totalRepayment),
        months: m,
        rate: r,
        isZeroInterest: r === 0
      });
    } else {
      // Monthly installment EMI
      const monthly = totalRepayment / m;
      setResult({
        type: 'monthly',
        principal: Math.round(a),
        interest: Math.round(totalInterest),
        monthly: Math.round(monthly),
        total: Math.round(totalRepayment),
        months: m,
        rate: r,
        isZeroInterest: r === 0
      });
    }
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>💳</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>زرعی قرضہ و قسط کیلکولیٹر</div>
          <div style={{ color: '#bfdbfe', fontSize: '0.72rem', marginTop: 2 }}>
            کسان کارڈ (0% بلا سود)، ZTBL و کمرشل بینک قرض جات
          </div>
        </div>
      </div>

      <div className="form-group">
        {/* Loan Type Selector */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>قرضے کی نوعیت منتخب کریں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => { setLoanType('seasonal'); setResult(null); }}
              style={{
                padding: '8px', borderRadius: 8,
                border: `2px solid ${loanType === 'seasonal' ? '#1d4ed8' : '#cbd5e1'}`,
                background: loanType === 'seasonal' ? '#eff6ff' : 'white',
                color: loanType === 'seasonal' ? '#1d4ed8' : '#475569',
                fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
              }}
            >
              🌾 فصلی قرضہ (کٹائی پر یکمشت ادائیگی)
            </button>
            <button
              onClick={() => { setLoanType('monthly'); setResult(null); }}
              style={{
                padding: '8px', borderRadius: 8,
                border: `2px solid ${loanType === 'monthly' ? '#1d4ed8' : '#cbd5e1'}`,
                background: loanType === 'monthly' ? '#eff6ff' : 'white',
                color: loanType === 'monthly' ? '#1d4ed8' : '#475569',
                fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
              }}
            >
              🚜 مشینری قرضہ (ماہانہ اقساط)
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>مقبول زرعی اسکیمیں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {LOAN_PRESETS.map(p => (
              <button key={p.id}
                onClick={() => applyPreset(p)}
                style={{
                  padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1',
                  background: '#f8fafc', color: '#1e293b', fontSize: '.72rem',
                  fontWeight: 700, cursor: 'pointer', textAlign: 'right', ...nas
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
            قرضہ کی رقم (روپیہ):
          </label>
          <input
            id="loan-amount" type="number" className="input" placeholder="150000"
            value={amount} min="1000" dir="ltr"
            onChange={e => { setAmount(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Inter' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              سالانہ مارک اپ (%):
            </label>
            <input
              id="loan-rate" type="number" className="input" placeholder="0"
              value={rate} min="0" step="0.5" dir="ltr"
              onChange={e => { setRate(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            <div style={{ fontSize: '.65rem', color: '#64748b', marginTop: 2 }}>کسان کارڈ: 0% | ZTBL: 16%</div>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              مدت (مہینے):
            </label>
            <input
              id="loan-months" type="number" className="input" placeholder="6"
              value={months} min="1" dir="ltr"
              onChange={e => { setMonths(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            <div style={{ fontSize: '.65rem', color: '#64748b', marginTop: 2 }}>فصلی قرضہ: 6 ماہ</div>
          </div>
        </div>

        {/* Calculate Button */}
        <button
          className="btn btn-primary btn-full" id="loan-calc-btn"
          onClick={calculate} disabled={!amount || !months}
          style={{ width: '100%', marginTop: 12, padding: '0.8rem', background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', ...nas }}
        >
          ✓ حساب لگائیں
        </button>

        {/* Result */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {result.isZeroInterest ? (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '10px 14px', marginBottom: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '.8rem', color: '#166534', fontWeight: 800 }}>
                  🎉 مبارک ہو! یہ 0% بلا سود (Interest-Free) اسکیم ہے
                </div>
                <div style={{ fontSize: '.72rem', color: '#15803d', marginTop: 2 }}>
                  حکومت پنجاب کی طرف سے آپ کو کوئی اضافی سود یا مارک اپ ادا نہیں کرنا۔
                </div>
              </div>
            ) : null}

            {result.type === 'seasonal' ? (
              /* Seasonal Harvest Repayment Banner */
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', opacity: .85 }}>
                  فصل کٹائی پر کل ادائیگی ({result.months} ماہ بعد)
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2, color: '#fde68a' }} dir="ltr">
                  ₨{result.total.toLocaleString()}
                </div>
                <div style={{ fontSize: '.75rem', color: '#bfdbfe', marginTop: 4 }}>
                  اصل رقم: ₨{result.principal.toLocaleString()} {result.interest > 0 ? `| کل مارک اپ: ₨${result.interest.toLocaleString()}` : '| سود: صفر'}
                </div>
              </div>
            ) : (
              /* Monthly EMI Banner */
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', opacity: .85 }}>
                  ماہوار قسط (Monthly EMI)
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2, color: '#fde68a' }} dir="ltr">
                  ₨{result.monthly.toLocaleString()}
                </div>
                <div style={{ fontSize: '.75rem', color: '#bfdbfe', marginTop: 4 }}>
                  کل واپسی: ₨{result.total.toLocaleString()} ({result.months} ماہ میں)
                </div>
              </div>
            )}

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: '.72rem', color: '#475569', lineHeight: 1.6 }}>
              💡 <strong>اہم گائیڈ لائن:</strong> کسان کارڈ کی رقم 6 ماہ کے اندر لازمی واپس کریں۔ بروقت ادائیگی پر بینک آف پنجاب اگلی فصل کے لیے فوری دوبارہ کریڈٹ جاری کرتا ہے۔
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
