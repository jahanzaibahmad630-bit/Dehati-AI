import { useState, useEffect } from 'react';
import { SCHEMES as STATIC_SCHEMES } from '../data/schemes';

import { API_URL as API } from '../config';

function SchemeCard({ scheme }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item">
      <button className="accordion-trigger" onClick={() => setOpen(!open)} id={`scheme-${scheme.id}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{scheme.icon}</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>{scheme.name}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{scheme.tagline}</div>
          </div>
        </div>
        <span style={{ fontSize: '.9rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s ease', flexShrink: 0 }}>▼</span>
      </button>

      <div className={`accordion-content${open ? ' open' : ''}`}>
        <div className="accordion-body">
          <div style={{ background: 'var(--green-100)', borderRadius: 'var(--radius-sm)', padding: '.75rem', marginBottom: '.75rem' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>رقم</div>
            <div className="scheme-amount">{scheme.amount}</div>
            {scheme.amountDetail && <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)', marginTop: '.3rem' }}>{scheme.amountDetail}</div>}
            {scheme.subsidy && <div style={{ fontSize: '.78rem', color: 'var(--green-700)', marginTop: '.2rem', fontWeight: 700 }}>+ {scheme.subsidy}</div>}
          </div>

          <div style={{ marginBottom: '.6rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: '.2rem' }}>✅ اہلیت</div>
            <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{scheme.eligibility}</div>
          </div>

          {scheme.documents?.length > 0 && (
            <div style={{ marginBottom: '.6rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: '.3rem' }}>📄 ضروری کاغذات</div>
              {scheme.documents.map((d, i) => (
                <div key={i} style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '.15rem 0' }}>• {d}</div>
              ))}
            </div>
          )}

          {scheme.howToApply && (
            <div style={{ marginBottom: '.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: '.2rem' }}>📝 درخواست کیسے دیں</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{scheme.howToApply}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '.5rem', flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
            {scheme.applyPhone && (
              <a href={`tel:${scheme.applyPhone}`} className="btn btn-primary btn-sm" id={`scheme-call-${scheme.id}`}>
                📞 {scheme.applyPhone}
              </a>
            )}
            {scheme.applyUrl && (
              <a href={scheme.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" id={`scheme-url-${scheme.id}`}>
                🌐 ویب سائٹ
              </a>
            )}
          </div>

          <div style={{ marginTop: '.75rem', borderTop: '1px solid var(--green-100)', paddingTop: '.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.3rem' }}>
            <span className="last-verified">📅 آخری تصدیق: {scheme.lastVerified}</span>
            <span style={{ fontSize: '.7rem', color: 'var(--text-light)' }}>{scheme.source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState(STATIC_SCHEMES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController(); // M3 fix: cleanup on unmount
    fetch(`${API}/api/admin/schemes/public`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.schemes?.length) setSchemes(data.schemes);
      })
      .catch(err => { if (err.name !== 'AbortError') {} }) // ignore abort, silently fall back to static
      .finally(() => setLoading(false));
    return () => controller.abort(); // cleanup on unmount
  }, []);

  return (
    <div className="page">
      <div className="page-content">
        <div style={{ background: 'linear-gradient(135deg, var(--amber-600) 0%, var(--amber-500) 100%)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>سرکاری زرعی اسکیمیں</h2>
          <p style={{ opacity: .9, fontSize: '.82rem' }}>پنجاب اور وفاق کی سرکاری اسکیمیں</p>
        </div>

        <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(217,119,6,.3)', borderRadius: 'var(--radius-sm)', padding: '.6rem .875rem', fontSize: '.75rem', color: 'var(--warning)' }}>
          ⚠️ اسکیم کی شرائط ہر سال بدلتی ہیں — درخواست سے پہلے تاریخ تصدیق دیکھیں
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>
            لوڈ ہو رہا ہے...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {schemes.map(scheme => <SchemeCard key={scheme.id} scheme={scheme} />)}
        </div>
      </div>
    </div>
  );
}
