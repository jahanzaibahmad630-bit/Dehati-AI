import { useState, useEffect } from 'react';
import { SCHEMES as STATIC_SCHEMES } from '../data/schemes';
import { API_URL as API } from '../config';
import DataProvenance from '../components/ui/DataProvenance';

const SCHEMES_CACHE_KEY = 'dehati_schemes_cache_v2';
const NAS = { fontFamily: '"Noto Nastaliq Urdu", serif' };

// ─── Helper: relative date label ─────────────────────────────────────────────
function deadlineBadge(deadline) {
  if (!deadline || deadline === 'جاری ہے' || deadline.includes('فعال')) {
    return { label: '🟢 جاری', color: '#15803d', bg: '#f0fdf4', border: '#86efac' };
  }
  return { label: `⏳ ${deadline}`, color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
}

// ─── CM Kissan Card Eligibility Checker ──────────────────────────────────────
function KisanCardCriteriaChecker() {
  const [landHolding, setLandHolding] = useState('');
  const [tenancy, setTenancy]         = useState('');
  const [bankDefault, setBankDefault] = useState('');

  const isIncomplete  = !landHolding || !tenancy || !bankDefault;
  const isLandFail    = landHolding === '12.5 ایکڑ سے زیادہ';
  const isDefaultFail = bankDefault === 'ہاں';
  const isEligible    = !isIncomplete && !isLandFail && !isDefaultFail;

  return (
    <div style={{ background: '#162410', borderRadius: 16, padding: '1.25rem', color: 'white', marginBottom: '1.25rem' }} dir="rtl">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #E9C46A 0%, #f59e0b 100%)', padding: '0.75rem 1rem', borderRadius: 10, textAlign: 'center', marginBottom: '1rem', color: '#162410' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', ...NAS }}>🏦 وزیراعلیٰ پنجاب کسان کارڈ 2026</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, marginTop: 2 }}>اہلیت چیکر — 12.5 ایکڑ سے کم | 0٪ سود</div>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#86efac', marginBottom: 4, ...NAS }}>زرعی زمین کا رقبہ</div>
          <select value={landHolding} onChange={e => setLandHolding(e.target.value)}
            id="kc-land" className="input"
            style={{ background: '#1E3A1E', color: 'white', border: '1px solid #3a7232', ...NAS, direction: 'rtl' }}
          >
            <option value="">زمین کا سائز منتخب کریں</option>
            <option value="5 ایکڑ سے کم">5 ایکڑ سے کم</option>
            <option value="5 سے 12.5 ایکڑ">5 سے 12.5 ایکڑ</option>
            <option value="12.5 ایکڑ سے زیادہ">12.5 ایکڑ سے زیادہ</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: '#86efac', marginBottom: 4, ...NAS }}>زمین پر حیثیت</div>
          <select value={tenancy} onChange={e => setTenancy(e.target.value)}
            id="kc-tenancy" className="input"
            style={{ background: '#1E3A1E', color: 'white', border: '1px solid #3a7232', ...NAS, direction: 'rtl' }}
          >
            <option value="">حیثیت منتخب کریں</option>
            <option value="مالک">مالک (Owner)</option>
            <option value="مزارع / کرایہ دار">مزارع / کرایہ دار (Tenant)</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: '#86efac', marginBottom: 4, ...NAS }}>بینک نادہندگی</div>
          <select value={bankDefault} onChange={e => setBankDefault(e.target.value)}
            id="kc-default" className="input"
            style={{ background: '#1E3A1E', color: 'white', border: '1px solid #3a7232', ...NAS, direction: 'rtl' }}
          >
            <option value="">کیا آپ پر بینک واجبات ہیں؟</option>
            <option value="نہیں">نہیں — کوئی واجبات نہیں</option>
            <option value="ہاں">ہاں — واجبات موجود ہیں</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ marginTop: '1rem' }}>
        {isIncomplete && (
          <div style={{ color: '#E9C46A', textAlign: 'center', fontSize: '0.82rem', ...NAS }}>
            ⚠️ تمام معلومات درج کریں
          </div>
        )}

        {!isIncomplete && isEligible && (
          <div style={{ background: 'rgba(58,114,50,0.2)', border: '1px solid #3a7232', padding: '1rem', borderRadius: 10 }}>
            <div style={{ color: '#86efac', fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.75rem', ...NAS }}>
              ✅ مبارک ہو! آپ کسان کارڈ کے اہل ہیں
            </div>
            <div style={{ color: 'rgba(255,255,255,.85)', fontSize: '0.75rem', marginBottom: '0.75rem', ...NAS }}>
              12.5 ایکڑ سے کم زمین + کوئی بینک واجبات نہیں — شرائط پوری ہیں
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="sms:8070?body=PKC"
                id="kc-sms-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#E9C46A', color: '#162410', padding: '0.65rem 1rem', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: '0.88rem' }}
              >
                📱 SMS: PKC → 8070 بھیجیں
              </a>
              <a href="tel:0800-17000" id="kc-call-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,.12)', color: 'white', padding: '0.6rem 1rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem' }}
              >
                📞 ہیلپ لائن: 0800-17000
              </a>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="https://www.bop.com.pk/" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', background: 'rgba(233,196,106,.15)', color: '#E9C46A', padding: '0.5rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                >🏛 BOP بینک</a>
                <a href="https://plra.punjab.gov.pk/" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', background: 'rgba(233,196,106,.15)', color: '#E9C46A', padding: '0.5rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                >📋 PLRA فرد</a>
                <a href="https://agripunjab.gov.pk/kissan-card" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', background: 'rgba(233,196,106,.15)', color: '#E9C46A', padding: '0.5rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                >🌐 ویب سائٹ</a>
              </div>
            </div>
          </div>
        )}

        {!isIncomplete && !isEligible && (
          <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)', padding: '1rem', borderRadius: 10 }}>
            <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '0.88rem', marginBottom: 6, ...NAS }}>
              {isLandFail ? '❌ غیر اہل — وجہ: 12.5 ایکڑ سے زیادہ زمین' : '❌ غیر اہل — وجہ: بینک واجبات موجود ہیں'}
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '0.75rem', ...NAS }}>
              {isLandFail
                ? 'کسان کارڈ صرف 12.5 ایکڑ تک والے کسانوں کے لیے ہے۔ ZTBL قرضہ یا گرین ٹریکٹر اسکیم دیکھیں۔'
                : 'پہلے بینک واجبات کلیئر کریں۔ اخوت قرضِ حسن سے مدد لی جا سکتی ہے۔'
              }
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', ...NAS }}>
        ⚠️ حتمی منظوری صرف بینک آف پنجاب اور محکمہ زراعت کرے گا — یہ صرف اہلیت کا اندازہ ہے
      </div>
      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
        <DataProvenance type="criteria" source="CM Punjab Kisan Card 2026 شرائط" lastUpdated="جولائی 2026" />
      </div>
    </div>
  );
}

