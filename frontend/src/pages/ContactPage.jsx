import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  useEffect(() => {
    document.title = 'ہم سے رابطہ کریں (Contact Us) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif', direction: 'rtl', lineHeight: 1.8 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none' }}>← مرکزی صفحہ پر واپس جائیں</Link>
      <h1 style={{ color: '#1E3A1E', fontSize: '1.8rem', marginTop: '1rem' }}>ہم سے رابطہ کریں (Contact & Support)</h1>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: 12, marginTop: '1.5rem', border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '1rem', color: '#374151' }}>پنجاب پاکستان کے کسانوں کی خدمت ہمارا مشن ہے۔ کسی بھی سوال، شکایت یا تجویز کے لیے رابطہ کریں:</p>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, borderRight: '4px solid #2F4A1E' }}>
            <strong>📧 ای میل:</strong> <a href="mailto:support@dehati-ai.app">support@dehati-ai.app</a>
          </div>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, borderRight: '4px solid #2F4A1E' }}>
            <strong>🌐 ویب سائٹ:</strong> <a href="https://dehati-ai.vercel.app">dehati-ai.vercel.app</a>
          </div>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, borderRight: '4px solid #2F4A1E' }}>
            <strong>📍 مقام:</strong> لاہور، پنجاب، پاکستان (Provincial AI Agriculture Center)
          </div>
        </div>
      </div>
    </div>
  );
}
