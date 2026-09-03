import { useAuth } from '../../context/AuthContext';
import { useLanguage, LANGUAGES } from '../../context/LanguageContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const { language, changeLanguage, largeText, toggleLargeText } = useLanguage();

  return (
    <div className="form-group">
      {/* User Info Card */}
      <div style={{ background: 'var(--green-100)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '.5rem' }}>
          👨‍🌾
        </div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: 'var(--green-900)', marginBottom: '.75rem' }}>
          {user?.name || '—'}
        </div>
        {[
          { label: 'فون', value: user?.phone, ltr: true },
          { label: 'ضلع', value: user?.district },
          { label: 'زمین', value: user?.landSize ? `${user.landSize} ایکڑ` : null }
        ].filter(f => f.value).map(({ label, value, ltr }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', borderBottom: '1px solid var(--green-200)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '.875rem' }}>{label}</span>
            <span style={{ fontWeight: 700, fontFamily: ltr ? 'Inter, sans-serif' : undefined }} dir={ltr ? 'ltr' : undefined}>
              {value}
            </span>
          </div>
        ))}
        <div style={{ marginTop: '.75rem', background: '#f0fdf4', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.72rem', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
          ✅ آپ کا ڈیٹا محفوظ ہے — DehatiAI اکاؤنٹ
        </div>
      </div>

      {/* AI Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--green-200)', borderRadius: 'var(--radius-sm)', padding: '.875rem' }}>
        <span style={{ fontWeight: 700 }}>AI کنیکشن</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--whatsapp)', display: 'inline-block', boxShadow: '0 0 6px var(--whatsapp)' }} />
          <span style={{ fontSize: '.85rem', fontFamily: 'Inter, sans-serif', color: 'var(--green-700)', fontWeight: 700 }}>Active</span>
        </span>
      </div>

      {/* Language Selector */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--green-200)', borderRadius: 'var(--radius-sm)', padding: '.875rem' }}>
        <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.6rem', color: 'var(--green-900)' }}>
          🌐 زبان منتخب کریں (Language)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.4rem' }}>
          {Object.entries(LANGUAGES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => changeLanguage(k)}
              style={{
                padding: '.55rem .25rem',
                borderRadius: '8px',
                border: language === k ? '2px solid var(--green-700)' : '1px solid #e5e7eb',
                background: language === k ? 'var(--green-700)' : 'white',
                color: language === k ? 'white' : '#374151',
                fontWeight: language === k ? 800 : 600,
                fontSize: '.78rem',
                cursor: 'pointer',
                fontFamily: k === 'en' ? 'Inter, sans-serif' : '"Noto Nastaliq Urdu", serif',
                lineHeight: 1.4,
                transition: 'all .15s ease'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Large Text Toggle */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--card)', border: '1px solid var(--green-200)',
          borderRadius: 'var(--radius-sm)', padding: '.875rem', cursor: 'pointer'
        }}
        onClick={toggleLargeText}
        id="profile-large-text-toggle"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && toggleLargeText()}
      >
        <div>
          <div style={{ fontWeight: 700 }}>بڑا متن (رسائی موڈ)</div>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>بزرگوں کے لیے بڑے حروف</div>
        </div>
        <span style={{
          background: largeText ? 'var(--green-600)' : 'var(--brown-300)',
          width: '44px', height: '24px', borderRadius: '12px',
          position: 'relative', transition: 'background .2s', display: 'inline-block', flexShrink: 0
        }}>
          <span style={{
            position: 'absolute', width: '18px', height: '18px', borderRadius: '50%',
            background: 'white', top: '3px', left: largeText ? '23px' : '3px',
            transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
          }} />
        </span>
      </div>

      {/* Logout */}
      <button
        className="btn btn-danger btn-full"
        onClick={logout}
        id="profile-logout-btn"
        style={{ marginTop: '.5rem' }}
      >
        🚪 لاگ آئوٹ
      </button>

      <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
        DehatiAI v1.0 — پنجاب کے کسانوں کے لیے | ماخذ: AARI/CCRI/UVAS
      </p>
    </div>
  );
}
