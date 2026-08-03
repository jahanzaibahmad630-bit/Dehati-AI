import { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { useOffline } from '../hooks/useOffline';
import { detectDisease, getDiseaseCatalog } from '../services/api';
import AnimalHealthAdvisor from '../components/tools/AnimalHealthAdvisor';

async function compressImage(file, maxSizeMB = 0.4) {
  try {
    const options = { maxSizeMB, maxWidthOrHeight: 1024, useWebWorker: true };
    return await imageCompression(file, options);
  } catch {
    return file;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const base64 = typeof res === 'string' ? res.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AIDisclaimer({ small = false }) {
  return (
    <span style={{
      fontSize: small ? '.7rem' : '.78rem',
      color: '#f59e0b',
      background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.3)',
      padding: '2px 8px',
      borderRadius: 12,
      fontWeight: 600
    }}>
      ⚠️ ڈاکٹر سے تصدیق کرائیں
    </span>
  );
}

const CROPS = [
  'گندم', 'چاول / دھان', 'کپاس', 'گنا', 'مکئی', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'مونگ', 'سبزی (عام)'
];

const PHOTO_TIPS = [
  { icon: '☀️', tip: 'دھوپ میں لیں — روشنی کافی ہو' },
  { icon: '🔍', tip: 'متاثرہ پتے / حصہ قریب سے دکھائیں' },
  { icon: '📐', tip: 'کیمرہ سیدھا رکھیں — دھندلا نہ ہو' },
  { icon: '🌿', tip: 'ایک پتہ فریم میں واضح ہو' },
];

// Land sizes for dosage multiplier (ایکڑ)
const LAND_SIZES = [1, 2, 5, 10];

// Roman Urdu lookup for common 306-class disease names
const ROMAN_URDU_MAP = {
  'wheat yellow stripe rust':      'Gandam ki Peeli Zang',
  'wheat brown rust':              'Gandam ki Bhoori Zang',
  'wheat black stem rust':         'Gandam ki Kali Zang',
  'wheat powdery mildew':          'Gandam ka Bhabhootiya',
  'wheat loose smut':              'Gandam ka Aasar / Kanda',
  'wheat karnal bunt':             'Gandam ka Karnal Bunt',
  'wheat septoria leaf blotch':    'Gandam ka Patton ka Dhaba',
  'cotton whitefly':               'Kapas ki Safaid Makkhi',
  'cotton bollworm':               'Kapas ki Sundee / Bollworm',
  'cotton pink bollworm':          'Kapas ki Gulaabi Sundee',
  'cotton bacterial blight':       'Kapas ki Phoondki / Blight',
  'cotton leaf curl virus':        'Kapas ka Patta Murjhanay ka Vairis',
  'rice blast':                    'Chawal / Dhan ka Jhalsa',
  'rice brown spot':               'Chawal ka Bhoora Dhaba',
  'rice bacterial blight':         'Chawal ki Bacterial Blight',
  'rice sheath blight':            'Chawal ki Patti Blight',
  'potato late blight':            'Aloo ki Pichli Jhulsa Bimari',
  'potato early blight':           'Aloo ki Ageti Jhulsa Bimari',
  'tomato leaf curl':              'Tamatar ka Patta Morna',
  'tomato bacterial wilt':         'Tamatar ki Bacterial Murjhahat',
  'maize northern leaf blight':    'Makkai ka Patton ka Jhulsa',
  'sugarcane red rot':             'Ganna ki Lal Sarak Bimari',
  'sugarcane smut':                'Ganna ka Kala Kanda',
  'mustard white rust':            'Sarson ki Safaid Zang',
  'chickpea fusarium wilt':        'Chana ki Jari Murjhahat',
};

/**
 * Derive Roman Urdu name from disease_en string.
 * Falls back to romanized transliteration of disease_en.
 */
function getRomanUrdu(diseaseEn, diseaseUr) {
  if (!diseaseEn) return diseaseUr ? 'Fasal Bimari' : 'Fasal Bimari';
  const key = diseaseEn.toLowerCase().trim();
  if (ROMAN_URDU_MAP[key]) return ROMAN_URDU_MAP[key];
  // Partial match
  const partial = Object.keys(ROMAN_URDU_MAP).find(k => key.includes(k) || k.includes(key));
  if (partial) return ROMAN_URDU_MAP[partial];
  // Fallback: title-case the English name as Roman Urdu approximation
  return diseaseEn.replace(/\b\w/g, c => c.toUpperCase());
}

export default function DiseasePage() {
  const [mainTab, setMainTab]     = useState('crops'); // 'crops' or 'livestock'
  const [image, setImage]         = useState(null);
  const [imageUrl, setImageUrl]   = useState('');
  const [crop, setCrop]           = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]         = useState('');
  const [showTips, setShowTips]   = useState(true);
  const [landSize, setLandSize]   = useState(1); // Dosage multiplier (acres)

  // 306-class manual search state
  const [catalog, setCatalog]     = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const fileRef = useRef(null);
  const { isOffline } = useOffline();

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Load 306 disease catalog on demand or mount
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    getDiseaseCatalog()
      .then(res => {
        if (active && res?.catalog) setCatalog(res.catalog);
      })
      .catch(err => console.warn('Catalog load error:', err.message))
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError('');
    setShowTips(false);
    setShowCatalog(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImage(file);
  };

  const handleDetect = async () => {
    if (!image) { setError('پہلے تصویر لیں یا ڈائریکٹری سے بیماری منتخب کریں'); return; }
    if (isOffline) { setError('انٹرنیٹ نہیں — AI بند ہے'); return; }

    setLoading(true);
    setCompressing(true);
    setError('');
    setResult(null);

    try {
      const compressed = await compressImage(image, 0.4);
      setCompressing(false);
      const base64 = await fileToBase64(compressed);
      const data = await detectDisease(base64, crop || null, compressed.type || 'image/jpeg');
      setResult(data);
    } catch (err) {
      setCompressing(false);
      setError(err.message || 'تجزیہ ناکام — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromCatalog = async (item) => {
    setLoading(true);
    setError('');
    setResult(null);
    setShowCatalog(false);
    try {
      const data = await detectDisease(null, crop || item.name_en, 'image/jpeg', item.key);
      setResult(data);
    } catch (err) {
      setError('معلومات حاصل کرنے میں ناکامی');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(null);
    setImageUrl('');
    setResult(null);
    setError('');
    setShowTips(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const shareWhatsApp = () => {
    if (!result) return;
    const text = `🌾 DehatiAI فصل تجزیہ نتیجہ:\n\n🔬 بیماری: ${result.disease || result.disease_ur}\n⚡ وجہ: ${result.cause}\n💊 علاج: ${result.treatment}\n⚠️ پرہیزی دن: ${result.withholding_period_days || 14} دن\n🌿 دیسی علاج: ${result.organic_alternative || '—'}\n\n🤖 DehatiAI - dehati-ai.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ur-PK'; utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const filteredCatalog = catalog.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name_en.toLowerCase().includes(q) || c.name_ur.includes(q) || c.key.includes(q);
  });

  const spokenText = result
    ? [
        `بیماری: ${result.disease_ur || result.disease}۔`,
        `علاج: ${result.treatment}۔`,
        result.medicines && result.medicines.length > 0
          ? `تجویز کردہ ادویات: ${result.medicines.map(m => `${m.brand}، ${m.dosage}`).join('؛ ')}۔`
          : '',
        `احتیاطی خبردار: اس سپرے کے ${result.withholding_period_days || 14} دن بعد تک فصل منڈی میں نہ بیچیں۔`,
        result.organic_alternative ? `دیسی علاج: ${result.organic_alternative}` : ''
      ].filter(Boolean).join(' ')
    : '';

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Main Category Switcher Tab ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.5rem', direction: 'rtl' }}>
          <button
            onClick={() => setMainTab('crops')}
            style={{
              padding: '.75rem',
              borderRadius: '16px',
              border: mainTab === 'crops' ? '2px solid #2e5a27' : '1px solid rgba(0,0,0,0.1)',
              background: mainTab === 'crops' ? 'linear-gradient(135deg, #162410, #2e5a27)' : 'white',
              color: mainTab === 'crops' ? 'white' : '#1f2937',
              fontSize: '.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: mainTab === 'crops' ? '0 4px 12px rgba(46,90,39,0.25)' : 'none',
              fontFamily: '"Noto Nastaliq Urdu", serif'
            }}
            id="tab-crops-disease"
          >
            <span>🌿</span>
            <span>فصلوں کی بیماریاں</span>
          </button>

          <button
            onClick={() => setMainTab('livestock')}
            style={{
              padding: '.75rem',
              borderRadius: '16px',
              border: mainTab === 'livestock' ? '2px solid #2e5a27' : '1px solid rgba(0,0,0,0.1)',
              background: mainTab === 'livestock' ? 'linear-gradient(135deg, #162410, #2e5a27)' : 'white',
              color: mainTab === 'livestock' ? 'white' : '#1f2937',
              fontSize: '.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: mainTab === 'livestock' ? '0 4px 12px rgba(46,90,39,0.25)' : 'none',
              fontFamily: '"Noto Nastaliq Urdu", serif'
            }}
            id="tab-livestock-disease"
          >
            <span>🐄</span>
            <span>مویشیوں کا علاج</span>
          </button>
        </div>

        {/* ── Render Livestock Health Advisor if mainTab is livestock ── */}
        {mainTab === 'livestock' ? (
          <AnimalHealthAdvisor />
        ) : (
          <>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #162410 0%, #264D24 100%)',
              borderRadius: 'var(--radius-xl)', padding: '1.25rem',
              color: 'white', textAlign: 'center', border: '1px solid #3a7232'
            }}>
              <div style={{ fontSize: '2.5rem' }}>🔬</div>
              <h2 style={{ color: 'white', fontSize: '1.25rem', margin: '.3rem 0', fontWeight: 800 }}>فصل کی بیماری کا لیف اسکینر</h2>
              <p style={{ color: '#94a3b8', fontSize: '.8rem', margin: 0 }}>
                306 بیماریوں کا انڈیکس + پاکستانی زرعی ادویات کی مکمل ڈائریکٹری
              </p>
            </div>

        {/* Manual 306 Disease Search Filter Bar */}
        <div className="card" style={{ background: '#1E3A1E', border: '1px solid #3a7232', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#E9C46A' }}>
              🔍 306 بیماریوں کی فوری تلاش (بغیر تصویر)
            </span>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              style={{
                background: 'rgba(233,196,106,0.15)', border: '1px solid #E9C46A',
                color: '#E9C46A', borderRadius: 20, padding: '3px 10px',
                fontSize: '.75rem', fontWeight: 700, cursor: 'pointer'
              }}>
              {showCatalog ? 'چھپائیں ✕' : `ڈائریکٹری (${catalog.length})`}
            </button>
          </div>

          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowCatalog(true); }}
            placeholder="بیماری یا فصل کا نام تلاش کریں (مثلاً: wheat rust, آلو, late blight)..."
            style={{
              background: '#162410', color: 'white', border: '1px solid #3a7232',
              fontSize: '.85rem', direction: 'rtl'
            }}
          />

          {showCatalog && (
            <div style={{
              maxHeight: 220, overflowY: 'auto', marginTop: 8,
              borderTop: '1px solid #3a7232', paddingTop: 8
            }}>
              {catalogLoading ? (
                <div style={{ textAlign: 'center', color: '#a08050', padding: '1rem' }}>ڈائریکٹری لوڈ ہو رہی ہے...</div>
              ) : filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a08050', padding: '1rem' }}>کوئی بیماری نہیں ملی</div>
              ) : (
                filteredCatalog.slice(0, 30).map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFromCatalog(item)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#162410', marginBottom: 4, border: '1px solid #3a7232'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#10b981' }}>{item.name_ur}</div>
                      <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>{item.name_en}</div>
                    </div>
                    <span style={{
                      background: item.has_local_remedy ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                      color: item.has_local_remedy ? '#10b981' : '#94a3b8',
                      fontSize: '.68rem', padding: '2px 8px', borderRadius: 12, fontWeight: 700
                    }}>
                      {item.has_local_remedy ? 'پاکستان نسخہ ✅' : 'عام نسخہ'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Photo tips (shown before image is selected) */}
        {showTips && !imageUrl && (
          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#10b981', marginBottom: 8, direction: 'rtl' }}>
              📸 اسکین کرنے کا درست طریقہ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PHOTO_TIPS.map((t, i) => (
                <div key={i} style={{
                  background: '#162410', borderRadius: 8, padding: '6px 10px',
                  fontSize: '.72rem', direction: 'rtl', display: 'flex',
                  alignItems: 'center', gap: 6, color: '#cbd5e1', border: '1px solid #334155'
                }}>
                  <span style={{ fontSize: '1rem' }}>{t.icon}</span>
                  {t.tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image upload area */}
        <div
          className="card"
          style={{
            border: imageUrl ? '2px solid #a3e635' : '2px dashed #3a7232',
            borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center',
            overflow: 'hidden', position: 'relative', background: '#1E3A1E'
          }}
          onClick={() => !imageUrl && fileRef.current?.click()}
          id="disease-upload-area"
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="فصل کی تصویر"
                style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleRetake(); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', color: 'white',
                  border: '1px solid #334155', borderRadius: 20, padding: '4px 12px',
                  fontSize: '.75rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                🔄 دوبارہ لیں
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>📷</div>
              <p style={{ fontWeight: 700, color: '#10b981', margin: 0 }}>پتے کی تصویر اپلوڈ کریں یا کیمرے سے لیں</p>
              <p style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: '.3rem' }}>
                متاثرہ حصہ صاف اور روشن ہونا چاہیے
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="disease-file-input"
          />
        </div>

        {/* Crop selector */}
        <div>
          <label className="input-label" htmlFor="disease-crop-select" style={{ color: '#cbd5e1' }}>
            فصل کا نام منتخب کریں (اختیاری)
          </label>
          <select
            id="disease-crop-select"
            className="btn btn-primary btn-full"
            value={crop}
            onChange={e => setCrop(e.target.value)}
            style={{ background: 'linear-gradient(135deg, #2e5a27, #4a7c40)', color: 'white', border: 'none' }}
          >
            <option value="">فصل منتخب کریں</option>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Detect button */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleDetect}
          disabled={!image || loading}
          id="disease-detect-btn"
          style={{ fontSize: '1rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
        >
          {compressing ? '⏳ تصویر پروسیس ہو رہی ہے...'
            : loading ? '🔍 AI بیماری کی تشخیص کر رہا ہے...'
            : '🔍 تصویری تجزیہ کریں'}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            background: '#450a0a', color: '#fca5a5',
            padding: '.875rem', borderRadius: 10, fontWeight: 700,
            border: '1px solid #991b1b', direction: 'rtl'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading animation */}
        {loading && (
          <div className="loading-container" style={{ padding: '1.5rem', background: '#1E3A1E', borderRadius: 14 }}>
            <div className="spinner" />
            <p style={{ marginTop: '.75rem', color: '#10b981', fontWeight: 600 }}>
              {compressing
                ? '⏳ تصویر کمپریس ہو رہی ہے...'
                : '🔬 بیماری تشخیص ہو رہی ہے...'}
            </p>
            <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              <div style={{ fontSize: '.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>مقامی ڈیٹابیس</span>
                <span>AI وژن تجزیہ</span>
              </div>
              <div style={{ height: 4, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: '85%',
                  background: 'linear-gradient(90deg, #10b981, #f59e0b)',
                  borderRadius: 4, animation: 'pulse 1.5s infinite'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Result Container */}
        {result && (
          <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* TRILINGUAL DISEASE HEADER (Urdu + Roman Urdu + English) */}
            <div style={{ background: 'var(--green-900)', border: '2px solid var(--green-700)', borderRadius: 14, padding: '1.25rem', marginTop: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: 6 }}>
                <span style={{
                  background: 'rgba(251,192,45,0.2)', color: 'var(--gold)',
                  fontSize: '.75rem', padding: '4px 12px', borderRadius: 20, fontWeight: 800, border: '1px solid var(--gold)'
                }}>
                  🧠 {result.model_attribution || 'مقامی ڈیٹابیس ریکارڈ'}
                </span>
                <AIDisclaimer small />
              </div>

              {/* Data Source Trust Badge + Confidence Meter */}
              {result.source_label && (() => {
                const isLocal   = result.source === 'local_high_confidence' || result.source === 'local';
                const isAI      = result.source === 'ai_vision';
                const isOffline = result.source === 'offline_fallback' || result.source === 'local_fallback';
                const badgeBg   = isLocal ? 'rgba(16,185,129,0.15)' : isAI ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.10)';
                const badgeBorder = isLocal ? '#10b981' : isAI ? '#f59e0b' : '#ef4444';
                const badgeColor  = isLocal ? '#10b981' : isAI ? '#f59e0b' : '#fca5a5';
                const confPct     = result.confidence ?? parseFloat(result.match_score) ?? 0;
                const barColor    = confPct >= 85 ? '#10b981' : confPct >= 70 ? '#f59e0b' : '#ef4444';
                return (
                  <div style={{ marginBottom: '.65rem' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                      background: badgeBg, border: `1.5px solid ${badgeBorder}`,
                      borderRadius: 20, padding: '4px 12px', fontSize: '.73rem',
                      fontWeight: 800, color: badgeColor, marginBottom: '.45rem'
                    }}>
                      {result.source_label}
                    </div>
                    {result.confidence !== undefined && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: '#cbd5e1', marginBottom: 3 }}>
                          <span>تشخیص اعتماد</span>
                          <span style={{ color: barColor, fontWeight: 800 }}>
                            {confPct.toFixed(1)}% {confPct >= 85 ? ' ✅ High' : ' ⚠️ Low → AI Verified'}
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#162410', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(confPct, 100)}%`, background: barColor, borderRadius: 6 }} />
                        </div>
                      </div>
                    )}
                    {isOffline && (
                      <div style={{ marginTop: '.5rem', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 8, padding: '4px 10px', fontSize: '.72rem', color: '#fca5a5', direction: 'rtl' }}>
                        ⚠️ آف لائن موڈ: انٹرنیٹ جڑنے کے بعد دوبارہ اسکین کریں۔
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Trilingual Titles: Urdu + Roman Urdu + English */}
              {/* Line 1 — Primary Urdu (Deep Forest Green, high contrast) */}
              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--green-900)', direction: 'rtl', marginBottom: '.15rem', lineHeight: 1.4 }}>
                🔬 {result.disease_ur || result.disease}
              </div>
              {/* Line 2 — Roman Urdu subtitle */}
              <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', direction: 'ltr', fontWeight: 700, marginBottom: '.1rem', letterSpacing: '.01em' }}>
                🌾 {result.disease_roman || getRomanUrdu(result.disease_en, result.disease_ur)}
              </div>
              {/* Line 3 — English subtitle (italic) */}
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', direction: 'ltr', fontStyle: 'italic', fontWeight: 500 }}>
                {result.disease_en || result.disease || '—'}
              </div>
            </div>

            {/* SAFETY WARNING BADGE — Withholding Period (PHI days) */}
            <div style={{
              background: '#fff1f2', border: '2px solid #e11d48',
              borderRadius: 14, padding: '1rem', direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#be123c', fontWeight: 800, fontSize: '.95rem' }}>
                <span>⚠️</span>
                <span>فصلی احتیاطی وقفہ (Withholding Period / PHI)</span>
              </div>
              <div style={{ color: '#9f1239', fontSize: '.88rem', fontWeight: 700, marginTop: '.4rem', lineHeight: 1.6 }}>
                اس سپرے کے <strong>{result.withholding_period_days || 14} دن</strong> بعد تک فصل منڈی میں نہ بیچیں اور نہ ہی استعمال کریں۔
              </div>
            </div>

            {/* Treatment Summary & Cause */}
            <div style={{ background: 'var(--card)', border: '1.5px solid var(--green-300)', borderRadius: 14, padding: '1rem', direction: 'rtl', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--green-800)', marginBottom: '.4rem' }}>
                ⚡ بیماری کی وجہ اور علاج کا خلاصہ
              </div>
              <div style={{ fontSize: '.9rem', color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: '.6rem' }}>
                <strong>وجہ: </strong>{result.cause}
              </div>
              <div style={{ fontSize: '.9rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                <strong>علاج: </strong>{result.treatment}
              </div>
            </div>

            {/* COMMERCIAL CHEMICAL BRANDS — High Contrast Clean Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--green-900)', direction: 'rtl' }}>
                  💊 پاکستان میں دستیاب تجویز کردہ زرعی ادویات
                </div>
                {/* Dosage Multiplier Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-secondary)', fontWeight: 700, direction: 'rtl' }}>رقبہ:</span>
                  <select
                    value={landSize}
                    onChange={e => setLandSize(Number(e.target.value))}
                    style={{
                      background: 'white', color: 'var(--green-800)', border: '2px solid var(--green-600)',
                      borderRadius: 8, padding: '4px 10px', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer'
                    }}
                    id="disease-land-size-select"
                  >
                    {LAND_SIZES.map(s => (
                      <option key={s} value={s}>{s} ایکڑ</option>
                    ))}
                  </select>
                </div>
              </div>

              {result.medicines && result.medicines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {result.medicines.map((med, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff',
                      border: '2px solid var(--green-300)',
                      borderRadius: 14, padding: '1rem', direction: 'rtl',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {/* Brand + Price row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem', gap: '.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--green-900)' }}>
                          🧪 {med.brand}
                        </span>
                        {med.estimated_price_pkr && (
                          <span style={{
                            background: 'var(--green-800)', color: '#ffffff',
                            padding: '4px 10px', borderRadius: 12,
                            fontWeight: 800, fontSize: '.78rem',
                            boxShadow: '0 2px 6px rgba(46,90,39,0.2)',
                            whiteSpace: 'nowrap'
                          }}>
                            {med.estimated_price_pkr}
                          </span>
                        )}
                      </div>

                      {/* Active ingredient */}
                      <div style={{ fontSize: '.88rem', color: 'var(--text-primary)', marginBottom: '.3rem', fontWeight: 600 }}>
                        <strong style={{ color: 'var(--green-800)' }}>فارمولیشن / ایکٹو: </strong>{med.active}
                      </div>
                      {/* Dosage */}
                      <div style={{ fontSize: '.88rem', color: 'var(--text-primary)', marginBottom: '.3rem', fontWeight: 600 }}>
                        <strong style={{ color: 'var(--green-800)' }}>مقدار (1 ایکڑ): </strong>{med.dosage} ({med.method || 'سپرے'})
                      </div>
                      {/* Land-size dosage multiplier */}
                      {landSize > 1 && (
                        <div style={{
                          background: 'var(--gold-100)', border: '1.5px solid var(--gold-600)',
                          borderRadius: 8, padding: '6px 10px', marginBottom: '.4rem', direction: 'rtl',
                          fontSize: '.82rem', color: '#6b4a2b', fontWeight: 800
                        }}>
                          🧮 {landSize} ایکڑ کے لیے کل مقدار: {(() => {
                            const num = parseFloat(med.dosage);
                            const unit = med.dosage.replace(/[\d.]+/, '').trim();
                            return isNaN(num) ? `${med.dosage} × ${landSize}` : `${(num * landSize).toFixed(0)} ${unit}`;
                          })()}
                        </div>
                      )}

                      {/* Supplier / Company Badges */}
                      {med.suppliers && med.suppliers.length > 0 && (
                        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.45rem' }}>
                          <span style={{ fontSize: '.73rem', color: 'var(--text-muted)', fontWeight: 700 }}>سپلائر / کمپنی:</span>
                          {med.suppliers.map(sup => (
                            <span key={sup} style={{
                              background: 'var(--green-100)', color: 'var(--green-900)',
                              border: '1px solid var(--green-300)',
                              padding: '2px 9px', borderRadius: 8,
                              fontSize: '.72rem', fontWeight: 800
                            }}>
                              🏢 {sup}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--card)', padding: '1rem', borderRadius: 12, color: 'var(--text-muted)', fontSize: '.85rem', direction: 'rtl', border: '1px solid var(--green-200)' }}>
                  مقامی زرعی افسر کی ہدایت کے مطابق مناسب پھپھوندی کش دوائی استعمال کریں۔
                </div>
              )}
            </div>

            {/* ORGANIC / DESI REMEDIES — Wheat Gold Card */}
            {result.organic_alternative && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 14, padding: '1rem', direction: 'rtl'
              }}>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#f59e0b', marginBottom: '.4rem' }}>
                  🌿 کم خرچ دیسی علاج (Organic Remedy)
                </div>
                <div style={{ fontSize: '.88rem', color: '#fef3c7', lineHeight: 1.7 }}>
                  {result.organic_alternative}
                </div>
              </div>
            )}

            {/* Prevention */}
            {result.prevention && (
              <div style={{ background: '#1E3A1E', border: '1px solid #3a7232', borderRadius: 14, padding: '1rem', direction: 'rtl' }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#94a3b8', marginBottom: '.3rem' }}>
                  🛡️ آئندہ کے لیے احتیاطی تدابیر
                </div>
                <div style={{ fontSize: '.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  {result.prevention}
                </div>
              </div>
            )}

            {/* Government Helpline */}
            <a
              href="tel:0800-17000"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'rgba(6,182,212,0.08)', border: '1.5px solid #06b6d4',
                borderRadius: 14, padding: '.85rem 1rem', direction: 'rtl',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#06b6d4' }}>
                    📞 سرکاری زرعی ہیلپ لائن — دوسری رائے کے لیے
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#94a3b8', marginTop: 2 }}>
                    محکمہ زراعت پنجاب • مفت ٹول فری • 24/7
                  </div>
                </div>
                <span style={{
                  background: '#06b6d4', color: '#000', padding: '4px 12px',
                  borderRadius: 20, fontWeight: 900, fontSize: '.88rem', fontFamily: 'Inter, sans-serif'
                }}>
                  0800-17000
                </span>
              </div>
            </a>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-whatsapp"
                onClick={shareWhatsApp}
                style={{ flex: 1, padding: '.7rem' }}
              >
                📤 WhatsApp پر شیئر کریں
              </button>

              <AudioPlayer
                text={spokenText}
                langKey="ur"
                label="🔊 جواب سنیں"
                style={{ flex: 1, padding: '.7rem', justifyContent: 'center', borderRadius: 10 }}
              />

              <button
                className="btn btn-outline"
                onClick={handleRetake}
                style={{ flex: 1, padding: '.7rem' }}
              >
                📷 نئی اسکیننگ
              </button>
            </div>
          </div>
        )}

          </>
        )}

      </div>
    </div>
  );
}