// ─── Green Tractor Subsidy Indicator ─────────────────────────────────────────
function GreenTractorBanner() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: 8, color: 'white', display: 'flex', alignItems: 'center', gap: 12 }} dir="rtl">
      <div style={{ fontSize: '2rem', flexShrink: 0 }}>🚜</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', ...NAS }}>گرین ٹریکٹر پروگرام 2026</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#86efac', fontFamily: 'Inter, sans-serif' }} dir="ltr">₨15,00,000 سبسڈی</div>
        <div style={{ fontSize: '0.68rem', color: '#bbf7d0', marginTop: 2, ...NAS }}>ڈیڈ لائن: 15 اگست 2026 — فوری درخواست دیں</div>
      </div>
      <a href="sms:8070?body=GTR" id="gt-sms-btn"
        style={{ background: '#E9C46A', color: '#14532d', padding: '0.5rem 0.8rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, textAlign: 'center', ...NAS }}
      >
        SMS:<br />GTR→8070
      </a>
    </div>
  );
}

// ─── Official Helpline Banner ─────────────────────────────────────────────────
function HelplineBanner() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: 12, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }} dir="rtl">
      <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>📞</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.82rem', ...NAS }}>سرکاری زرعی ہیلپ لائن</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Inter, sans-serif', marginTop: 2 }} dir="ltr">0800-17000</div>
        <div style={{ fontSize: '0.68rem', color: '#bfdbfe', ...NAS }}>مفت کال — 24/7 دستیاب</div>
      </div>
      <a href="tel:0800-17000" id="helpline-call-btn"
        style={{ background: 'rgba(255,255,255,.2)', color: 'white', padding: '0.55rem 0.9rem', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0, border: '1.5px solid rgba(255,255,255,.3)', textAlign: 'center' }}
      >
        ابھی<br />کال کریں
      </a>
    </div>
  );
}

