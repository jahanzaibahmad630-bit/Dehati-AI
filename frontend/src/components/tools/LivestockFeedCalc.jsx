import { useState } from 'react';

// Dry matter requirement: % of body weight per day
const DM_FACTORS = {
  'موئشی / بھینس': 0.025,
  'بکری / بھیڑ':   0.035,
  'گھوڑا / خچر':  0.025,
  'مرغی (1 پرندہ)': 0.11 // 110g daily layer feed per bird
};

export default function LivestockFeedCalc() {
  const [animal, setAnimal] = useState('');
  const [weight, setWeight] = useState('');
  const [count, setCount] = useState('1');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const n = parseFloat(count);
    if (!animal || !n || n <= 0) return;

    if (animal === 'مرغی (1 پرندہ)') {
      // Poultry special case: 110 grams feed per bird daily
      const totalFeedKg = (110 * n) / 1000;
      const grain = totalFeedKg * 0.60;
      const mash  = totalFeedKg * 0.30;
      const calcium = totalFeedKg * 0.10;
      setResult({
        green: (grain * 1000).toFixed(0) + ' گرام دانا',
        dry: (mash * 1000).toFixed(0) + ' گرام فیڈ/میڈیکل',
        concentrate: (calcium * 1000).toFixed(0) + ' گرام چونا/کیلشیم',
        totalKg: totalFeedKg.toFixed(2)
      });
      return;
    }

    const factor = DM_FACTORS[animal];
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    const dmPerAnimal = w * factor;
    const totalDM = dmPerAnimal * n;
    // Split: 55% green fodder (15% DM), 30% dry hay (85% DM), 15% concentrate
    const green = totalDM * 0.55 / 0.15;
    const dry = totalDM * 0.30 / 0.85;
    const concentrate = totalDM * 0.15;
    setResult({
      green: green.toFixed(1) + ' کلو',
      dry: dry.toFixed(1) + ' کلو',
      concentrate: concentrate.toFixed(1) + ' کلو'
    });
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">جانور کی قسم</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', flexDirection: 'row-reverse' }}>
          {Object.keys(DM_FACTORS).map(a => (
            <button
              key={a}
              className={`chip${animal === a ? ' active' : ''}`}
              onClick={() => setAnimal(a)}
              style={{ fontSize: '.8rem' }}
              id={`feed-animal-${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {animal !== 'مرغی (1 پرندہ)' && (
        <div>
          <label className="input-label">وزن (کلو — فی جانور)</label>
          <input id="feed-weight" type="number" className="input input-number" placeholder="400" value={weight} onChange={e => setWeight(e.target.value)} min="1" dir="ltr" />
        </div>
      )}
      <div>
        <label className="input-label">پرندوں / جانوروں کی تعداد</label>
        <input id="feed-count" type="number" className="input input-number" placeholder="1" value={count} onChange={e => setCount(e.target.value)} min="1" dir="ltr" />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!animal || !count || (animal !== 'مرغی (1 پرندہ)' && !weight)} id="feed-calc-btn">
        ✓ خوراک حساب کریں
      </button>
      {result && (
        <div className="result-card">
          {[
            { l: 'سبز چارہ (ہری وھاس)', v: `${result.green} کلو` },
            { l: 'خشک چارہ (توڑی)', v: `${result.dry} کلو` },
            { l: 'کونسنٹریٹ خوراک', v: `${result.concentrate} کلو`, big: true }
          ].map(({ l, v, big }) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', borderBottom: '1px solid var(--green-200)' }}>
              <span style={{ fontWeight: 700 }}>{l}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: big ? '1.1rem' : '1rem', color: big ? 'var(--green-800)' : 'inherit' }} dir="ltr">{v}</span>
            </div>
          ))}
          <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem', textAlign: 'center' }}>
            روزانہ کل خوراک — فی {count} جانور
          </p>
        </div>
      )}
    </div>
  );
}
