import { useState, useEffect } from 'react';

export default function PrivacyNotice() {
  const [show, setShow] = useState(() => {
    const seen = localStorage.getItem('dehati_privacy_seen');
    return !seen;
  });

  const dismiss = () => {
    localStorage.setItem('dehati_privacy_seen', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="overlay" style={{ zIndex: 500, alignItems: 'center' }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        maxWidth: '360px',
        width: '100%',
        margin: '1rem',
        direction: 'rtl',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '.75rem' }}>🔒</div>
        <h2 style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '.75rem' }}>
          ڈیٹا اور رازداری
        </h2>

        <ul className="privacy-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.25rem' }}>
          {[
            '✅ آپ کا نام، فون، ضلع اور زمین کا ڈیٹا محفوظ طریقے سے رکھا جاتا ہے',
            '✅ CNIC کبھی محفوظ نہیں کیا جاتا',
            '✅ AI سوالات کا ڈیٹا کسی تیسرے فریق کو نہیں دیا جاتا',
            '✅ آپ کسی بھی وقت اپنا اکاؤنٹ ختم کر سکتے ہیں',
            '✅ تمام ڈیٹا SSL سے محفوظ ہے'
          ].map((item, i) => (
            <li key={i} style={{ fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item}
            </li>
          ))}
        </ul>

        <p style={{ fontSize: '.75rem', color: 'var(--text-light)', marginBottom: '1rem', textAlign: 'center' }}>
          DehatiAI استعمال کر کے آپ ہماری رازداری پالیسی سے اتفاق کرتے ہیں
        </p>

        <button className="btn btn-primary btn-full" onClick={dismiss} id="privacy-accept-btn">
          ✓ سمجھ گیا — آگے بڑھیں
        </button>
      </div>
    </div>
  );
}
