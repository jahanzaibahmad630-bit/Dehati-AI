import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'پرائیویسی پالیسی (Privacy Policy) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif', direction: 'rtl', lineHeight: 1.8 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none' }}>← مرکزی صفحہ پر واپس جائیں</Link>
      <h1 style={{ color: '#1E3A1E', fontSize: '1.8rem', marginTop: '1rem' }}>پرائیویسی پالیسی (Privacy Policy)</h1>
      <p style={{ color: '#555', fontSize: '.9rem' }}>آخری اپ ڈیٹ: 03 اگست 2026</p>

      <section style={{ background: 'white', padding: '1.5rem', borderRadius: 12, marginTop: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem' }}>1. معلومات کا تحفّظ (Data Protection)</h2>
        <p>DehatiAI کسانوں کی پرائیویسی کا احترام کرتی ہے۔ ہم آپ کا نام، فون نمبر، اور ضلع صرف بہتر زرعی خدمات اور موسم و منڈی کی معلومات فراہم کرنے کے لیے استعمال کرتے ہیں۔</p>

        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem', marginTop: '1rem' }}>2. کیمرہ اور مائیکروفون کی اجازت (Permissions)</h2>
        <p>ہماری ایپ فصل کی بیماری کی تشخیص کے لیے کیمرہ اور آواز سے سوال پوچھنے کے لیے مائیکروفون استعمال کرتی ہے۔ یہ معلومات کبھی کسی تیسرے فریق (Third-party) کو نہیں بیچی جاتیں۔</p>

        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem', marginTop: '1rem' }}>3. DRAP اور ویٹرنری انتباہ (Medical & DRAP Disclaimer)</h2>
        <p>ایپ میں فراہم کردہ ادویات کی تجویز اور قیمتیں صرف عمومی رہنمائی کے لیے ہیں۔ کسانوں کو ہدایت کی جاتی ہے کہ وہ حتمی استعمال سے پہلے رجسٹرڈ ویٹرنری ڈاکٹر یا زراعت آفیسر سے تصدیق کریں۔</p>

        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem', marginTop: '1rem' }}>4. رابطہ (Contact Us)</h2>
        <p>اگر آپ کا کوئی سوال یا تحفظات ہیں تو آپ ہماری ٹیم سے رابطہ کر سکتے ہیں: <a href="mailto:support@dehati-ai.app">support@dehati-ai.app</a></p>
      </section>
    </div>
  );
}
