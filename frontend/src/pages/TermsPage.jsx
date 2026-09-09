import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  useEffect(() => {
    document.title = 'قواعد و ضوابط اور قانونی انتباہ (Terms of Service) — DehatiAI';
  }, []);

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'Inter, "Noto Nastaliq Urdu", sans-serif', direction: 'rtl', lineHeight: 1.9 }}>
      <Link to="/" style={{ color: '#2F4A1E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
        <span>←</span> <span>مرکزی صفحہ پر واپس جائیں</span>
      </Link>

      <div style={{ background: 'linear-gradient(135deg, #162410 0%, #1E3A1E 100%)', color: 'white', padding: '1.75rem', borderRadius: 16, marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>⚖️</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, lineHeight: 1.4 }}>قواعد و ضوابط اور قانونی تحفظ (Terms of Service)</h1>
        <p style={{ color: '#a3c585', fontSize: '.85rem', margin: '6px 0 0 0' }}>
          آخری اپ ڈیٹ: 09 ستمبر 2026 | اسلامی جمہوریہ پاکستان (PECA 2016 اور PVMC قوانین کے تحت)
        </p>
      </div>

      {/* Critical Legal Banner */}
      <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 14, padding: '1.2rem', marginBottom: '1.5rem', color: '#991b1b' }}>
        <div style={{ fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span>⚠️</span> <span>اہم ترین قانونی اعلان: DehatiAI ڈاکٹر یا حکومتی ادارہ نہیں ہے</span>
        </div>
        <p style={{ margin: 0, fontSize: '.9rem', lineHeight: 1.7 }}>
          DehatiAI صرف ایک مصنوعی ذہانت (AI) پر مبنی تعلیمی و معلوماتی سافٹ ویئر ہے، یہ کوئی مستند انسانی ڈاکٹر، رجسٹرڈ ویٹرنری سرجن (PVMC)، یا مجاز زرعی کیمیکل ڈیلر نہیں ہے۔ ایپ میں دی گئی معلومات کی بنیاد پر کیے گئے کسی بھی فیصلے یا عمل کے آپ خود ذمہ دار ہیں۔
        </p>
      </div>

      <div style={{ background: 'white', padding: '1.75rem', borderRadius: 16, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

        {/* Section 1 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            1. استعمال کی شرائط اور معاہدہ (Acceptance of Terms)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            DehatiAI ایپلیکیشن یا ویب سائٹ استعمال کرنے سے آپ ان قواعد و ضوابط کے مکمل پابند تسلیم ہوں گے۔ اگر آپ ان شرائط سے متفق نہیں ہیں، تو آپ کو فوری طور پر اس ایپ کا استعمال بند کر دینا چاہیے۔ یہ سروس کسانوں کی عمومی رہنمائی اور زرعی آگاہی کے لیے فراہم کی گئی ہے۔
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            2. عدمِ ذمہ داری کا مکمل قانونی اعلان (Absolute Limitation of Liability)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            قانون کی مکمل اجازت کے مطابق، DehatiAI، اس کے مالکان، ڈویلپرز اور آپریٹرز کسی بھی درج ذیل نقصان، خرابی، یا مالی دعوے کے ہرگز قانونی یا مالی طور پر ذمہ دار نہیں ہوں گے:
          </p>
          <ul style={{ paddingRight: '1.5rem', color: '#4b5563', fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>فصلوں اور باغات کا نقصان:</strong> کسی بیماری، کیڑے، اسپرے کے غلط انتخاب یا اسپرے کے زیادہ/کم ہونے کی صورت میں فصل کے جلنے، پیلے پڑنے یا پیداوار کم ہونے کی تمام تر ذمہ داری کسان پر ہوگی۔</li>
            <li><strong>مویشی اور پرندوں کی ہلاکت یا بیماری:</strong> جانوروں کی صحت، علامتی تجاویز، یا فرسٹ ایڈ پر عمل کے نتیجے میں پیدا ہونے والی کسی پیچیدگی، بیماری یا جانور کی موت کی صورت میں DehatiAI پر کوئی قانونی کارروائی یا ہرجانہ لاگو نہیں ہوگا۔</li>
            <li><strong>منڈی کے ریٹس اور تجارتی اتار چڑھاؤ:</strong> منڈی کی قیمتیں اور تخمینے تاریخی یا اوپن ڈیٹا ذرائع سے لیے جاتے ہیں، کسی ریٹ میں فرق یا کاروباری نقصان پر ایپ جوابدہ نہیں ہے۔</li>
            <li><strong>سرکاری اسکیمیں اور سبسڈیز:</strong> کسان کارڈ یا کسی حکومتی اسکیم کی اہلیت کا ٹول صرف تخمینہ ہے؛ حتمی فیصلہ صرف متعلقہ بینک اور حکومت پنجاب کرتی ہے۔</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            3. پاکستان ویٹرنری کونسل (PVMC) اور زرعی توسیع ضوابط
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            پاکستان کے مروجہ قوانین اور PVMC ایکٹ کے تحت جانوروں کے نسخہ جات، اینٹی بائیوٹک انجیکشنز اور سرجیکل طریقہ کار کا حتمی اختیار صرف لائسنس یافتہ ویٹرنری ڈاکٹر (DVM) کے پاس ہے۔
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px', fontSize: '.85rem', color: '#166534', marginTop: '8px' }}>
            📌 <strong>لازمی ہدایت:</strong> جانور کو کوئی بھی تیز دوا یا انجیکشن دینے سے پہلے اپنے قریبی <strong>سول ویٹرنری ہسپتال (CVH)</strong> کے رجسٹرڈ ڈاکٹر سے ملیں یا پنجاب حکومت کی فری ہیلپ لائن <strong>0800-15000</strong> پر کال کریں۔ اسی طرح فصل پر نیا زہر اسپرے کرنے سے پہلے اپنے علاقائی زرعی توسیع آفیسر (Agriculture Extension Officer) سے تصدیق لازمی کروائیں۔
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            4. کسان کا ذاتی اقرار و خود مختاری (User Autonomy & Consent)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            ایپ استعمال کرنے والا کسان رضاکارانہ طور پر اقرار کرتا ہے کہ وہ ایک آزاد خودمختار کسان ہے، اور AI کے دیے گئے کسی بھی تجزیے کو صرف ایک مشاورتی ابتدائی رائے کے طور پر لیتا ہے۔ زمینی حالات، موسم، مٹی اور جانور کی اصل کیفیت کو جانچ کر فیصلہ کرنے کا اختیار اور خطرہ 100% کسان کی اپنی صوابدید پر منحصر ہے۔
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.2rem', borderBottom: '2px solid #e8f5e3', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            5. نافذ العمل قانون (Governing Law - Islamic Republic of Pakistan)
          </h2>
          <p style={{ color: '#374151', fontSize: '.92rem' }}>
            یہ قواعد و ضوابط اسلامی جمہوریہ پاکستان کے قوانین کے تابع ہیں، بشمول Prevention of Electronic Crimes Act 2016 (PECA) اور دیگر متعلقہ ملکی قوانین۔ تمام قانونی تنازعات صرف پاکستان کی مجاز عدالتوں کے دائرہ اختیار میں حل کیے جائیں گے۔
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#1E3A1E', fontSize: '1.15rem', margin: '0 0 8px 0' }}>
            6. قانونی رابطہ اور استفسار (Official Legal Contact)
          </h2>
          <p style={{ color: '#475569', fontSize: '.88rem', margin: '0 0 12px 0' }}>
            قواعد و ضوابط، ڈیٹا حقوق یا قانونی معلومات سے متعلق کسی بھی سوال کیلئے ہمارے آفیشل قانونی نمائندے سے رابطہ کریں:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.9rem' }}>
            <div><strong>📧 آفیشل ای میل:</strong> <a href="mailto:dehatiaiofficial@gmail.com" style={{ color: '#166534', fontWeight: 700 }}>dehatiaiofficial@gmail.com</a></div>
            <div><strong>🌐 آفیشل پورٹل:</strong> <a href="https://dehati-ai.vercel.app" style={{ color: '#166534', fontWeight: 700 }}>dehati-ai.vercel.app</a></div>
            <div><strong>🏢 مرکز:</strong> پنجاب، پاکستان</div>
          </div>
        </section>

      </div>
    </div>
  );
}
