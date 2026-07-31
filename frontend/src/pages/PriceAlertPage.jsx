import { useState, useEffect } from 'react';
import AudioPlayer from '../components/ui/AudioPlayer';

import { API_URL as API } from '../config';

// Stable crop list for the dropdown
const CROP_LIST = [
  'گندم', 'باسمتی چاول', 'مکئی', 'کپاس', 'گنا', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'DAP کھاد', 'یوریا'
];

// ── 30-Day historical Mandi price data (Rs./Mann, Punjab AMIS baseline) ─────────
const PRICE_HISTORY = {
  'گندم':       { unit: 'فی من', data: [3720,3740,3760,3780,3800,3810,3830,3820,3850,3870,3840,3860,3890,3900,3880,3870,3910,3930,3920,3950,3940,3960,3970,3990,3980,4010,4030,4020,4050,4040] },
  'کپاس':       { unit: 'فی من', data: [8400,8350,8430,8500,8480,8450,8510,8560,8540,8520,8580,8600,8580,8560,8620,8650,8630,8600,8680,8700,8720,8710,8750,8780,8760,8800,8820,8800,8840,8860] },
  'باسمتی چاول':{ unit: 'فی من', data: [4100,4080,4120,4150,4130,4160,4180,4170,4200,4220,4210,4230,4250,4240,4260,4280,4270,4290,4310,4300,4320,4340,4330,4350,4370,4360,4380,4400,4390,4410] },
  'گنا':        { unit: 'فی من', data: [425,425,430,430,430,435,435,435,440,440,440,445,445,445,450,450,450,450,455,455,455,460,460,460,460,465,465,465,465,470] },
  'مکئی':       { unit: 'فی من', data: [1800,1820,1810,1830,1850,1840,1860,1870,1860,1880,1900,1890,1910,1920,1910,1930,1920,1940,1950,1940,1960,1970,1960,1980,1990,1980,2000,2010,2000,2020] },
  'آلو':        { unit: 'فی من', data: [1200,1180,1220,1250,1230,1260,1280,1270,1300,1320,1310,1290,1270,1250,1280,1300,1290,1310,1330,1350,1340,1360,1380,1370,1390,1410,1400,1420,1440,1430] },
};
const TREND_CROPS = Object.keys(PRICE_HISTORY);

// ── 30-Day SVG Price Trend Chart ─────────────────────────────────────────────
function PriceTrendChart({ cropKey }) {
  const entry = PRICE_HISTORY[cropKey];
  if (!entry) return null;
  const { data, unit } = entry;
  const W = 300, H = 130, padX = 32, padY = 14;
  const cw = W - padX * 2, ch = H - padY * 2;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => ({ x: padX + (i / 29) * cw, y: padY + ch - ((v - min) / range) * ch, v }));
  const polyStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaStr = `M ${pts[0].x},${H - padY} ` + pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L ${pts[29].x},${H - padY} Z`;
  const trend = data[29] > data[0] + 50 ? 'rising' : data[29] < data[0] - 50 ? 'falling' : 'stable';
  const trendLabel = trend === 'rising' ? '📈 اضافہ' : trend === 'falling' ? '📉 کمی' : '➡️ مستحکم';
  const trendColor = trend === 'rising' ? '#10b981' : trend === 'falling' ? '#ef4444' : '#f59e0b';
  const minIdx = data.indexOf(min), maxIdx = data.indexOf(max);
  const yLabels = [0, 0.5, 1].map(f => ({ y: padY + ch - f * ch, val: Math.round(min + f * range) }));
  return (
    <div>
      <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.55rem' }}>
        {[
          { label: 'بلند ترین 30 دن', val: max, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981' },
          { label: 'کم ترین 30 دن',   val: min, color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: '#ef4444' },
          { label: 'رجحان',           val: trendLabel, color: trendColor, bg: 'rgba(100,116,139,0.08)', border: trendColor, isText: true },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '5px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '.6rem', color: '#94a3b8' }}>{s.label}</div>
            <div style={{ fontWeight: 800, color: s.color, fontSize: s.isText ? '.78rem' : '.88rem', fontFamily: 'Inter' }}>
              {s.isText ? s.val : `₨${s.val.toLocaleString()}`}
            </div>
            {!s.isText && <div style={{ fontSize: '.58rem', color: '#64748b' }}>{unit}</div>}
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto', direction: 'ltr' }}>
        <svg width={W} height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id={`tg_${cropKey.replace(/\s/g,'_')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {yLabels.map((l, i) => (
            <g key={i}>
              <line x1={padX} y1={l.y} x2={W - padX + 4} y2={l.y} stroke="#1e293b" strokeWidth="0.7" strokeDasharray="3,3" />
              <text x={padX - 3} y={l.y + 3.5} fontSize="7.5" fill="#64748b" textAnchor="end" fontFamily="Inter">{(l.val/1000).toFixed(1)}k</text>
            </g>
          ))}
          {[0,14,29].map(i => (
            <text key={i} x={padX + (i/29)*cw} y={H-1} fontSize="7" fill="#64748b" textAnchor="middle" fontFamily="Inter">-{29-i}d</text>
          ))}
          <path d={areaStr} fill={`url(#tg_${cropKey.replace(/\s/g,'_')})`} />
          <polyline points={polyStr} fill="none" stroke={trendColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r={4.5} fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r={4.5} fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx={pts[29].x} cy={pts[29].y} r={5.5} fill="#f59e0b" stroke="#0f172a" strokeWidth="2" />
          <text x={pts[29].x} y={pts[29].y - 9} fontSize="8" fill="#f59e0b" textAnchor="middle" fontFamily="Inter" fontWeight="700">₨{data[29].toLocaleString()}</text>
        </svg>
      </div>
      <div style={{ display: 'flex', gap: '.75rem', fontSize: '.6rem', color: '#64748b', marginTop: '.2rem' }}>
        <span><span style={{ color: '#f59e0b' }}>●</span> موجودہ</span>
        <span><span style={{ color: '#10b981' }}>●</span> بلند</span>
        <span><span style={{ color: '#ef4444' }}>●</span> کم</span>
      </div>
    </div>
  );
}

