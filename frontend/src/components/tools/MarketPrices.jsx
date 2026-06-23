import { useState, useEffect } from 'react';
import { getMarketPrices } from '../../services/api';

export default function MarketPrices() {
  const [data, setData] = useState({ prices: [], note: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const result = await getMarketPrices();
        setData(result);
      } catch {
        setError('قیمتیں لوڈ کرنے میں مسئلہ ہوا');
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>⚠️ {error}</div>;

  return (
    <div>
      <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', padding: '.6rem .875rem', marginBottom: '.875rem', display: 'flex', gap: '.4rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
        <span style={{ fontSize: '.72rem', color: 'var(--warning)', fontWeight: 700, lineHeight: 1.5 }}>
          {data.note}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
        {data.prices.map(item => (
          <div key={item.id} className="price-item">
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{item.nameUrdu}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-light)', marginTop: '.1rem' }}>{item.unit}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--green-800)' }}
                dir="ltr"
              >
                ₨{item.price.toLocaleString()}
              </span>
              <span
                style={{ fontWeight: 700, fontSize: '1rem' }}
                className={item.trend === 'up' ? 'price-trend-up' : item.trend === 'down' ? 'price-trend-down' : 'price-trend-stable'}
              >
                {item.trendIcon}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '.72rem', color: 'var(--text-light)', textAlign: 'center', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
        آخری تازہ کاری: {data.prices[0]?.month} —{' '}
        <a href="https://amis.pk" target="_blank" rel="noopener" style={{ color: 'var(--green-600)' }}>AMIS Punjab</a>
      </div>
    </div>
  );
}
