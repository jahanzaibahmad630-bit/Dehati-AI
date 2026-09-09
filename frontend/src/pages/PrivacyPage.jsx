import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'پرائیویسی پالیسی اور ڈیٹا تحفظ (Privacy Policy) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, "Noto Nastaliq Urdu", sans-serif', direction: 'rtl', lineHeight: 1.9 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
        <span>←</span> <span>مرکزی صفحہ پر واپس جائیں</span>
      </Link>

      <div style={{ background: 'linear-gradient(135deg, #162410 0%, #1E3A1E 100%)', color: 'white', padding: '1.75rem', borderRadius: 16, marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, lineHeight: 1.4 }}>پرائیویسی پالیسی و ڈیٹا کا تحفظ (Privacy Policy)</h1>
        <p style={{ color: '#a3c585', fontSize: '.85rem', margin: '6px 0 0 0' }}>
          آخری اپ ڈیٹ: 09 ستمبر 2026 | مروجہ قوانین: Prevention of Electronic Crimes Act (PECA 2016)
        </p>
      </div>

      {/* Security Guarantee Box */}
      <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 14, padding: '1.2rem', marginBottom: '1.5rem', color: '#14532d' }}>
        <div style={{ fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span>🛡️</span> <span>کسانوں کا ڈیٹا محفوظ اور خفیہ ہے</span>
        </div>
        <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.7 }}>
          DehatiAI پاکستان کے کسانوں کے ذاتی ڈیٹا، فون نمبر اور فارم کی معلومات کو انتہائی مقدس اور امانت سمجھتی ہے۔ ہم ملکی سائبر قوانین (PECA 2016) کے تحت آپ کے ڈیٹا کی رازداری کے 100% پابند ہیں۔
        </p>
      </div>

      <div style={{ background: 'white', padding: '1.75rem', borderRadius: 16, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

        {/* Section 1 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            1. ہم کون سی معلومات جمع کرتے ہیں؟ (Data We Collect)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>ہم صرف وہ محدود معلومات حاصل کرتے ہیں جو آپ کو بہترین زرعی رہنمائی فراہم کرنے کے لیے ناگزیر ہیں:</p>
          <ul style={{ paddingRight: '1.5rem', color: '#4b5563', fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>نام اور موبائل نمبر:</strong> صارف کے محفوظ لاگ ان اور شناخت کے لیے۔</li>
            <li><strong>ضلع اور تحصیل (مقام):</strong> تاکہ آپ کو صرف آپ کے علاقے کا درست موسم، مقامی منڈی کے ریٹ اور زرعی انتباہ مل سکے۔</li>
            <li><strong>میرا فارم پروفائل (فصلیں و جانور):</strong> تاکہ کھاد، اسپرے اور جانوروں کے چارے کے تخمینے آپ کے مخصوص رقبے اور جانوروں کے مطابق ہوں۔</li>
            <li><strong>کیمرہ اور مائیکروفون ڈیٹا:</strong> صرف تصویر سے بیماری پہچاننے اور آواز کے ذریعے اردو سوال پوچھنے کیلئے۔ یہ ریکارڈنگز پرائیویٹ رکھی جاتی ہیں۔</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '1.2rem' }}>
          <h2 style={{ color: '#92400e', fontSize: '1.15rem', margin: '0 0 8px 0' }}>
            2. شناختی کارڈ (CNIC) محفوظ نہ کرنے کی ضمانت
          </h2>
          <p style={{ color: '#78350f', fontSize: '.9rem', margin: 0, lineHeight: 1.7 }}>
            <strong>ہم کسان کا شناختی کارڈ (CNIC) کبھی محفوظ نہیں کرتے:</strong> DehatiAI پر کسان کارڈ یا کسی اسکیم کی جانچ کے لیے کوئی بھی حساس قومی شناختی دستاویز یا ڈیٹا بیس میں کسان کا CNIC ہرگز محفوظ نہیں کیا جاتا۔
          </p>
        </section>

        {/* Section 3 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            3. ڈیٹا سیکیورٹی اور جدید خفیہ کاری (256-Bit SSL Encryption)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            کسان کے فون اور ہمارے سرور کے درمیان ہونے والا ہر رابطہ بین الاقوامی معیار کی SSL/TLS 256-Bit انکرپشن سے محفوظ ہوتا ہے۔ ڈیٹا بیس میں کسانوں کے پاس ورڈز کو صنعت کے معیار (Bcrypt Hash) کے ذریعے خفیہ رکھا جاتا ہے، جسے کوئی بھی، بشمول ہمارے عملہ، پڑھ نہیں سکتا۔
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            4. تیسرے فریق کو ڈیٹا فروخت نہ کرنے کا پختہ عہد
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            ہم کسانوں کا فون نمبر، نام یا زرعی تفصیلات کسی بھی نجی کمپنی، کھاد/اسپرے کے سیلز ایجنٹس، مارکیٹنگ اداروں، یا ٹیلی مارکیٹرز کو ہرگز فروخت یا شیئر نہیں کرتے۔ آپ کا ڈیٹا صرف اور صرف آپ کے اپنے استعمال اور فائدہ کیلئے ہے۔
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            5. اکاؤنٹ اور تمام ڈیٹا ہمیشہ کیلئے ختم کرنے کا حق (Right to Deletion)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            سائبر قوانین (PECA 2016) کے تحت ہر کسان کو اپنے ڈیٹا پر مکمل اختیار حاصل ہے۔ آپ جب چاہیں ایپ کے "مزید (More)" مینو میں جا کر <strong>"🗑️ اکاؤنٹ ختم کریں"</strong> کا بٹن دبا کر اپنا پورا ریکارڈ، چیٹ ہسٹری اور فارم پروفائل مستقل طور پر سرور سے مٹا سکتے ہیں، یا ہمیں ای میل کر کے فوری ڈلیشن کا مطالبہ کر سکتے ہیں۔
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.15rem', margin: '0 0 8px 0' }}>
            6. ڈیٹا پرائیویسی آفیسر سے رابطہ (Privacy Officer Contact)
          </h2>
          <p style={{ color: '#475569', fontSize: '.88rem', margin: '0 0 12px 0' }}>
            اگر آپ کا اپنے ڈیٹا، رازداری یا اکاؤنٹ سے متعلق کوئی بھی سوال یا قانونی درخواست ہو، تو ہمارے آفیشل ڈیٹا پرائیویسی ڈیسک سے رجوع کریں:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.9rem' }}>
            <div><strong>📧 آفیشل ای میل:</strong> <a href="mailto:dehatiaiofficial@gmail.com" style={{ color: '#166534', fontWeight: 700 }}>dehatiaiofficial@gmail.com</a></div>
            <div><strong>🌐 سروس پورٹل:</strong> <a href="https://dehati-ai.vercel.app" style={{ color: '#166534', fontWeight: 700 }}>dehati-ai.vercel.app</a></div>
            <div><strong>🇵🇰 دائرہ اختیار:</strong> لاہور، پنجاب، اسلامی جمہوریہ پاکستان</div>
          </div>
        </section>

      </div>
    </div>
  );
}
