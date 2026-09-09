import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  useEffect(() => {
    document.title = 'ہم سے رابطہ کریں (Contact Us) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, "Noto Nastaliq Urdu", sans-serif', direction: 'rtl', lineHeight: 1.9 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
        <span>←</span> <span>مرکزی صفحہ پر واپس جائیں</span>
      </Link>

      <div style={{ background: 'linear-gradient(135deg, #162410 0%, #1E3A1E 100%)', color: 'white', padding: '1.75rem', borderRadius: 16, marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📞</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, lineHeight: 1.4 }}>ہم سے رابطہ کریں (Contact & Support)</h1>
        <p style={{ color: '#a3c585', fontSize: '.85rem', margin: '6px 0 0 0' }}>
          DehatiAI سپورٹ، قانونی و تیکنیکی معاونت | کسانوں کی خدمت ہمارا مشن ہے
        </p>
      </div>

      <div style={{ background: 'white', padding: '1.75rem', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: '1rem', color: '#374151', margin: '0 0 1.25rem 0' }}>
          پنجاب اور پاکستان بھر کے کسانوں کی رہنمائی، تکنیکی مدد، یا قانونی تجاویز کے لیے ہماری ٹیم ہمہ وقت دستیاب ہے:
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: 12, borderRight: '5px solid #2e5a27', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.95rem' }}>📧 آفیشل ای میل (سپورٹ و قانونی سوالات):</div>
            <div>
              <a href="mailto:dehatiaiofficial@gmail.com" style={{ color: '#166534', fontWeight: 800, fontSize: '1rem', textDecoration: 'none' }}>
                dehatiaiofficial@gmail.com
              </a>
            </div>
            <div style={{ fontSize: '.8rem', color: '#64748b' }}>تمام تجاویز، تکنیکی خرابیوں اور ڈیٹا ڈیلیشن کی درخواستوں پر 24 گھنٹوں میں عمل کیا جاتا ہے۔</div>
          </div>

          <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: 12, borderRight: '5px solid #2e5a27', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.95rem' }}>🌐 آفیشل ویب ایپ:</div>
            <div>
              <a href="https://dehati-ai.vercel.app" style={{ color: '#166534', fontWeight: 800, textDecoration: 'none' }}>
                dehati-ai.vercel.app
              </a>
            </div>
          </div>

          <div style={{ padding: '1.2rem', background: '#f0fdf4', borderRadius: 12, borderRight: '5px solid #16a34a', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 800, color: '#14532d', fontSize: '.95rem' }}>🚨 سرکاری ہنگامی زرعی و لائیوسٹاک ہیلپ لائنز:</div>
            <div style={{ fontSize: '.85rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div>• <strong>محکمہ لائیوسٹاک پنجاب ہیلپ لائن:</strong> <a href="tel:0800-15000" style={{ color: '#166534', fontWeight: 800 }}>0800-15000</a> (مفت مشورہ و ویکسینیشن)</div>
              <div>• <strong>پنجاب کسان کارڈ ہیلپ لائن:</strong> <strong>8070</strong></div>
              <div>• <strong>ریسکیو ایمرجنسی:</strong> <a href="tel:1122" style={{ color: '#dc2626', fontWeight: 800 }}>1122</a></div>
            </div>
          </div>

          <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: 12, borderRight: '5px solid #2e5a27' }}>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.95rem' }}>📍 پتہ:</div>
            <div style={{ fontSize: '.88rem', color: '#475569', marginTop: 3 }}>لاہور، پنجاب، پاکستان (DehatiAI Agritech Center)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
