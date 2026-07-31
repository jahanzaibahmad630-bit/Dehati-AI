/**
 * DataProvenance — Honest source attribution badge
 * Displays data source, update timestamp, and trust level.
 */
export default function DataProvenance({ type = 'sample', source = '', lastUpdated = '' }) {
  const config = {
    live:     { label: '🟢 لائیو', bg: 'rgba(16,185,129,0.15)', border: '#10b981', color: '#10b981' },
    sample:   { label: '🟡 نمونہ', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', color: '#f59e0b' },
    criteria: { label: '📋 اصول', bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', color: '#3b82f6' },
    fallback: { label: '🔴 آف لائن', bg: 'rgba(239,68,68,0.10)', border: '#ef4444', color: '#fca5a5' },
  };
  const c = config[type] || config.sample;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap',
      background: c.bg, border: `1.5px solid ${c.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: '.68rem',
      fontWeight: 700, color: c.color, direction: 'rtl'
    }}>
      <span>{c.label}</span>
      {source && <span style={{ opacity: 0.85 }}>• {source}</span>}
      {lastUpdated && <span style={{ opacity: 0.7 }}>• {lastUpdated}</span>}
    </div>
  );
}
