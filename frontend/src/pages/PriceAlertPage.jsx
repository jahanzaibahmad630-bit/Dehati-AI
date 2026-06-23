import { useState, useEffect } from 'react';

const CROP_LIST = [
  'گندم', 'باسمتی چاول', 'مکئی', 'کپاس', 'گنا', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'DAP کھاد', 'یوریا'
];

const BASE_PRICES = {
  'گندم': 3900, 'باسمتی چاول': 4800, 'مکئی': 1800, 'کپاس': 9500,
  'گنا': 475, 'آلو': 1400, 'ٹماٹر': 2200, 'پیاز': 1100, 'مرچ': 6500,
  'لہسن': 18000, 'سرسوں': 7200, 'چنا': 8500, 'مسور': 6800,
  'DAP کھاد': 10500, 'یوریا': 3900
};

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem('dehati_price_alerts') || '[]'); } catch { return []; }
}
function saveAlerts(alerts) {
  localStorage.setItem('dehati_price_alerts', JSON.stringify(alerts));
}

function AlertItem({ alert, onDelete, currentPrice }) {
  const triggered = alert.direction === 'up'
    ? currentPrice >= alert.threshold
    : currentPrice <= alert.threshold;

  return (
    <div className="alert-item animate-fade-in-up" style={{
      borderColor: triggered ? 'var(--gold)' : 'var(--green-200)',
      background: triggered ? 'linear-gradient(135deg, var(--gold-100), #fffdf7)' : undefined
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span className="crop-name">{alert.crop}</span>
          {triggered && (
            <span style={{
              background: 'var(--gold)', color: '#1a2f0e',
              fontSize: '.6rem', fontWeight: 800, padding: '.1rem .4rem',
              borderRadius: 'var(--radius-full)'
            }}>🔔 متحرک</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span style={{ fontSize: '.8rem', color: alert.direction === 'up' ? 'var(--green-700)' : 'var(--danger)', fontWeight: 700 }}>
            {alert.direction === 'up' ? '↑ اوپر جائے' : '↓ نیچے آئے'}
          </span>
          <span className="threshold">₨{alert.threshold.toLocaleString()}</span>
          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
            (ابھی: ₨{currentPrice?.toLocaleString() || '—'})
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(alert.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--danger)', fontSize: '1.2rem', padding: '.25rem',
          flexShrink: 0
        }}
        aria-label="حذف کریں"
      >
        ✕
      </button>
    </div>
  );
}

export default function PriceAlertPage() {
  const [alerts, setAlerts] = useState(loadAlerts);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState('up'); // 'up' | 'down'
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Current prices (simulated)
  const getCurrentPrice = (crop) => {
    const base = BASE_PRICES[crop] || 0;
    const day = new Date().getDate();
    const seed = base * day;
    const variation = ((seed % 7) - 3) / 100;
    return Math.round(base * (1 + variation) / 50) * 50;
  };

  const handleAdd = () => {
    setError('');
    if (!selectedCrop) { setError('فصل منتخب کریں'); return; }
    const val = parseFloat(threshold);
    if (!val || val <= 0) { setError('درست قیمت درج کریں'); return; }

    const newAlert = {
      id: Date.now(),
      crop: selectedCrop,
      threshold: val,
      direction,
      createdAt: new Date().toLocaleDateString('ur-PK')
    };

    const updated = [...alerts, newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setSelectedCrop('');
    setThreshold('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = (id) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const triggeredCount = alerts.filter(a => {
    const p = getCurrentPrice(a.crop);
    return a.direction === 'up' ? p >= a.threshold : p <= a.threshold;
  }).length;

  return (
    <div className="page">
      <div className="page-content">
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>🔔</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>قیمت الرٹ</h2>
          <p style={{ opacity: .85, fontSize: '.82rem' }}>جب قیمت آپ کی حد تک پہنچے — فوری اطلاع پائیں</p>
        </div>

        {/* Active alert count */}
        {triggeredCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, var(--gold-100), #fffbeb)',
            border: '2px solid var(--gold)', borderRadius: 'var(--radius-md)',
            padding: '.875rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem'
          }}>
            <span style={{ fontSize: '1.8rem' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 800, color: '#1a2f0e' }}>{triggeredCount} الرٹ متحرک ہوئے!</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>آپ کی مقررہ قیمت تک پہنچ گئے</div>
            </div>
          </div>
        )}

        {/* Setup form */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.875rem' }}>نیا الرٹ بنائیں</div>

          <div className="form-group">
            {/* Crop selection */}
            <div>
              <label className="input-label">فصل منتخب کریں</label>
              <div className="chips-scroll" style={{ flexWrap: 'wrap', height: 'auto', overflow: 'visible' }}>
                {CROP_LIST.map(c => (
                  <button
                    key={c}
                    className={`chip${selectedCrop === c ? ' active' : ''}`}
                    onClick={() => setSelectedCrop(c)}
                    style={{ fontSize: '.8rem', marginBottom: '.3rem' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Current price info */}
            {selectedCrop && (
              <div style={{
                background: 'var(--green-100)', borderRadius: 'var(--radius-sm)',
                padding: '.6rem .875rem', fontSize: '.8rem', color: 'var(--green-800)', fontWeight: 700
              }}>
                ابھی کی قیمت: ₨{getCurrentPrice(selectedCrop).toLocaleString()} / من
              </div>
            )}

            {/* Direction toggle */}
            <div>
              <label className="input-label">الرٹ کب دیں</label>
              <div className="alert-direction-btn">
                <button
                  className={direction === 'up' ? 'active up' : ''}
                  onClick={() => setDirection('up')}
                  id="alert-dir-up"
                >
                  ↑ اوپر جائے
                </button>
                <button
                  className={direction === 'down' ? 'active down' : ''}
                  onClick={() => setDirection('down')}
                  id="alert-dir-down"
                >
                  ↓ نیچے آئے
                </button>
              </div>
            </div>

            {/* Threshold */}
            <div>
              <label className="input-label" htmlFor="alert-price">قیمت کی حد (₨ فی من)</label>
              <input
                id="alert-price"
                type="number"
                className="input input-number"
                placeholder="مثلاً: 4000"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                min="0"
                step="50"
              />
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '.875rem', fontWeight: 700 }}>⚠️ {error}</div>
            )}

            {saved && (
              <div style={{ color: 'var(--green-700)', fontSize: '.9rem', fontWeight: 700, textAlign: 'center' }}>
                ✅ الرٹ محفوظ ہو گیا!
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleAdd}
              disabled={!selectedCrop || !threshold}
              id="alert-save-btn"
            >
              🔔 الرٹ محفوظ کریں
            </button>
          </div>
        </div>

        {/* Active alerts */}
        {alerts.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>میرے الرٹ ({alerts.length})</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setAlerts([]); saveAlerts([]); }}
                style={{ fontSize: '.75rem', color: 'var(--danger)' }}
              >
                سب حذف کریں
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {alerts.map(a => (
                <AlertItem
                  key={a.id}
                  alert={a}
                  onDelete={handleDelete}
                  currentPrice={getCurrentPrice(a.crop)}
                />
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🔔</div>
            <p>ابھی کوئی الرٹ نہیں — اوپر سے بنائیں</p>
          </div>
        )}

        {/* Info note */}
        <div style={{
          background: 'var(--gold-100)', border: '1px solid rgba(251,192,45,.4)',
          borderRadius: 'var(--radius-sm)', padding: '.75rem', fontSize: '.78rem',
          color: 'var(--gold-700)', lineHeight: 1.6
        }}>
          💡 الرٹ اس ایپ میں محفوظ ہیں — جب بھی قیمتیں چیک کریں تو آپ کو بتائے گا
        </div>
      </div>
    </div>
  );
}