// ─── Live / Offline Status Badge ──────────────────────────────────────────────
function SyncBadge({ isLive, isOfflineCache, lastFetch }) {
  if (isLive) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }} dir="rtl">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#15803d', flexShrink: 0, animation: 'statusPulse 2s infinite' }} />
        <span style={NAS}>🟢 لائیو API سے تازہ — محکمہ زراعت پنجاب (مصدقہ)</span>
      </div>
    );
  }
  if (isOfflineCache) {
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.45rem 0.75rem', fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }} dir="rtl">
        <span style={NAS}>⚡ آف لائن کیش — آخری محفوظ اسکیمیں (ذخیرہ شدہ)</span>
      </div>
    );
  }
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.45rem 0.75rem', fontSize: '0.72rem', color: '#6b7280' }} dir="rtl">
      <span style={NAS}>📋 مقامی ڈیٹابیس — جولائی 2026 سے مصدقہ</span>
    </div>
  );
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
function SchemeCard({ scheme }) {
  const [open, setOpen] = useState(false);
  const badge = deadlineBadge(scheme.deadline);

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.07)', marginBottom: 8 }}>
      {/* Trigger */}
      <button
        className="accordion-trigger"
        onClick={() => setOpen(!open)}
        id={`scheme-${scheme.id}`}
        style={{ width: '100%', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
        dir="rtl"
      >
        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{scheme.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1a2f0e', ...NAS }}>{scheme.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, ...NAS }}>{scheme.tagline}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: '0.6rem', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 20, padding: '2px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
          <span style={{ fontSize: '0.9rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .3s ease' }}>▼</span>
        </div>
      </button>

      {/* Expanded Content */}
      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '0.85rem 1rem' }} dir="rtl">
          {/* Amount banner */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '0.7rem 0.85rem', marginBottom: 10 }}>
            <div style={{ fontSize: '0.65rem', color: '#6b7280', ...NAS }}>امدادی رقم / سبسڈی</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#15803d', fontFamily: 'Inter, sans-serif', marginTop: 2 }} dir="ltr">
              {scheme.amount}
            </div>
            {scheme.amountDetail && (
              <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 4, ...NAS }}>{scheme.amountDetail}</div>
            )}
            {scheme.subsidy && (
              <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 4, fontWeight: 700, ...NAS }}>+ {scheme.subsidy}</div>
            )}
          </div>

          {/* Eligibility */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1a2f0e', marginBottom: 4, ...NAS }}>✅ اہلیت کی شرائط</div>
            <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.7, ...NAS }}>{scheme.eligibility}</div>
          </div>

          {/* Documents */}
          {scheme.documents?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1a2f0e', marginBottom: 4, ...NAS }}>📄 ضروری کاغذات</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {scheme.documents.map((d, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#15803d', fontSize: '0.7rem' }}>●</span>
                    <span style={NAS}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Apply */}
          {scheme.howToApply && (
            <div style={{ marginBottom: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.65rem 0.8rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#92400e', marginBottom: 4, ...NAS }}>📝 درخواست کیسے دیں</div>
              <div style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.7, ...NAS }}>{scheme.howToApply}</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {scheme.smsCode && (
              <a href={`sms:${scheme.applyPhone}?body=${scheme.smsCode.split('→')[0]?.trim()}`}
                id={`scheme-sms-${scheme.id}`}
                style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg, #14532d, #15803d)', color: 'white', padding: '0.65rem 0.75rem', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: '0.78rem', ...NAS }}
              >
                📱 SMS: {scheme.smsCode}
              </a>
            )}
            {scheme.helpline && (
              <a href={`tel:${scheme.helpline}`}
                id={`scheme-call-${scheme.id}`}
                style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1d4ed8', color: 'white', padding: '0.65rem 0.75rem', borderRadius: 8, textDecoration: 'none', fontWeight: 800, fontSize: '0.78rem' }}
              >
                📞 {scheme.helpline}
              </a>
            )}
            {scheme.applyUrl && (
              <a href={scheme.applyUrl} target="_blank" rel="noopener noreferrer"
                id={`scheme-url-${scheme.id}`}
                style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f3f4f6', color: '#374151', padding: '0.65rem 0.75rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem', border: '1.5px solid #e5e7eb' }}
              >
                🌐 ویب سائٹ
              </a>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', ...NAS }}>📅 آخری تصدیق: {scheme.lastVerified}</span>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', textAlign: 'left', ...NAS }}>{scheme.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SchemesPage ─────────────────────────────────────────────────────────
export default function SchemesPage() {
  const [schemes, setSchemes] = useState(() => {
    try {
      const cached = localStorage.getItem(SCHEMES_CACHE_KEY);
      return cached ? JSON.parse(cached) : STATIC_SCHEMES;
    } catch {
      return STATIC_SCHEMES;
    }
  });
  const [isLiveUpdated, setIsLiveUpdated]   = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${API}/api/schemes`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.schemes?.length) {
          // Normalize backend schema → frontend schema
          const formatted = data.schemes.map(s => ({
            id:           s.id,
            name:         s.title_ur || s.titleUrdu || s.name || 'اسکیم',
            icon:         s.icon || '📋',
            tagline:      s.category || s.tagline || 'سرکاری اسکیم',
            amount:       s.subsidy_amount || s.loan_limit || s.amount || '',
            amountDetail: s.description_ur || s.description || s.amountDetail || '',
            subsidy:      s.subsidy || null,
            eligibility:  s.eligibility_ur || s.eligibility || '',
            documents:    Array.isArray(s.documents) ? s.documents : ['CNIC', 'زمین کی فرد'],
            howToApply:   s.howToApply || null,
            applyPhone:   s.sms_code || s.applyPhone || null,
            applyUrl:     s.portal_url || s.applyUrl || null,
            lastVerified: 'آج تازہ ترین (Live API)',
            source:       'محکمہ زراعت حکومت پنجاب (مصدقہ)',
            deadline:     s.deadline || 'جاری ہے',
            smsCode:      s.sms_code || s.smsCode || null,
            helpline:     s.helpline || s.applyPhone || '0800-17000',
          }));
          setSchemes(formatted);
          setIsLiveUpdated(true);
          setIsOfflineCache(false);
          try { localStorage.setItem(SCHEMES_CACHE_KEY, JSON.stringify(formatted)); } catch {}
        } else {
          // API returned empty — check if we have cache
          const cached = localStorage.getItem(SCHEMES_CACHE_KEY);
          if (cached) setIsOfflineCache(true);
        }
      })
      .catch(() => {
        // Offline or network error — check cache
        const cached = localStorage.getItem(SCHEMES_CACHE_KEY);
        if (cached) setIsOfflineCache(true);
        // else keep STATIC_SCHEMES (already set as initial state)
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="page">
      <div className="page-content">

        {/* Kissan Card Eligibility Checker */}
        <KisanCardCriteriaChecker />

        {/* Green Tractor Subsidy Banner */}
        <GreenTractorBanner />

        {/* Official Helpline */}
        <HelplineBanner />

        {/* Page Header */}
        <div style={{ background: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '2rem' }}>📋</div>
          <h2 style={{ color: 'white', fontSize: '1.1rem', margin: '.25rem 0', ...NAS }}>سرکاری زرعی اسکیمیں 2026</h2>
          <p style={{ opacity: .9, fontSize: '.78rem', ...NAS }}>پنجاب و وفاق کی مصدقہ اسکیمیں</p>
        </div>

        {/* Sync status */}
        <div style={{ marginBottom: 10 }}>
          <SyncBadge isLive={isLiveUpdated} isOfflineCache={isOfflineCache} />
        </div>

        {/* Warning notice */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.55rem 0.8rem', fontSize: '0.72rem', color: '#92400e', marginBottom: 12, ...NAS }} dir="rtl">
          ⚠️ اسکیم کی شرائط ہر سال بدلتی ہیں — درخواست سے پہلے آخری تصدیق کی تاریخ ضرور دیکھیں
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.82rem', color: '#6b7280', ...NAS }} dir="rtl">
            <div style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #e5e7eb', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin .8s linear infinite', marginLeft: 8, verticalAlign: 'middle' }} />
            اسکیمیں لوڈ ہو رہی ہیں...
          </div>
        )}

        {/* Scheme cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {schemes.map(scheme => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>

        {/* Bottom disclaimer */}
        <div style={{ marginTop: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem', fontSize: '0.7rem', color: '#6b7280', ...NAS }} dir="rtl">
          📌 یہ معلومات agripunjab.gov.pk سے مصدقہ ہیں۔ حتمی درخواست کے لیے متعلقہ محکمے سے رابطہ کریں۔
        </div>

        <style>{`
          @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
