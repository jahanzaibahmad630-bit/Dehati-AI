import { useState, useMemo } from 'react';
import livestockDb from '../../data/livestockDatabase.json';
import { askAnimalHealth } from '../../services/api';
import AIDisclaimer from '../ui/AIDisclaimer';
import { useOffline } from '../../hooks/useOffline';
import InstitutionalBadge from '../ui/InstitutionalBadge';
import MarkdownRenderer from '../MarkdownRenderer';

const CATEGORIES = [
  { id: 'cattle_buffalo', label: 'گائے / بھینس', icon: '🐄', count: 13 },
  { id: 'goat_sheep', label: 'بکری / بھیڑ', icon: '🐐', count: 9 },
  { id: 'poultry', label: 'مرغی / پولٹری', icon: '🐓', count: 11 }
];

// ─── SPU Qadirabad & Punjab Livestock Breeding Standards ──────────────────────
const SILENT_HEAT_SIGNS = [
  { icon: '💧', title: 'شفاف لیس دار مواد (Clear Mucus)', desc: 'صبح چوئے کے وقت جانور کی اندام نہانی یا دودھ کی بالٹی میں پتلا، شیشے جیسا لیس دار مواد دکھائی دیتا ہے۔' },
  { icon: '⏱️', title: 'بار بار پیشاب کرنا (Frequent Urination)', desc: 'جانور تھوڑی تھوڑی دیر بعد بے چین ہو کر تھوڑا پیشاب کرتا ہے اور پاؤں مارتا ہے۔' },
  { icon: '🥛', title: 'ہوانے میں سوجن اور تناؤ', desc: 'ہوانہ ضرورت سے زیادہ بھرا ہوا اور رگیں زیادہ ابھری ہوئی محسوس ہوتی ہیں۔' },
  { icon: '🌾', title: 'چارہ کم کھانا اور بے چینی', desc: 'جانور کھلی پر چارہ چھوڑ دیتا ہے اور باڑے میں چکر کاٹتا ہے۔ گرمیوں میں ڈکار نہیں مارتا (خاموش مستی)۔' },
  { icon: '🐃', title: 'دوسرے جانوروں پر چڑھنا', desc: 'جھنڈ میں دوسرے جانوروں پر چڑھنے کی کوشش کرتا ہے مگر خود کھڑا نہیں ہوتا۔' },
];

const AI_TIMING_RULES = {
  morning: {
    label: 'صبح کے وقت علامات (AM: 6:00 تا 10:00)',
    action: 'اسی دن شام کو ٹیکہ لگوائیں (PM: 4:00 تا 8:00)',
    window: 'علامات کے 6 تا 8 گھنٹے بعد',
    conception: '55% تا 60% حاملہ ہونے کی شرح',
    tip: 'گرمیوں میں جانور کو دوپہر ٹھنڈے پانی سے نہلائیں تاکہ ہیٹ اسٹریس کم ہو'
  },
  evening: {
    label: 'شام کے وقت علامات (PM: 4:00 تا 8:00)',
    action: 'اگلی صبح ٹیکہ لگوائیں (AM: 6:00 تا 10:00)',
    window: 'علامات کے 6 تا 8 گھنٹے بعد (اگلی صبح)',
    conception: '55% تا 60% حاملہ ہونے کی شرح',
    tip: 'صبح جلد از جلد مستند AI ٹیکنیشن سے سیمن رکھوائیں'
  },
  silent: {
    label: 'خاموش مستی / صرف لیس دار مواد (Silent Heat)',
    action: 'پہلی علامت نظر آنے کے 12 تا 16 گھنٹے بعد',
    window: '12 تا 16 گھنٹے کا درمیانی وقفہ',
    conception: '45% تا 50% حاملہ ہونے کی شرح',
    tip: 'اعلیٰ کوالٹی (40% متحرک سپرم) والے اسٹرا کا استعمال لازمی کریں'
  }
};

