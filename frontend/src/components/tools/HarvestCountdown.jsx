import { useState } from 'react';

const CROP_DAYS = {
  'گندم':   { days: 140, sow: 'نومبر' },
  'چاول':   { days: 145, sow: 'جون' },
  'کپاس':   { days: 165, sow: 'مئی-جون' },
  'مکئی':   { days: 100, sow: 'مارچ یا جولائی' },
  'گنا':    { days: 330, sow: 'اکتوبر-نومبر' },
  'آلو':    { days: 100, sow: 'اکتوبر' },
  'ٹماٹر':  { days: 80,  sow: 'جولائی یا جنوری' },
  'پیاز':   { days: 135, sow: 'ستمبر-اکتوبر' },
  'سرسوں':  { days: 110, sow: 'اکتوبر' },
  'مرچ':    { days: 120, sow: 'جولائی یا جنوری' }
};

export default function HarvestCountdown() {
  const [crop, setCrop] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const cropInfo = CROP_DAYS[crop];
    if (!cropInfo || !sowDate) return;
    const { days } = cropInfo;
    const sow = new Date(sowDate);
    const harvest = new Date(sow);
    harvest.setDate(sow.getDate() + days);
    const today = new Date();
    const elapsed = Math.max(0, Math.floor((today - sow) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, days - elapsed);
    const pct = Math.min(100, Math.round((elapsed / days) * 100));
    setResult({ days, elapsed, remaining, pct, harvestDate: harvest.toLocaleDateString('ur-PK') });
  };

  const radius = 54, circ = 2 * Math.PI * radius;
  const dash = result ? circ - (result.pct / 100) * circ : circ;
  const strokeColor = result ? (result.pct === 100 ? 'var(--amber-500)' : 'var(--green-600)') : 'var(--green-600)';

  return (
    <div className="form-group">
      <div>
        <label className="input-label">فصل</label>
        <select className="input" value={crop} onChange={e => setCrop(e.target.value)} id="harvest-crop">
          <option value="">فصل منتخب کریں</option>
          {Object.entries(CROP_DAYS).map(([c, { days, sow }]) => (
            <option key={c} value={c}>{c} ({days} دن — {sow})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="input-label">بوائی کی تاریخ</label>
        <input id="harvest-date" type="date" className="input input-number" value={sowDate} onChange={e => setSowDate(e.target.value)} dir="ltr" max={new Date().toISOString().split('T')[0]} />
      </div>
      <button className="btn btn-primary btn-full" onClick={calculate} disabled={!crop || !sowDate} id="harvest-calc-btn">
        ✓ گنتی حساب کریں
      </button>
      {result && (
        <div className="result-card" style={{ textAlign: 'center' }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--green-200)" strokeWidth="10" />
            <circle
              cx="65" cy="65" r={radius}
              fill="none" stroke={strokeColor} strokeWidth="10"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={dash} strokeLinecap="round"
              className="progress-ring"
              style={{ transition: 'stroke-dashoffset 1.2s ease' }}
            />
            <text x="65" y="60" textAnchor="middle" fontFamily="Inter" fontSize="22" fontWeight="700" fill="var(--green-800)">{result.pct}%</text>
            <text x="65" y="80" textAnchor="middle" fontFamily="Noto Nastaliq Urdu" fontSize="12" fill="var(--text-muted)">مکمل</text>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '.5rem' }}>
            {[
              { l: 'گزرے', v: `${result.elapsed} دن` },
              { l: 'باقی', v: result.remaining > 0 ? `${result.remaining} دن` : '🌾 کٹائی کا وقت!' }
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--green-800)' }} dir="ltr">{v}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: '.5rem' }}>
            📅 متوقع کٹائی: {result.harvestDate}
          </div>
        </div>
      )}
    </div>
  );
}
