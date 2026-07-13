import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Stable crop list for the dropdown
const CROP_LIST = [
  'گندم', 'باسمتی چاول', 'مکئی', 'کپاس', 'گنا', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'DAP کھاد', 'یوریا'
];

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem('dehati_price_alerts') || '[]'); } catch { return []; }
}
function saveAlerts(alerts) {
  localStorage.setItem('dehati_price_alerts', JSON.stringify(alerts));
}

function AlertItem({ alert, onDelete, priceMap }) {
  const priceEntry = priceMap[alert.crop];
  const currentPrice = priceEntry?.price ?? null;
  const isReal = priceEntry?.isReal ?? false;

  // Only trigger alerts on real admin-entered prices, never on sample data
  const triggered = isReal && currentPrice !== null && (
    alert.direction === 'up' ? currentPrice >= alert.threshold : currentPrice <= alert.threshold
  );

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
          {!isReal && currentPrice !== null && (
            <span style={{
              background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
              fontSize: '.6rem', fontWeight: 700, padding: '.1rem .4rem',
              borderRadius: 'var(--radius-full)'
            }}>📊 نمونہ</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span style={{ fontSize: '.8rem', color: alert.direction === 'up' ? 'var(--green-700)' : 'var(--danger)', fontWeight: 700 }}>
            {alert.direction === 'up' ? '↑ اوپر جائے' : '↓ نیچے آئے'}
          </span>
          <span className="threshold">₨{alert.threshold.toLocaleString()}</span>
          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
            {currentPrice !== null
              ? `(ابھی: ₨${currentPrice.toLocaleString()}${!isReal ? ' · نمونہ' : ''})`
              : '(قیمت دستیاب نہیں)'}
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
  const [alerts, setAlerts]           = useState(loadAlerts);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [threshold, setThreshold]     = useState('');
  const [direction, setDirection]     = useState('up');
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  // Real prices from API — { [cropKey]: { price, isReal, updatedAt } }
  const [priceMap, setPriceMap]       = useState({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/prices/public`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.prices) {
          const map = {};
          for (const p of data.prices) map[p.key] = { price: p.price, isReal: p.isReal, updatedAt: p.updatedAt };
          setPriceMap(map);
        }
      })
      .catch(() => {}) // silently keep empty map; UI handles missing
      .finally(() => setPricesLoaded(true));
  }, []);

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

  // Only count triggered alerts where the price is real (admin-entered)
  const triggeredCount = alerts.filter(a => {
    const entry = priceMap[a.crop];
    if (!entry || !entry.isReal) return false;
    return a.direction === 'up' ? entry.price >= a.threshold : entry.price <= a.threshold;
  }).length;

  const realPriceCount = Object.values(priceMap).filter(p => p.isReal).length;

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

            {/* Current price info for selected crop */}
            {selectedCrop && (() => {
              const entry = priceMap[selectedCrop];
              if (!entry) return null;
              return (
                <div style={{
                  borderRadius: 8, padding: '8px 12px', fontSize: '.8rem', fontWeight: 700,
                  background: entry.isReal ? '#f0fdf4' : '#fffbeb',
                  color: entry.isReal ? '#15803d' : '#92400e',
                  border: `1px solid ${entry.isReal ? '#bbf7d0' : '#fde68a'}`,
                  direction: 'rtl'
                }}>
                  {entry.isReal ? '✅ ' : '📊 '}
                  ابھی کی قیمت: ₨{Number(entry.price).toLocaleString()} / {entry.isReal ? 'من (اصل)' : 'من (نمونہ)'}
                </div>
              );
            })()}

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
                  priceMap={priceMap}
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

        {/* Data honesty notice */}
        <div style={{
          background: realPriceCount > 0 ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${realPriceCount > 0 ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 8, padding: '10px 14px', fontSize: '.75rem',
          color: realPriceCount > 0 ? '#15803d' : '#92400e', lineHeight: 1.6,
          direction: 'rtl'
        }}>
          {realPriceCount > 0
            ? `✅ ${realPriceCount} فصل کی اصل قیمتیں دستیاب — الرٹ صرف اصل قیمتوں پر کام کریں گے`
            : '📊 ابھی تمام قیمتیں نمونہ ڈیٹا ہیں — الرٹ اصل قیمت درج ہونے کے بعد کام کریں گے'}
          <br />
          <span style={{ fontFamily: 'Inter', fontSize: '.65rem' }}>
            {realPriceCount > 0
              ? 'Alerts fire on real admin-entered prices only'
              : 'Alerts paused — waiting for real price data to be entered'}
          </span>
        </div>
      </div>
    </div>
  );
}