// ─── Punjab Livestock & Dairy Development (L&DD) 12-Month Calendar ────────────
const PUNJAB_VACCINE_CALENDAR = [
  {
    month: 'مارچ (March)',
    disease: 'منہ کھر (FMD / Foot-and-Mouth)',
    vaccine: 'FMD Trivalent (O, A, Asia-1)',
    target: '6 ماہ سے بڑے تمام گائے و بھینس (بچھڑوں کو 4 ہفتے بعد بوسٹر)',
    badgeColor: '#0284c7',
    bg: '#f0f9ff',
    isMandatory: true,
    freeAtCVH: true,
    notes: 'سال میں دو مرتبہ (مارچ اور ستمبر)۔ دودھ دینے والے جانوروں کیلئے لازمی۔'
  },
  {
    month: 'مئی تا جون (May–June)',
    disease: 'گل گھوٹو (HS) و چوڑیا (BQ)',
    vaccine: 'HS Alum Bacterin + BQ Vaccine (کومبو)',
    target: 'تمام مویشی (گائے، بھینس، کٹڑے)',
    badgeColor: '#dc2626',
    bg: '#fef2f2',
    isMandatory: true,
    freeAtCVH: true,
    notes: '⚠️ مون سون سے قبل سب سے اہم ترین ٹیکہ! سیلابی علاقوں میں ایمرجنسی مہم چلائی جاتی ہے۔'
  },
  {
    month: 'اگست (August)',
    disease: 'گلٹی والا بخار (Anthrax)',
    vaccine: 'Anthrax Spore Vaccine (لائیو)',
    target: 'صرف حکومت کے نوٹیفائیڈ متاثرہ اضلاع میں',
    badgeColor: '#d97706',
    bg: '#fffbeb',
    isMandatory: false,
    freeAtCVH: true,
    notes: 'بیمار جانور کو ہرگز نہ لگائیں۔ صرف وبائی علاقوں میں حفاظتی ٹیکہ۔'
  },
  {
    month: 'ستمبر (September)',
    disease: 'منہ کھر دوسرا راؤنڈ (FMD Booster)',
    vaccine: 'FMD Trivalent دوسرا ڈوز',
    target: 'تمام گائے و بھینس',
    badgeColor: '#0284c7',
    bg: '#f0f9ff',
    isMandatory: true,
    freeAtCVH: true,
    notes: 'سردیوں کے آغاز سے قبل اینٹی باڈیز کی سطح برقرار رکھنے کیلئے۔'
  },
  {
    month: 'مئی تا جون و سال بھر',
    disease: 'ریکی (Enterotoxemia) و چیچک (Pox)',
    vaccine: 'ET Type-D + Sheep Pox Vaccine',
    target: 'چھوٹے جانور (بکریاں اور بھیڑیں)',
    badgeColor: '#16a34a',
    bg: '#f0fdf4',
    isMandatory: true,
    freeAtCVH: true,
    notes: 'نئی سبز گھاس چرانے سے قبل ریکی کا ٹیکہ لگانا بکریوں کو فوری موت سے بچاتا ہے۔'
  }
];

const SYMPTOM_TAGS = ['بخار', 'سوجن', 'اسہال', 'کھانسی', 'رال بہنا', 'لنگڑاپن', 'خون', 'وزن میں کمی', 'کمزوری', 'چھالے'];

