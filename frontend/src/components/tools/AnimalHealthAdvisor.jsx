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

const SYMPTOM_TAGS = ['بخار', 'سوجن', 'اسہال', 'کھانسی', 'رال بہنا', 'لنگڑاپن', 'خون', 'وزن میں کمی', 'کمزوری', 'چھالے'];

export default function AnimalHealthAdvisor() {
  const [activeCategory, setActiveCategory] = useState('cattle_buffalo');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);

  // Hybrid AI state
  const [animalWeight, setAnimalWeight] = useState('');
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

    </div>
  );
}
