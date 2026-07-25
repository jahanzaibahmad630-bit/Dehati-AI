import { useState, useEffect } from 'react';

import { API_URL as API } from '../../config';
const DISMISSED_KEY = 'dehati_dismissed_announcements';

const TYPE_STYLES = {
  info: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#93c5fd',
    icon: 'ℹ️',
    color: '#1d4ed8',
    titleColor: '#1e40af'
  },
  success: {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    border: '#86efac',
    icon: '✅',
    color: '#15803d',
    titleColor: '#166534'
  },
  warning: {
    bg: 'linear-gradient(135deg, var(--gold-100) 0%, #fffbeb 100%)',
    border: '#fcd34d',
    icon: '⚠️',
    color: '#b45309',
    titleColor: '#92400e'
  },
  urgent: {
    bg: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
    border: '#fca5a5',
    icon: '🔴',
    color: '#dc2626',
    titleColor: '#991b1b'
  }
};

function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

function saveDismissed(ids) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export default function AnnouncementBanner() {
  const [items, setItems]       = useState([]);
  const [dismissed, setDismissed] = useState(loadDismissed);

  useEffect(() => {
    const fetchAnns = async () => {
      try {
        const res = await fetch(`${API}/api/admin/announcements/public`);
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.announcements || []);
      } catch {}
    };
    fetchAnns();
    // Refresh every 5 minutes
    const t = setInterval(fetchAnns, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  };

  const visible = items.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', padding: '0 1rem', marginTop: '.5rem' }}>
      {visible.map(ann => {
        const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
        return (
          <div
            key={ann.id}
            className="animate-fade-in-up"
            style={{
              background: style.bg,
              border: `1.5px solid ${style.border}`,
              borderRadius: 'var(--radius-md)',
              padding: '.875rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,.06)'
            }}
          >
            {/* Icon */}
            <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '.05rem' }}>{style.icon}</span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {ann.title && (
                <div style={{ fontWeight: 800, fontSize: '.88rem', color: style.titleColor, marginBottom: '.2rem' }}>
                  {ann.title}
                </div>
              )}
              <div style={{ fontSize: '.85rem', color: style.color, lineHeight: 1.55 }}>
                {ann.message}
              </div>
              {ann.link && (
                <a
                  href={ann.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: '.35rem', fontSize: '.78rem', color: style.color, fontWeight: 700, textDecoration: 'underline' }}
                >
                  مزید معلومات ←
                </a>
              )}
              {ann.expiresAt && (
                <div style={{ marginTop: '.3rem', fontSize: '.7rem', opacity: .65, color: style.color, fontFamily: 'Inter, sans-serif' }}>
                  تک: {new Date(ann.expiresAt).toLocaleDateString('ur-PK')}
                </div>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => dismiss(ann.id)}
              aria-label="بند کریں"
              style={{
                background: 'rgba(255,255,255,.7)',
                border: 'none', cursor: 'pointer',
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.9rem', color: style.color, flexShrink: 0,
                transition: 'all .15s'
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
