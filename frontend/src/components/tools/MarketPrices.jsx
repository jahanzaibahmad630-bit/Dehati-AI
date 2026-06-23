import { useState, useEffect } from 'react';
import { getLiveMarketPrices, PRICE_NOTE } from '../../data/marketPrices';

const CATEGORIES = ['سب', 'اناج', 'نقدی فصل', 'سبزی', 'تیلدار', 'دالیں', 'کھاد'];

export default function MarketPrices() {
  const [prices, setPrices] = useState([]);
  const [filter, setFilter] = useState('سب');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = () => {
    setPrices(getLiveMarketPrices());
    setLastRefresh(new Date());
  };

  useEffect(() => {
    refresh();
    // Auto-refresh every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'سب' ? prices : prices.filter(p => p.category === filter);
  const timeStr = lastRefresh.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div style={{
        background: 'var(--warning-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '.6rem .875rem',
        marginBottom: '.875rem',
        display: 'flex',
        gap: '.4rem',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '.72rem', color: 'var(--warning)', fontWeight: 700, lineHeight: 1.5 }}>
          ⚠️ {PRICE_NOTE}
        </span>
        <button
          onClick={refresh}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '.8rem', flexShrink: 0, padding: '0 .25rem'
          }}
          title="تازہ کریں"
        >
          🔄
        </button>
      </div>

      {/* Category filter */}
      <div className="chips-scroll" style={{ marginBottom: '.75rem' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
        {filtered.map(item => (
          <div key={item.id} className="price-item">
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{item.nameUrdu}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-light)', marginTop: '.1rem' }}>
                {item.unit} • {item.category}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--green-800)'
                }}
                dir="ltr"
              >
                ₨{item.price.toLocaleString()}
              </span>
              <span
                style={{ fontWeight: 700, fontSize: '1rem', color: item.color }}
                className={item.trend === 'up' ? 'price-trend-up' : item.trend === 'down' ? 'price-trend-down' : 'price-trend-stable'}
              >
                {item.trendIcon}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '1rem',
        fontSize: '.72rem',
        color: 'var(--text-light)',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1.5
      }}>
        آخری تازہ کاری: {timeStr} •{' '}
        <a href="https://amis.pk" target="_blank" rel="noopener" style={{ color: 'var(--green-600)' }}>
          AMIS Punjab
        </a>
        {' '}|{' '}
        <a href="https://www.aptma.org.pk" target="_blank" rel="noopener" style={{ color: 'var(--green-600)' }}>
          APTMA
        </a>
      </div>
    </div>
  );
}
