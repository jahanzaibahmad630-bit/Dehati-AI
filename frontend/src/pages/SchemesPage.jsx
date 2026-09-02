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

// ─── CM Punjab Initiatives Eligibility & Loan Calculator ─────────────────────
function KisanCardCriteriaChecker() {
  const [acres, setAcres]             = useState('');
  const [cnic, setCnic]               = useState('');
  const [bankDefault, setBankDefault] = useState('no');

  const a = parseFloat(acres) || 0;
  const isKisanEligible = a >= 1 && a <= 12.5 && bankDefault === 'no';
  const isTractorEligible = a >= 1 && a <= 50;
  const isSolarEligible = a >= 1;

  // Auto-calculated interest-free loan limit: Rs. 30,000/acre up to Rs. 150,000
  const loanLimit = Math.min(150000, Math.round(a * 30000));

  // Clean CNIC for 8070 SMS
  const cleanCnic = cnic.replace(/[^0-9]/g, '');
  const smsBody = cleanCnic ? `PKC ${cleanCnic}` : 'PKC';

  return (
    <div style={{ background: '#162410', borderRadius: 16, padding: '1.25rem', color: 'white', marginBottom: '1.25rem', border: '1.5px solid #2e5a27', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} dir="rtl">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', padding: '0.85rem 1rem', borderRadius: 12, textAlign: 'center', marginBottom: '1rem', color: 'white' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', ...NAS }}>🏛️ وزیراعلیٰ پنجاب کسان پیکیج اہلیت و قرضہ کیلکولیٹر</div>
        <div style={{ fontSize: '0.72rem', color: '#bbf7d0', marginTop: 2 }}>
          محکمہ زراعت پنجاب، PITB، بینک آف پنجاب (BOP) و PLRA مصدقہ ڈیٹا 2024–2026
        </div>
      </div>

      {/* Input Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Acres Input */}
        <div>
          <div style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: 4, fontWeight: 700, ...NAS }}>
            آپ کی زرعی اراضی کا رقبہ (ایکڑ میں):
          </div>
          <input
            type="number"
            className="input"
            placeholder="مثلاً: 3"
            value={acres}
            onChange={e => setAcres(e.target.value)}
            min="0.5"
            step="0.5"
            style={{ width: '100%', background: '#1E3A1E', color: 'white', border: '1.5px solid #3a7232', padding: '.65rem .85rem', borderRadius: 8, fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* CNIC Input for direct 8070 SMS */}
        <div>
          <div style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: 4, fontWeight: 700, ...NAS }}>
            شناختی کارڈ نمبر (8070 پر فوری SMS بھیجنے کیلئے):
          </div>
          <input
            type="text"
            className="input"
            placeholder="3520212345671 (بغیر ڈیش)"
            value={cnic}
            maxLength={13}
            onChange={e => setCnic(e.target.value)}
            style={{ width: '100%', background: '#1E3A1E', color: 'white', border: '1.5px solid #3a7232', padding: '.65rem .85rem', borderRadius: 8, fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Bank Default */}
        <div>
          <div style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: 4, fontWeight: 700, ...NAS }}>
            کیا آپ کسی بینک کے نادہندہ (Default) ہیں؟
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => setBankDefault('no')}
              style={{
                padding: '.55rem', borderRadius: 8,
                border: `1.5px solid ${bankDefault === 'no' ? '#16a34a' : '#3a7232'}`,
                background: bankDefault === 'no' ? '#15803d' : '#1E3A1E',
                color: 'white', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', ...NAS
              }}
            >
              نہیں (صاف ریکارڈ)
            </button>
            <button
              onClick={() => setBankDefault('yes')}
              style={{
                padding: '.55rem', borderRadius: 8,
                border: `1.5px solid ${bankDefault === 'yes' ? '#dc2626' : '#3a7232'}`,
                background: bankDefault === 'yes' ? '#991b1b' : '#1E3A1E',
                color: 'white', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', ...NAS
              }}
            >
              ہاں (واجبات ہیں)
            </button>
          </div>
        </div>
      </div>

      {/* Results Matrix */}
      {a > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 1. CM Kissan Card Status */}
          {isKisanEligible ? (
            <div style={{ background: 'rgba(22, 101, 52, 0.3)', border: '1.5px solid #16a34a', borderRadius: 12, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ color: '#86efac', fontWeight: 800, fontSize: '0.92rem', ...NAS }}>
                  ✅ آپ وزیراعلیٰ کسان کارڈ کے اہل ہیں!
                </div>
                <div style={{ background: '#15803d', color: 'white', padding: '3px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 800 }}>
                  0% سود (بلاسود)
                </div>
              </div>

              {/* Calculated Loan Limit */}
              <div style={{ background: '#162410', borderRadius: 10, padding: '10px 14px', marginTop: 8, textAlign: 'center', border: '1px solid #2e5a27' }}>
                <div style={{ fontSize: '.72rem', color: '#a7f3d0' }}>آپ کا تخمینہ منظور شدہ کریڈٹ لمٹ ({a} ایکڑ):</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbc02d', fontFamily: 'Inter', marginTop: 2 }}>
                  PKR {loanLimit.toLocaleString()}
                </div>
                <div style={{ fontSize: '.68rem', color: '#86efac', marginTop: 2 }}>
                  (شرح: ₨30,000 فی ایکڑ | زیادہ سے زیادہ حد ₨1,50,000)
                </div>
              </div>

              {/* Operational Rules */}
              <div style={{ fontSize: '.72rem', color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
                • <strong>کارڈ استعمال:</strong> صرف رجسٹرڈ کھاد، بیج و زرعی ادویات ڈیلرز کی POS مشین پر سوائپ ہو گا۔<br />
                • <strong>کیش نکلوانا:</strong> ATM سے نقد رقم نکالنا سختی سے ممنوع ہے۔<br />
                • <strong>واپسی مدت:</strong> فصلی پیداوار آنے کے بعد 6 ماہ کے اندر بلاسود واپس کریں۔
              </div>

              {/* 1-Tap 8070 SMS Button */}
              <div style={{ marginTop: 10 }}>
                <a
                  href={`sms:8070?body=${encodeURIComponent(smsBody)}`}
                  id="kc-sms-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#162410',
                    padding: '0.75rem 1rem', borderRadius: 10, textDecoration: 'none',
                    fontWeight: 900, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(245,158,11,0.3)'
                  }}
                >
                  📱 1-کلک SMS: 8070 پر "{smsBody}" بھیجیں
                </a>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1.5px solid #ef4444', borderRadius: 12, padding: '0.85rem' }}>
              <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '.88rem' }}>
                ❌ کسان کارڈ کیلئے غیر اہل
              </div>
              <div style={{ fontSize: '.72rem', color: '#fecaca', marginTop: 3 }}>
                {a > 12.5
                  ? 'کسان کارڈ صرف 1 تا 12.5 ایکڑ اراضی والے کسانوں کیلئے ہے۔ آپ نیچے دیا گیا گرین ٹریکٹر پروگرام دیکھیں۔'
                  : bankDefault === 'yes'
                  ? 'بینک نادہندگی کی صورت میں کسان کارڈ جاری نہیں کیا جاتا۔'
                  : 'کم از کم 1 ایکڑ اراضی PLRA ریکارڈ میں رجسٹرڈ ہونا لازمی ہے۔'}
              </div>
            </div>
          )}

          {/* 2. CM Green Tractor Status */}
          <div style={{ background: isTractorEligible ? 'rgba(4, 120, 87, 0.25)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${isTractorEligible ? '#059669' : '#334155'}`, borderRadius: 12, padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '.88rem', color: isTractorEligible ? '#6ee7b7' : '#94a3b8' }}>
                🚜 گرین ٹریکٹر پروگرام (1 تا 50 ایکڑ):
              </div>
              <span style={{ fontSize: '.75rem', fontWeight: 800, color: isTractorEligible ? '#34d399' : '#f87171' }}>
                {isTractorEligible ? '✅ آپ اہل ہیں (10 لاکھ سبسڈی)' : '❌ غیر اہل'}
              </span>
            </div>
            {isTractorEligible && (
              <div style={{ fontSize: '.72rem', color: '#cbd5e1', marginTop: 6, lineHeight: 1.5 }}>
                • <strong>سبسڈی:</strong> فلیٹ 10 لاکھ روپے (1,000,000 PKR) فی ٹریکٹر۔<br />
                • <strong>شامل برانڈز:</strong> ملت میسی فرگوسن (MF 240, MF 385) اور الغازی (NH 480, NH 640)۔<br />
                • <strong>پورٹل:</strong> <a href="https://gts.punjab.gov.pk" target="_blank" rel="noopener noreferrer" style={{ color: '#fbc02d', fontWeight: 700 }}>gts.punjab.gov.pk</a> پر شفاف ڈیجیٹل قرعہ اندازی۔
              </div>
            )}
          </div>

          {/* 3. Solar Tubewell Status */}
          <div style={{ background: isSolarEligible ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${isSolarEligible ? '#d97706' : '#334155'}`, borderRadius: 12, padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '.88rem', color: isSolarEligible ? '#fde68a' : '#94a3b8' }}>
                ☀️ زرعی ٹیوب ویل سولرائزیشن (67% گرانٹ):
              </div>
              <span style={{ fontSize: '.75rem', fontWeight: 800, color: isSolarEligible ? '#fde68a' : '#f87171' }}>
                {isSolarEligible ? '✅ 67% گرانٹ کے اہل' : '❌ غیر اہل'}
              </span>
            </div>
            {isSolarEligible && (
              <div style={{ fontSize: '.72rem', color: '#cbd5e1', marginTop: 6, lineHeight: 1.5 }}>
                • <strong>شرائط:</strong> پہلے سے موجود فنکشنل ڈیزل یا 3 فیز الیکٹرک ٹیوب ویل + پانی کی سطح ≤60 فٹ۔<br />
                • <strong>لاگت شراکت:</strong> 67% حکومت پنجاب ادا کرے گی، کسان کا حصہ صرف 33% ہو گا۔
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official External Links */}
      <div style={{ display: 'flex', gap: 6, marginTop: '1rem' }}>
        <a href="https://kisancard.punjab.gov.pk" target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: '#86efac', padding: '0.5rem 0.3rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700 }}
        >
          🌐 کسان کارڈ پورٹل
        </a>
        <a href="https://gts.punjab.gov.pk" target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: '#86efac', padding: '0.5rem 0.3rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700 }}
        >
          🚜 ٹریکٹر پورٹل
        </a>
        <a href="tel:0800-17000"
          style={{ flex: 1, textAlign: 'center', background: '#15803d', color: 'white', padding: '0.5rem 0.3rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.72rem', fontWeight: 800 }}
        >
          📞 0800-17000
        </a>
      </div>

      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
        <DataProvenance type="criteria" source="حکومت پنجاب — کسان پیکیج 2024–2026 شرائط" lastUpdated="مارچ 2026" />
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
