import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyNotice() {
  const [show, setShow] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    // Check if user has acknowledged the mandatory legal consent
    const consent = localStorage.getItem('dehati_legal_consent_v2026');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('dehati_legal_consent_v2026', JSON.stringify({
      acceptedAt: new Date().toISOString(),
      version: '2026_v1'
    }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: '1.5rem',
        maxWidth: '460px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        direction: 'rtl',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '2px solid #2e5a27',
        fontFamily: 'Inter, "Noto Nastaliq Urdu", sans-serif'
      }}>
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '.3rem' }}>📜</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#162410', margin: '0 0 4px 0', lineHeight: 1.4 }}>
            قانونی اقرار نامہ و صارف کی رضامندی
          </h2>
          <div style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 600 }}>
            DehatiAI سروس کے استعمال سے پہلے لازمی مطالعہ و اقرار
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
            ⚖️ عدمِ ذمہ داری اعلان
          </span>
          <span style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', fontSize: '.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
            🔒 PECA 2016 محفوظ
          </span>
          <span style={{ background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb', fontSize: '.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
            🐄 PVMC ضوابط
          </span>
        </div>

        {/* Legal Disclaimer Points */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '.75rem',
          fontSize: '.82rem',
          lineHeight: 1.6,
          color: '#334155',
          marginBottom: '1rem'
        }}>
          <div>
            <strong>1. AI تعلیمی سافٹ ویئر ہے، ڈاکٹر نہیں:</strong> DehatiAI صرف مصنوعی ذہانت سے تجاویز دیتا ہے۔ یہ کوئی انسانی ڈاکٹر یا لائسنس یافتہ ویٹرنری سرجن نہیں ہے۔
          </div>
          <div style={{ color: '#991b1b', background: '#fef2f2', padding: '6px 8px', borderRadius: 8, border: '1px solid #fecaca' }}>
            <strong>2. نقصان کی عدمِ ذمہ داری:</strong> فصلوں کے نقصان (اسپرے جلنے/بیماری)، جانوروں کی بیماری یا موت، اور منڈی کے اتار چڑھاؤ کے کسی مالی نقصان کی ذمہ دار ایپ نہیں ہوگی۔ تمام فیصلوں کے آپ خود ذمہ دار ہیں۔
          </div>
          <div>
            <strong>3. ڈاکٹری و توسیعی تصدیق ضروری:</strong> جانور کو کوئی انجیکشن لگانے سے پہلے سول ویٹرنری ہسپتال (0800-15000) اور زرعی زہر اسپرے سے قبل اپنے فیلڈ آفیسر سے تصدیق کریں۔
          </div>
          <div>
            <strong>4. ڈیٹا پرائیویسی (PECA 2016):</strong> آپ کا موبائل نمبر اور لوکیشن محفوظ ہے، CNIC کبھی نہیں مانگا جاتا، اور ڈیٹا کسی تیسری کمپنی کو فروخت نہیں ہوتا۔
          </div>
        </div>

        {/* Links to Full Documents */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '.78rem', marginBottom: '1rem' }}>
          <Link to="/terms" target="_blank" style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}>
            مکمل قواعد و ضوابط (Terms) پڑھیں
          </Link>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <Link to="/privacy" target="_blank" style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}>
            پرائیویسی پالیسی (Privacy) پڑھیں
          </Link>
        </div>

        {/* Interactive Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          background: acknowledged ? '#f0fdf4' : '#fffbeb',
          border: `1.5px solid ${acknowledged ? '#86efac' : '#fde68a'}`,
          borderRadius: 10,
          padding: '10px 12px',
          cursor: 'pointer',
          marginBottom: '1.25rem',
          transition: 'all .2s'
        }}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#166534', marginTop: 2, cursor: 'pointer' }}
            id="legal-consent-checkbox"
          />
          <span style={{ fontSize: '.8rem', fontWeight: 700, color: acknowledged ? '#14532d' : '#92400e', lineHeight: 1.5 }}>
            میں اقرار کرتا ہوں کہ میں نے تمام قانونی شرائط سمجھ لی ہیں، اور میں اپنے فیلڈ و فارم کے تمام فیصلوں کا خود 100% ذمہ دار ہوں۔
          </span>
        </label>

        {/* Action Button */}
        <button
          onClick={handleAccept}
          disabled={!acknowledged}
          id="legal-accept-btn"
          style={{
            width: '100%',
            padding: '.85rem',
            background: acknowledged ? 'linear-gradient(135deg, #166534, #22c55e)' : '#cbd5e1',
            color: acknowledged ? 'white' : '#64748b',
            border: 'none',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: '.95rem',
            cursor: acknowledged ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
            boxShadow: acknowledged ? '0 4px 14px rgba(22,101,52,0.3)' : 'none',
            fontFamily: 'Inter, "Noto Nastaliq Urdu", sans-serif'
          }}
        >
          ✓ میں متفق ہوں — ایپ شروع کریں
        </button>

        <div style={{ textAlign: 'center', marginTop: '.6rem', fontSize: '.7rem', color: '#94a3b8' }}>
          آفیشل رابطہ: dehatiaiofficial@gmail.com
        </div>
      </div>
    </div>
  );
}