export default function AnimalHealthAdvisor() {
  const [mainView, setMainView] = useState('clinic'); // 'clinic' | 'breeding'
  const [heatTime, setHeatTime] = useState('morning');
  const [activeCategory, setActiveCategory] = useState('cattle_buffalo');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);

  // Hybrid AI state
  const [animalWeight, setAnimalWeight] = useState('');
  const [weightTier, setWeightTier] = useState('tier3'); // default: adult dairy buffalo/cattle
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const { isOffline } = useOffline();

  const toggleSymptom = (sym) => {
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const clearFilters = () => {
    setSelectedSymptoms([]);
    setSearchQuery('');
    setSelectedDisease(null);
  };

  // Filter diseases based on active category, search query, and selected symptoms
  const currentDiseases = useMemo(() => {
    const list = livestockDb[activeCategory] || [];
    return list.filter(item => {
      // If a specific disease chip is selected
      if (selectedDisease && item.disease_name !== selectedDisease) {
        return false;
      }
      // Symptom filter
      if (selectedSymptoms.length > 0) {
        const matchesSymptom = selectedSymptoms.some(s =>
          item.symptoms.includes(s) || item.disease_name.includes(s) || item.general_treatment.includes(s)
        );
        if (!matchesSymptom) return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${item.disease_name} ${item.symptoms} ${item.type_cause} ${item.general_treatment} ${item.common_brands_pakistan} ${item.prevention_vaccine}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [activeCategory, selectedSymptoms, searchQuery, selectedDisease]);

  const askAI = async () => {
    if (isOffline) { setAiError('انٹرنیٹ نہیں ہے — آف لائن موڈ فعال ہے'); return; }
    const catLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || activeCategory;
    setAiLoading(true); setAiError(''); setAiResult('');
    try {
      const data = await askAnimalHealth(catLabel, selectedSymptoms.join(', '), aiQuestion || searchQuery, animalWeight);
      setAiResult(data.answer);
    } catch (err) {
      setAiError(err.message || 'جواب نہیں ملا — دوبارہ کوشش کریں');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', direction: 'rtl' }}>
      
      {/* ── 0ms Offline Veterinary Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #162410 0%, #2e5a27 100%)',
        borderRadius: '16px', padding: '.85rem 1rem',
        color: 'white', border: '1px solid #3a7232',
        boxShadow: '0 4px 12px rgba(46,90,39,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.4rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🩺</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#fbc02d', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
              ⚡ 0ms آف لائن ویٹرنری میڈیسن گائیڈ
            </div>
            <div style={{ fontSize: '.72rem', color: '#cbd5e1', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
              33 DRAP رجسٹرڈ پاکستان ادویات و ویکسینیشن شیڈول | محکمہ لائیوسٹاک ہیلپ لائن: 0800-15000
            </div>
          </div>
        </div>
        <span style={{
          background: 'rgba(16,185,129,0.2)', color: '#34d399',
          border: '1px solid #10b981', padding: '3px 10px', borderRadius: '12px',
          fontSize: '.7rem', fontWeight: 800
        }}>
          ● 0ms Local DB
        </span>
      </div>

      {/* ── Top Mode Switcher: Clinic vs Breeding ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button
          onClick={() => setMainView('clinic')}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${mainView === 'clinic' ? '#166534' : '#e2e8f0'}`,
            background: mainView === 'clinic' ? '#f0fdf4' : 'white',
            color: mainView === 'clinic' ? '#166534' : '#64748b',
            fontWeight: 800, fontSize: '.85rem', cursor: 'pointer', fontFamily: '"Noto Nastaliq Urdu", serif'
          }}
        >
          🩺 امراض و DRAP علاج
        </button>
        <button
          onClick={() => setMainView('breeding')}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${mainView === 'breeding' ? '#0369a1' : '#e2e8f0'}`,
            background: mainView === 'breeding' ? '#e0f2fe' : 'white',
            color: mainView === 'breeding' ? '#0369a1' : '#64748b',
            fontWeight: 800, fontSize: '.85rem', cursor: 'pointer', fontFamily: '"Noto Nastaliq Urdu", serif'
          }}
        >
          🧬 افزائش نسل و تخم کاری (SPU)
        </button>
      </div>

      {/* ── SPU BREEDING & SILENT HEAT VIEW ── */}
      {mainView === 'breeding' && (
        <div>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #075985, #0284c7)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
            <div style={{ fontSize: '1.6rem' }}>🧬</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>بھینس کی خاموش مستی و ٹیکہ ٹائمنگ گائیڈ</div>
              <div style={{ color: '#bae6fd', fontSize: '0.72rem', marginTop: 2 }}>
                سیمن پروڈکشن یونٹ (SPU) قادرآباد و لائیوسٹاک ڈیپارٹمنٹ پنجاب
              </div>
            </div>
          </div>

          {/* AM-PM Calculator Card */}
          <div style={{ background: 'white', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '12px', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '.9rem', marginBottom: 6 }}>
              ⏱️ AM-PM مصنوعی تخم کاری (AI) کیلکولیٹر:
            </div>
            <div style={{ fontSize: '.75rem', color: '#475569', marginBottom: 8 }}>
              جانور میں مستی کی پہلی علامت کب دیکھی؟
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(AI_TIMING_RULES).map(([key, r]) => (
                <button key={key}
                  onClick={() => setHeatTime(key)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, textAlign: 'right',
                    border: `2px solid ${heatTime === key ? '#0284c7' : '#e2e8f0'}`,
                    background: heatTime === key ? '#f0f9ff' : 'white',
                    color: heatTime === key ? '#0369a1' : '#334155',
                    fontWeight: 800, fontSize: '.8rem', cursor: 'pointer', fontFamily: '"Noto Nastaliq Urdu", serif'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px', marginTop: 10 }}>
              <div style={{ fontSize: '.72rem', color: '#166534', fontWeight: 700 }}>تجویز کردہ وقت:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803d', marginTop: 2 }}>
                {AI_TIMING_RULES[heatTime].action}
              </div>
              <div style={{ fontSize: '.72rem', color: '#16a34a', marginTop: 3 }}>
                وقفہ: <strong>{AI_TIMING_RULES[heatTime].window}</strong> | کامیابی شرح: <strong>{AI_TIMING_RULES[heatTime].conception}</strong>
              </div>
              <div style={{ fontSize: '.7rem', color: '#334155', marginTop: 4 }}>
                💡 <strong>ہدایت:</strong> {AI_TIMING_RULES[heatTime].tip}
              </div>
            </div>
          </div>

          {/* Summer Silent Heat Detection */}
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.9rem', marginBottom: 6 }}>
              🔍 گرمیوں میں نیلی راوی بھینس کی خاموش مستی کی 5 نشانیاں:
            </div>
            <div style={{ fontSize: '.72rem', color: '#78350f', marginBottom: 8, lineHeight: 1.5 }}>
              شدید گرمی میں بھینس آواز (بڑہک) نہیں مارتی جس سے کسان کو پتا نہیں چلتا اور سال ضائع ہو جاتا ہے۔ روزانہ صبح یہ علامات چیک کریں:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SILENT_HEAT_SIGNS.map((s, idx) => (
                <div key={idx} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #fed7aa', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#9a3412', fontSize: '.8rem' }}>{s.title}</div>
                    <div style={{ fontSize: '.7rem', color: '#475569', marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semen Straw Verification */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.88rem', marginBottom: 6 }}>
              🛡️ SPU قادرآباد تصدیق شدہ سیمن اسٹرا کی جانچ:
            </div>
            <div style={{ fontSize: '.72rem', color: '#475569', lineHeight: 1.6 }}>
              1. <strong>اسٹرا کوڈ فارمیٹ:</strong> اسٹرا پر سرکاری کوڈ لازمی چیک کریں، مثلاً: <code style={{ fontFamily: 'Inter', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, color: '#0369a1', fontWeight: 700 }}>QDB-[Bull-ID]-[Batch]-[Date]</code><br />
              2. <strong>لیکوئڈ نائٹروجن درجہ حرارت:</strong> سیمن سلنڈر کا درجہ حرارت <span style={{ fontFamily: 'Inter', fontWeight: 700 }}>-196°C</span> ہونا لازمی ہے۔ پگھلے ہوئے اسٹرا کو دوبارہ کبھی نہ جمائیں۔<br />
              3. <strong>متحرک سپرم (Motility):</strong> گرمیوں میں صرف 40% یا اس سے زائد متحرک سپرم والے اسٹرا استعمال کریں۔
            </div>
          </div>

          {/* ── 12-Month Punjab Livestock Vaccination & Deworming Calendar ── */}
          <div style={{ background: 'white', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '12px', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: '#166534', fontSize: '.92rem', marginBottom: 4 }}>
              📅 سالانہ حفاظتی ٹیکہ جات و پیٹ کے کیڑے شیڈول (L&DD پنجاب):
            </div>
            <div style={{ fontSize: '.72rem', color: '#475569', marginBottom: 8 }}>
              محکمہ لائیوسٹاک پنجاب (16-کوپر روڈ، لاہور) کا آفیشل سالانہ حفاظتی شیڈول:
            </div>

            {/* Deworming Buffer Alert */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.82rem' }}>
                💊 ٹیکہ لگانے سے 7 تا 10 دن قبل پیٹ کے کیڑے مارنا (Deworming) لازمی ہے!
              </div>
              <div style={{ fontSize: '.7rem', color: '#78350f', marginTop: 3, lineHeight: 1.5 }}>
                اگر جانور کے پیٹ میں کیڑے ہوں تو اس کی قوتِ مدافعت کمزور ہوتی ہے اور ویکسین کا اثر نہیں ہوتا۔ ویکسین سے ایک ہفتہ قبل <strong>البینڈازول 10% (Albendazole)</strong> یا <strong>آئیورمیکٹن (Ivermectin)</strong> لازمی پلائیں۔
              </div>
            </div>

            {/* Calendar Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {PUNJAB_VACCINE_CALENDAR.map((v, i) => (
                <div key={i} style={{ background: v.bg, border: `1px solid ${v.badgeColor}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, color: v.badgeColor, fontSize: '.85rem' }}>{v.month}</span>
                    <span style={{ background: 'white', color: v.badgeColor, border: `1px solid ${v.badgeColor}`, padding: '1px 8px', borderRadius: 10, fontSize: '.68rem', fontWeight: 800 }}>
                      {v.isMandatory ? 'لازمی ٹیکہ' : 'مخصوص اضلاع'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.82rem', marginTop: 3 }}>{v.disease}</div>
                  <div style={{ fontSize: '.7rem', color: '#475569', marginTop: 1 }}>
                    <strong>ویکسین:</strong> {v.vaccine} | <strong>ہدف:</strong> {v.target}
                  </div>
                  <div style={{ fontSize: '.68rem', color: '#334155', marginTop: 2, fontStyle: 'italic' }}>
                    {v.notes}
                  </div>
                </div>
              ))}
            </div>

            {/* Civil Veterinary Hospital Free Notice */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: '.72rem', color: '#166534', lineHeight: 1.5 }}>
              🏥 <strong>سرکاری مفت سہولت:</strong> پنجاب کے تمام سول ویٹرنری ہسپتالوں (CVH) اور موبائل یونٹس پر HS, BQ اور FMD کی ویکسینز حکومتِ پنجاب کی طرف سے بلامعاوضہ (مفت) دستیاب ہوتی ہیں۔ ہیلپ لائن: <strong>0800-15000</strong>
            </div>
          </div>

          <InstitutionalBadge type="spu" helpline="0800-15000" />
        </div>
      )}

      {/* ── CLINIC VIEW ── */}
      {mainView === 'clinic' && (
        <>
          {/* ── 1. Category Selector Tabs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.4rem' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedDisease(null); }}
              style={{
                padding: '.6rem .3rem',
                borderRadius: '12px',
                border: isActive ? '2px solid #2e5a27' : '1px solid rgba(0,0,0,0.1)',
                background: isActive ? 'linear-gradient(135deg, #1e3a16, #2e5a27)' : 'white',
                color: isActive ? 'white' : '#1f2937',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                transition: 'all .2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(46,90,39,0.25)' : '0 1px 3px rgba(0,0,0,0.05)'
              }}
              id={`livestock-tab-${cat.id}`}
            >
              <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
              <span style={{ fontSize: '.82rem', fontWeight: 800, fontFamily: '"Noto Nastaliq Urdu", serif' }}>{cat.label}</span>
              <span style={{ fontSize: '.68rem', opacity: isActive ? 0.9 : 0.6, fontFamily: 'Inter, sans-serif' }}>{cat.count} بیماریاں</span>
            </button>
          );
        })}
      </div>

      {/* ── 2. Live Search & Symptom Filters ── */}
      <div style={{ background: 'white', padding: '.85rem', borderRadius: '16px', border: '1px solid rgba(163,197,133,0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 بیماری یا علامات (مثلاً: بخار، سوجن، اسہال)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '.88rem', padding: '.65rem 1rem', borderRadius: '24px' }}
          />
          {(searchQuery || selectedSymptoms.length > 0 || selectedDisease) && (
            <button
              onClick={clearFilters}
              style={{ padding: '.5rem .8rem', borderRadius: '20px', border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              صاف کریں ✕
            </button>
          )}
        </div>

        {/* Quick Symptom Chips */}
        <div>
          <div style={{ fontSize: '.75rem', color: '#4b5563', fontWeight: 700, marginBottom: '.4rem', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
            🏷️ علامات چنیں (1-کلک فلٹر):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
            {SYMPTOM_TAGS.map(sym => {
              const isSelected = selectedSymptoms.includes(sym);
              return (
                <button
                  key={sym}
                  onClick={() => toggleSymptom(sym)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: isSelected ? '1.5px solid #2e5a27' : '1px solid #d1d5db',
                    background: isSelected ? '#e8f5e3' : '#f9fafb',
                    color: isSelected ? '#1e3a16' : '#4b5563',
                    fontSize: '.78rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    fontFamily: '"Noto Nastaliq Urdu", serif'
                  }}
                >
                  {isSelected ? '✓ ' : ''}{sym}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Quick Disease Chips (1-Tap Diagnosis) ── */}
      <div>
        <div style={{ fontSize: '.8rem', color: '#1a3a16', fontWeight: 800, marginBottom: '.4rem', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
          ⚡ فوری بیماری منتخب کریں (0ms آف لائن):
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '.4rem', paddingBottom: '.4rem', scrollbarWidth: 'none' }}>
          {(livestockDb[activeCategory] || []).map(item => {
            const isSel = selectedDisease === item.disease_name;
            const shortName = item.disease_name.split(' (')[0];
            return (
              <button
                key={item.disease_name}
                onClick={() => setSelectedDisease(isSel ? null : item.disease_name)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isSel ? '2px solid #fbc02d' : '1px solid #2e5a27',
                  background: isSel ? '#2e5a27' : 'white',
                  color: isSel ? '#fbc02d' : '#2e5a27',
                  fontSize: '.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  fontFamily: '"Noto Nastaliq Urdu", serif'
                }}
              >
                {shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Instant 0ms Disease Treatment Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
        {currentDiseases.length === 0 ? (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', color: '#6b7280', border: '1.5px dashed #cbd5e1' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', fontFamily: '"Noto Nastaliq Urdu", serif' }}>کوئی مطابقت رکھنے والی بیماری نہیں ملی</div>
            <div style={{ fontSize: '.78rem', marginTop: '.3rem' }}>برائے مہربانی دیگر علامات تلاش کریں یا نیچے AI سے پوچھیں</div>
          </div>
        ) : (
          currentDiseases.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1rem 1.1rem',
                border: '1.5px solid rgba(46,90,39,0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', gap: '.6rem'
              }}
            >
              {/* Header: Title & Cause Tag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#162410', fontWeight: 800, fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                    🩺 {item.disease_name}
                  </h3>
                  <div style={{ fontSize: '.72rem', color: '#4b5563', marginTop: '2px' }}>
                    متاثرہ جانور: <strong>{item.affected_animals}</strong>
                  </div>
                </div>
                <span
                  style={{
                    padding: '3px 10px', borderRadius: '12px',
                    background: item.type_cause.includes('وائرس') ? '#fef2f2' : item.type_cause.includes('بیکٹیریا') ? '#eff6ff' : '#fefce8',
                    color: item.type_cause.includes('وائرس') ? '#dc2626' : item.type_cause.includes('بیکٹیریا') ? '#2563eb' : '#d97706',
                    border: `1px solid ${item.type_cause.includes('وائرس') ? '#fca5a5' : item.type_cause.includes('بیکٹیریا') ? '#93c5fd' : '#fde047'}`,
                    fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap'
                  }}
                >
                  {item.type_cause}
                </span>
              </div>

              {/* Symptoms List */}
              <div style={{ background: '#f8fafc', padding: '.65rem .85rem', borderRadius: '10px', borderRight: '4px solid #e2e8f0' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#334155', marginBottom: '2px', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                  ⚠️ علامات:
                </div>
                <div style={{ fontSize: '.82rem', color: '#1e293b', lineHeight: '1.6' }}>
                  {item.symptoms}
                </div>
              </div>

              {/* General Treatment */}
              <div style={{ background: '#f0fdf4', padding: '.65rem .85rem', borderRadius: '10px', borderRight: '4px solid #16a34a' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#15803d', marginBottom: '2px', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                  💊 فوری عمومی علاج:
                </div>
                <div style={{ fontSize: '.82rem', color: '#14532d', lineHeight: '1.6' }}>
                  {item.general_treatment}
                </div>
              </div>

              {/* DRAP Registered Pakistani Brands */}
              <div style={{ background: '#fffbe8', padding: '.65rem .85rem', borderRadius: '10px', borderRight: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#b45309', marginBottom: '2px', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                  🇵🇰 DRAP رجسٹرڈ پاکستان برانڈز (ادویات):
                </div>
                <div style={{ fontSize: '.82rem', color: '#78350f', fontWeight: 700, lineHeight: '1.6' }}>
                  {item.common_brands_pakistan}
                </div>
              </div>

              {/* Prevention & Vaccine Schedule */}
              <div style={{ background: '#eff6ff', padding: '.65rem .85rem', borderRadius: '10px', borderRight: '4px solid #3b82f6' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '2px', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
                  🛡️ بچاؤ و ویکسینیشن شیڈول:
                </div>
                <div style={{ fontSize: '.82rem', color: '#1e40af', lineHeight: '1.6' }}>
                  {item.prevention_vaccine}
                </div>
              </div>

              {/* Veterinary Disclaimer */}
              <div style={{ fontSize: '.7rem', color: '#64748b', background: '#f1f5f9', padding: '.4rem .75rem', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                ⚠️ {livestockDb.meta.disclaimer_dosage}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── DRAP Institutional Badge ── */}
      <InstitutionalBadge type="drap" helpline="0800-15000" />

      {/* ── 5. DehatiAI Hybrid AI Fallback Section ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a16, #2e5a27)', padding: '1.1rem', borderRadius: '18px', color: 'white', boxShadow: '0 4px 16px rgba(46,90,39,0.3)', marginTop: '.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
          <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#fbc02d', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
            🤖 DehatiAI ویٹرنری ڈاکٹر (AI ہائبرڈ)
          </div>
          <AIDisclaimer small />
        </div>
        
        <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 .75rem', lineHeight: '1.5' }}>
          اگر آپ کو مخصوص علامات کے بارے میں مزید گہرائی سے معلوم کرنا ہے تو DehatiAI سے لائیو سوال پوچھیں:
        </p>

        <textarea
          className="input"
          rows={2}
          placeholder="مثلاً: بھینس کو دو دن سے 104 بخار ہے اور ٹانگوں پر سوجن ہے، کیا کریں؟"
          value={aiQuestion}
          onChange={e => setAiQuestion(e.target.value)}
          style={{ width: '100%', background: 'white', color: '#111827', borderRadius: '12px', fontSize: '.85rem', marginBottom: '.6rem' }}
        />

        <button
          onClick={askAI}
          disabled={aiLoading}
          style={{
            width: '100%', padding: '.75rem', borderRadius: '24px', border: 'none',
            background: 'linear-gradient(135deg, #fbc02d, #f59e0b)',
            color: '#162410', fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(251,192,45,0.4)',
            transition: 'all .2s'
          }}
          id="livestock-ai-ask-btn"
        >
          {aiLoading ? '🔍 DehatiAI تجویز کر رہا ہے...' : '✨ DehatiAI سے لائیو مشورہ لیں'}
        </button>

        {aiError && (
          <div style={{ marginTop: '.6rem', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '.5rem .75rem', borderRadius: '8px', fontSize: '.78rem', fontWeight: 700 }}>
            ⚠️ {aiError}
          </div>
        )}

        {aiResult && (
          <div style={{ marginTop: '1rem', background: 'white', color: '#1e293b', borderRadius: '14px', padding: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '.82rem', fontWeight: 800, color: '#162410', marginBottom: '.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '.4rem' }}>
              📋 DehatiAI کی ویٹرنری رپورٹ:
            </div>
            <MarkdownRenderer text={aiResult} />
            <div style={{ marginTop: '.6rem', background: '#fffbe8', border: '1px solid #fde047', color: '#b45309', padding: '.5rem .75rem', borderRadius: '8px', fontSize: '.75rem', fontWeight: 700, fontFamily: '"Noto Nastaliq Urdu", serif' }}>
              ⚠️ یہ AI طبی تجزیہ ہے۔ حتمی علاج اور ادویات کی مقدار طے کرنے سے پہلے متعلقہ ڈسپنسری، ویٹرنری آفیر یا مستند ڈاکٹر سے لازمی مشورہ کریں۔
            </div>
          </div>
        )}
      </div>
      </>
      )}

    </div>
  );
}
