/**
 * MarketPrices.jsx
 *
 * Fetches prices from GET /api/admin/prices/public.
 * Each price is either:
 *  - isReal: true  → admin entered a real mandi price today (shown with ✅ badge + timestamp)
 *  - isReal: false → reference/sample baseline (shown with 📊 badge + "نمونہ ڈیٹا" label)
 *
 * NO fake variation formula. NO Math.random(). NO misleading "LIVE" badge.
 * Gracefully shows stale data with its timestamp if the API is unreachable.
 */

import { useState, useEffect } from 'react';

import { API_URL as API } from '../../config';
const CATEGORIES = ['سب', 'اناج', 'نقدی فصل', 'سبزی', 'تیلدار', 'دالیں', 'کھاد'];

// How old an admin price can be before we show it as "stale"
const STALE_HOURS = 48;

function hoursAgo(isoString) {
  if (!isoString) return Infinity;
  return (Date.now() - new Date(isoString).getTime()) / 3_600_000;
}

function formatUpdatedAt(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  const h = hoursAgo(isoString);
  if (h < 1)  return 'ابھی درج کی گئی';
  if (h < 24) return `${Math.floor(h)} گھنٹے پہلے`;
  return d.toLocaleDateString('ur-PK', { day: 'numeric', month: 'long' });
}

function PriceRow({ item }) {
  const isStale = item.isReal && hoursAgo(item.updatedAt) > STALE_HOURS;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: '1px solid #f3f4f6',
      background: 'white',
    }}>
      {/* Left: crop name + unit */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '.95rem', direction: 'rtl' }}>{item.nameUrdu}</div>
        <div style={{ fontSize: '.7rem', color: '#6b7280', marginTop: 2, direction: 'rtl' }}>
          {item.unit} · {item.category}
        </div>
        {/* Data source badge */}
        <div style={{
          marginTop: 3,
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: '.65rem', fontWeight: 700,
          color: item.isReal && !isStale ? '#16a34a' : '#92400e',
          background: item.isReal && !isStale ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${item.isReal && !isStale ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 6, padding: '1px 6px',
          direction: 'rtl'
        }}>
          {item.isReal && !isStale && '✅ '}
          {item.isReal && isStale  && '⚠️ '}
          {!item.isReal            && '📊 '}
          {item.isReal && !isStale && formatUpdatedAt(item.updatedAt)}
          {item.isReal &&  isStale && `پرانی قیمت · ${formatUpdatedAt(item.updatedAt)}`}
          {!item.isReal            && 'حوالہ قیمت · نمونہ ڈیٹا'}
        </div>
      </div>

      {/* Right: price */}
      <div style={{
        fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.05rem',
        color: item.isReal && !isStale ? '#166534' : '#78350f',
        flexShrink: 0, marginRight: 4
      }} dir="ltr">
        ₨{Number(item.price).toLocaleString()}
      </div>
    </div>
  );
}

export default function MarketPrices() {
  const [prices, setPrices]       = useState([]);
  const [filter, setFilter]       = useState('سب');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [servedAt, setServedAt]   = useState(null);
  const [realCount, setRealCount] = useState(0);

  const fetchPrices = async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/api/admin/prices/public`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrices(data.prices || []);
      setServedAt(data.servedAt || null);
      setRealCount(data.realCount || 0);
    } catch (err) {
      setError('سرور سے ڈیٹا نہیں آیا — پرانا ڈیٹا دکھایا جا رہا ہے');
      // Don't clear existing prices — keep showing stale data with timestamp
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    // Refresh every 10 minutes — but this hits the real API, not a formula
    const t = setInterval(fetchPrices, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === 'سب' ? prices : prices.filter(p => p.category === filter);
  const allSample = realCount === 0;

  return (
    <div>
      {/* ── Top disclosure banner ── */}
      <div style={{
        borderRadius: 10, padding: '10px 14px', marginBottom: 12,
        background: allSample ? '#fffbeb' : '#f0fdf4',
        border: `1px solid ${allSample ? '#fde68a' : '#bbf7d0'}`,
        direction: 'rtl', lineHeight: 1.6
      }}>
        {allSample ? (
          <div style={{ fontSize: '.75rem', color: '#92400e' }}>
            <strong>📊 نمونہ ڈیٹا (Sample Data)</strong><br />
            ابھی تمام قیمتیں حوالہ اعداد ہیں — لائیو منڈی ڈیٹا نہیں۔
            ایڈمن روزانہ اصل قیمتیں درج کرے گا۔<br />
            <span style={{ fontFamily: 'Inter', fontSize: '.65rem', color: '#a16207' }}>
              Sample reference prices — not a live feed. Admin enters real prices daily.
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '.75rem', color: '#15803d' }}>
            <strong>✅ {realCount} فصل کی قیمتیں آج درج کی گئیں</strong> —
            باقی حوالہ قیمتیں ہیں۔<br />
            <span style={{ fontFamily: 'Inter', fontSize: '.65rem', color: '#166534' }}>
              {realCount} crops have real prices entered today. Others show reference data.
            </span>
          </div>
        )}
      </div>

      {/* ── Error notice (non-blocking) ── */}
      {error && (
        <div style={{
          fontSize: '.72rem', color: '#b45309', background: '#fffbeb',
          border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px',
          marginBottom: 10, direction: 'rtl'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Category filter ── */}
      <div className="chips-scroll" style={{ marginBottom: 10 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip${filter === cat ? ' active' : ''}`}
            onClick={() => setFilter(cat)}
            style={{ fontSize: '.75rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Price rows ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '.85rem' }}>
          قیمتیں لوڈ ہو رہی ہیں...
        </div>
      ) : (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', direction: 'rtl' }}>
              اس زمرے میں کوئی قیمت نہیں
            </div>
          ) : (
            filtered.map(item => <PriceRow key={item.key} item={item} />)
          )}
        </div>
      )}

      {/* ── Footer: last served timestamp ── */}
      {servedAt && (
        <div style={{
          marginTop: 10, fontSize: '.65rem', color: '#9ca3af',
          textAlign: 'center', fontFamily: 'Inter, sans-serif'
        }}>
          Last fetched: {new Date(servedAt).toLocaleTimeString()} ·{' '}
          <a href="https://amis.punjab.gov.pk" target="_blank" rel="noopener noreferrer"
            style={{ color: '#6b7280' }}>amis.punjab.gov.pk</a>{' '}
          (reference source, not integrated yet)
        </div>
      )}
    </div>
  );
}
