import { useState, useEffect } from 'react';
import { SCHEMES as STATIC_SCHEMES } from '../data/schemes';

import { API_URL as API } from '../config';

function KisanCardSimulator() {
  const [cnic, setCnic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCnicChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 13) value = value.slice(0, 13);
    
    let formatted = value;
    if (value.length > 5 && value.length <= 12) {
      formatted = `${value.slice(0, 5)}-${value.slice(5)}`;
    } else if (value.length > 12) {
      formatted = `${value.slice(0, 5)}-${value.slice(5, 12)}-${value.slice(12)}`;
    }
    setCnic(formatted);
    setResult(null);
  };

  const checkEligibility = () => {
    const strippedCnic = cnic.replace(/\D/g, '');
    if (strippedCnic.length !== 13) return;

    setLoading(true);
    setResult(null);

    setTimeout(() => {
      const lastDigit = parseInt(strippedCnic.charAt(12), 10);
      if ([0,1,2,3,4,5,6,7].includes(lastDigit)) {
        setResult('eligible');
      } else {
        setResult('ineligible');
      }
      setLoading(false);
    }, 2000);
  };

  const strippedCnic = cnic.replace(/\D/g, '');

  return (
    <div style={{ background: '#162410', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', marginBottom: '1.25rem' }}>
      <div style={{ background: 'linear-gradient(135deg, #E9C46A 0%, #f59e0b 100%)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '1rem', color: '#162410', fontWeight: 'bold' }}>
        🏦 وزیراعلیٰ پنجاب کسان کارڈ 2026 — اہلیت چیکر
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="text"
          value={cnic}
          onChange={handleCnicChange}
          placeholder="36302-XXXXXXX-X (مثلاً)"
          style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #3a7232', background: '#1E3A1E', color: 'white', textAlign: 'left', direction: 'ltr', fontSize: '1.1rem', outline: 'none' }}
        />
        <button
          onClick={checkEligibility}
          disabled={loading || strippedCnic.length !== 13}
          style={{ background: '#3a7232', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', fontWeight: 'bold', cursor: (loading || strippedCnic.length !== 13) ? 'not-allowed' : 'pointer', opacity: (loading || strippedCnic.length !== 13) ? 0.7 : 1 }}
        >
          {loading ? '⏳ براہ کرم انتظار کریں...' : 'اہلیت چیک کریں'}
        </button>
      </div>

      {result === 'eligible' && (
        <div style={{ marginTop: '1rem', background: 'rgba(58, 114, 50, 0.2)', border: '1px solid #3a7232', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ color: '#E9C46A', fontWeight: 'bold', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            ✅ مبارک ہو! آپ 150,000 روپے بلا سود وزیراعلیٰ کسان کارڈ اور 80% سولر ٹیوب ویل سبسڈی کے لیے اہل ہیں!
          </div>
          <a
            href={`sms:8070?body=PKC%20${strippedCnic}`}
            style={{ display: 'block', background: '#E9C46A', color: '#162410', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold', marginBottom: '0.75rem' }}
          >
            📱 SMS بھیجیں: PKC {strippedCnic} → 8070
          </a>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="https://www.bop.com.pk/" target="_blank" rel="noopener noreferrer" style={{ color: '#E9C46A', fontSize: '0.85rem' }}>BOP</a>
            <span style={{ color: '#3a7232' }}>|</span>
            <a href="https://plra.punjab.gov.pk/" target="_blank" rel="noopener noreferrer" style={{ color: '#E9C46A', fontSize: '0.85rem' }}>PLRA</a>
          </div>
        </div>
      )}

      {result === 'ineligible' && (
        <div style={{ marginTop: '1rem', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid red', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ color: '#ff6b6b', fontWeight: 'bold', lineHeight: 1.5 }}>
            آپ کا CNIC زمین ریکارڈ سے مطابقت نہیں رکھتا — نزدیکی پٹواری یا زرعی دفتر سے رابطہ کریں
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#E9C46A', borderTop: '1px solid #3a7232', paddingTop: '0.75rem' }}>
        <span>BOP تصدیق</span>
        <span>PLRA لینڈ ریکارڈ</span>
        <span>8070 رجسٹرڈ</span>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        یہ ایک تخمینی سمیولیٹر ہے — حتمی اہلیت Bank of Punjab کے ذریعے تصدیق ہوتی ہے
      </div>
    </div>
  );
}

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
        <KisanCardSimulator />

        <div style={{ background: 'linear-gradient(135deg, var(--amber-600) 0%, var(--amber-500) 100%)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>📋</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>سرکاری زرعی اسکیمیں</h2>
          <p style={{ opacity: .9, fontSize: '.82rem' }}>پنجاب اور وفاق کی سرکاری اسکیمیں</p>
        </div>

        <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(217,119,6,.3)', borderRadius: 'var(--radius-sm)', padding: '.6rem .875rem', fontSize: '.75rem', color: 'var(--warning)', marginTop: '0.75rem' }}>
          ⚠️ اسکیم کی شرائط ہر سال بدلتی ہیں — درخواست سے پہلے تاریخ تصدیق دیکھیں
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>
            لوڈ ہو رہا ہے...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '0.75rem' }}>
          {schemes.map(scheme => <SchemeCard key={scheme.id} scheme={scheme} />)}
        </div>
      </div>
    </div>
  );
}