function MandiTrendPanel() {
  const [crop, setCrop] = useState('گندم');
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
        <div style={{ fontWeight: 800, fontSize: '.92rem', color: '#f59e0b' }}>📊 30 روزہ منڈی قیمت گراف</div>
        <button onClick={() => setOpen(!open)} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: 20, padding: '3px 10px', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>
          {open ? 'چھپائیں ✕' : 'دیکھیں ▼'}
        </button>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginBottom: '.7rem' }}>
            {TREND_CROPS.map(c => (
              <button key={c} onClick={() => setCrop(c)} style={{ background: crop === c ? '#f59e0b' : 'rgba(245,158,11,0.08)', color: crop === c ? '#000' : '#f59e0b', border: `1px solid ${crop === c ? '#f59e0b' : 'rgba(245,158,11,0.25)'}`, borderRadius: 20, padding: '3px 10px', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <PriceTrendChart cropKey={crop} />
          <div style={{ marginTop: '.4rem', fontSize: '.62rem', color: '#475569', direction: 'rtl' }}>
            📌 ماخذ: پنجاب AMIS — نمونہ ڈیٹا برائے رہنمائی
          </div>
        </>
      )}
    </div>
  );
}


function loadAlerts() {
  try {
    const data = JSON.parse(localStorage.getItem('dehati_price_alerts') || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveAlerts(alerts) {

  localStorage.setItem('dehati_price_alerts', JSON.stringify(alerts));
}

function AlertItem({ alert, onDelete, priceMap }) {
  const priceEntry = priceMap[alert.crop];
  const currentPrice = priceEntry?.price ?? null;
  const isReal = priceEntry?.isReal ?? false;

  const triggered = isReal && currentPrice !== null && (
    alert.direction === 'up' ? currentPrice >= alert.threshold : currentPrice <= alert.threshold
  );

  // Build Urdu spoken text for this alert
  const spokenText = [
    `${alert.crop}`,
    currentPrice !== null ? `ابھی کی قیمت: ${currentPrice} روپے فی من` : '',
    `آپ کی حد: ${alert.threshold} روپے`,
    triggered ? 'الرٹ متحرک ہو گیا ہے۔' : ''
  ].filter(Boolean).join('۔ ');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.8rem', color: alert.direction === 'up' ? 'var(--green-700)' : 'var(--danger)', fontWeight: 700 }}>
            {alert.direction === 'up' ? '↑ اوپر جائے' : '↓ نیچے آئے'}
          </span>
          <span className="threshold">₨{alert.threshold.toLocaleString()}</span>
          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
            {currentPrice !== null
              ? `(ابھی: ₨${currentPrice.toLocaleString()}${!isReal ? ' · نمونہ' : ''})`
              : '(قیمت دستیاب نہیں)'}
          </span>
          {/* Audio button for this alert */}
          <AudioPlayer
            text={spokenText}
            langKey="ur"
            compact={true}
          />
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
    const controller = new AbortController(); // M3 fix: cancel fetch on unmount
    fetch(`${API}/api/admin/prices/public`, { cache: 'no-store', signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.prices) {
          const map = {};
          for (const p of data.prices) map[p.key] = { price: p.price, isReal: p.isReal, updatedAt: p.updatedAt };
          setPriceMap(map);
        }
      })
      .catch(err => { if (err.name !== 'AbortError') {} }) // silently keep empty map; UI handles missing
      .finally(() => setPricesLoaded(true));
    return () => controller.abort(); // cleanup on unmount
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

        {/* 30-Day Mandi Price Trend Chart */}
        <MandiTrendPanel />

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
