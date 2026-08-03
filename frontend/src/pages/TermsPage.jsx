import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  useEffect(() => {
    document.title = 'قواعد و ضوابط (Terms of Service) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif', direction: 'rtl', lineHeight: 1.8 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none' }}>← مرکزی صفحہ پر واپس جائیں</Link>
      <h1 style={{ color: '#1E3A1E', fontSize: '1.8rem', marginTop: '1rem' }}>قواعد و ضوابط (Terms of Service)</h1>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, marginTop: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem' }}>1. استعمال کی شرائط</h2>
        <p>DehatiAI ایپ کا استعمال مفت ہے اور یہ پنجاب کے کسانوں کے لیے تعلیمی و زرعی رہنمائی کے مقصد کے لیے بنائی گئی ہے۔</p>

        <h2 style={{ color: '#2F4A1E', fontSize: '1.2rem', marginTop: '1rem' }}>2. زرعی مشورے کی حد</h2>
        <p>ایپ میں فراہم کردہ AI مشورے، بیماریوں کی تشخیص اور کھاد کی مقدار عام رہنمائی کے لیے ہیں۔ کسانوں کو ہدایت کی جاتی ہے کہ وہ فیلڈ حالات کے مطابق اپنے مقامی زراعت آفیسر سے بھی مشورہ لیں۔</p>
      </div>
    </div>
  );
}
