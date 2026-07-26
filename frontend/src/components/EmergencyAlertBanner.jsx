import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function EmergencyAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_alerts') || '[]'); } catch { return []; }
  });

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/emergency-alerts`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const { alerts: a } = await res.json();
        setAlerts(a || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    sessionStorage.setItem('dismissed_alerts', JSON.stringify(next));
  };

  const visible = alerts.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const SEV_STYLE = {
    INFO:     { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', icon: 'ℹ️' },
    WARNING:  { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '⚠️' },
    CRITICAL: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '🚨' },
  };

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {visible.map(alert => {
        const s = SEV_STYLE[alert.severity] || SEV_STYLE.INFO;
        return (
          <div key={alert.id} style={{
            background: s.bg,
            borderBottom: `2px solid ${s.border}`,
            padding: '.6rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '.75rem',
            direction: 'rtl',
            textAlign: 'right',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: s.text, fontSize: '.875rem', fontFamily: '"Noto Nastaliq Urdu", serif' }}>{alert.title}</div>
              <div style={{ color: s.text, fontSize: '.82rem', lineHeight: 1.6, opacity: .85, fontFamily: '"Noto Nastaliq Urdu", serif' }}>{alert.body}</div>
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              style={{
                background: 'none', border: 'none', color: s.text, cursor: 'pointer',
                fontSize: '1.2rem', opacity: .6, flexShrink: 0, padding: '0 4px',
                lineHeight: 1
              }}
              aria-label="Close alert"
            >×</button>
          </div>
        );
      })}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
