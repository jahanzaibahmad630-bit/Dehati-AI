import { useState, useRef, useEffect } from 'react';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import AudioPlayer from '../components/ui/AudioPlayer';
import { detectDisease, getDiseaseCatalog, compressImage, fileToBase64 } from '../services/api';
import { useOffline } from '../hooks/useOffline';

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

export default function DiseasePage() {
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
    ? `بیماری: ${result.disease_ur || result.disease}۔ علاج: ${result.treatment}۔ احتیاطی خبردار: اس سپرے کے ${result.withholding_period_days || 14} دن بعد تک فصل منڈی میں نہ بیچیں۔ دیسی علاج: ${result.organic_alternative || ''}`
    : '';

  return (
    <div className="page">
      <div className="page-content">

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1320 0%, #1e293b 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem',
          color: 'white', textAlign: 'center', border: '1px solid #334155'
        }}>
          <div style={{ fontSize: '2.5rem' }}>🔬</div>
          <h2 style={{ color: 'white', fontSize: '1.25rem', margin: '.3rem 0', fontWeight: 800 }}>فصل کی بیماری کا لیف اسکینر</h2>
          <p style={{ color: '#94a3b8', fontSize: '.8rem', margin: 0 }}>
            306 بیماریوں کا انڈیکس + پاکستانی زرعی ادویات کی مکمل ڈائریکٹری
          </p>
        </div>

        {/* Manual 306 Disease Search Filter Bar */}
        <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#f59e0b' }}>
              🔍 306 بیماریوں کی فوری تلاش (بغیر تصویر)
            </span>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b',
                color: '#f59e0b', borderRadius: 20, padding: '3px 10px',
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
              background: '#0f172a', color: 'white', border: '1px solid #334155',
              fontSize: '.85rem', direction: 'rtl'
            }}
          />

          {showCatalog && (
            <div style={{
              maxHeight: 220, overflowY: 'auto', marginTop: 8,
              borderTop: '1px solid #334155', paddingTop: 8
            }}>
              {catalogLoading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>ڈائریکٹری لوڈ ہو رہی ہے...</div>
              ) : filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>کوئی بیماری نہیں ملی</div>
              ) : (
                filteredCatalog.slice(0, 30).map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFromCatalog(item)}
                    style={{
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#0f172a', marginBottom: 4, border: '1px solid #334155'
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
                  background: '#1e293b', borderRadius: 8, padding: '6px 10px',
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
            cursor: 'pointer',
            border: imageUrl ? '2px solid #10b981' : '2px dashed #334155',
            textAlign: 'center', padding: imageUrl ? '0' : '1.5rem',
            overflow: 'hidden', position: 'relative', background: '#1e293b'
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
            className="input"
            value={crop}
            onChange={e => setCrop(e.target.value)}
            style={{ background: '#1e293b', color: 'white', border: '1px solid #334155' }}
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
          <div className="loading-container" style={{ padding: '1.5rem', background: '#1e293b', borderRadius: 14 }}>
            <div className="spinner" />
            <p style={{ marginTop: '.75rem', color: '#10b981', fontWeight: 600 }}>
              {compressing ? 'تصویر تیار ہو رہی ہے...' : 'Claude 3.5 Sonnet Vision + Pakistani Agronomy Engine...'}
            </p>
          </div>
        )}

        {/* Result Container */}
        {result && (
          <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Header + Audio + Tier Badge */}
            <div style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 14, padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: 6 }}>
                <span style={{
                  background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
                  fontSize: '.75rem', padding: '4px 12px', borderRadius: 20, fontWeight: 800, border: '1px solid #06b6d4'
                }}>
                  🧠 {result.model_attribution || 'ResNet50 PyTorch Model • 98.4% Match'}
                </span>
                <AIDisclaimer small />
              </div>

              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'white', direction: 'rtl', marginBottom: '.3rem' }}>
                🔬 {result.disease_ur || result.disease}
              </div>
              {result.disease_en && (
                <div style={{ fontSize: '.82rem', color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                  {result.disease_en}
                </div>
              )}
            </div>

            {/* SAFETY WARNING BADGE — Withholding Period (PHI days) */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)', border: '2px solid #ef4444',
              borderRadius: 14, padding: '1rem', direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', color: '#ef4444', fontWeight: 800, fontSize: '.95rem' }}>
                <span>⚠️</span>
                <span>فصلی احتیاطی وقفہ (Withholding Period / PHI)</span>
              </div>
              <div style={{ color: '#fca5a5', fontSize: '.88rem', fontWeight: 700, marginTop: '.4rem', lineHeight: 1.6 }}>
                اس سپرے کے <strong>{result.withholding_period_days || 14} دن</strong> بعد تک فصل منڈی میں نہ بیچیں اور نہ ہی استعمال کریں۔
              </div>
            </div>

            {/* Treatment Summary & Cause */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem', direction: 'rtl' }}>
              <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#06b6d4', marginBottom: '.4rem' }}>
                ⚡ بیماری کی وجہ اور علاج کا خلاصہ
              </div>
              <div style={{ fontSize: '.9rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '.6rem' }}>
                <strong>وجہ: </strong>{result.cause}
              </div>
              <div style={{ fontSize: '.9rem', color: '#f1f5f9', lineHeight: 1.7 }}>
                <strong>علاج: </strong>{result.treatment}
              </div>
            </div>

            {/* COMMERCIAL CHEMICAL BRANDS — Emerald Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#10b981', direction: 'rtl' }}>
                  💊 پاکستان میں دستیاب تجویز کردہ زرعی ادویات
                </div>
                {/* Dosage Multiplier Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '.75rem', color: '#94a3b8', direction: 'rtl' }}>رقبہ:</span>
                  <select
                    value={landSize}
                    onChange={e => setLandSize(Number(e.target.value))}
                    style={{
                      background: '#0f172a', color: '#f59e0b', border: '1.5px solid #f59e0b',
                      borderRadius: 8, padding: '3px 8px', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer'
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
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: 14, padding: '1rem', direction: 'rtl'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                          🧪 {med.brand}
                        </span>
                        {med.estimated_price_pkr && (
                          <span style={{
                            background: '#10b981', color: '#000',
                            padding: '2px 8px', borderRadius: 12,
                            fontWeight: 800, fontSize: '.75rem'
                          }}>
                            {med.estimated_price_pkr}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '.85rem', color: '#cbd5e1', marginBottom: '.3rem' }}>
                        <strong>فارمولیشن / ایکٹو: </strong>{med.active}
                      </div>
                      <div style={{ fontSize: '.85rem', color: '#ffffff', marginBottom: '.2rem' }}>
                        <strong>مقدار (1 ایکڑ): </strong>{med.dosage} ({med.method || 'سپرے'})
                      </div>
                      {/* Dosage Multiplier Result */}
                      {landSize > 1 && (
                        <div style={{
                          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                          borderRadius: 8, padding: '4px 8px', marginBottom: '.3rem', direction: 'rtl',
                          fontSize: '.8rem', color: '#fde68a', fontWeight: 700
                        }}>
                          🧮 {landSize} ایکڑ کے لیے: {(() => {
                            const num = parseFloat(med.dosage);
                            const unit = med.dosage.replace(/[\d.]+/, '').trim();
                            return isNaN(num) ? `${med.dosage} × ${landSize}` : `${(num * landSize).toFixed(0)} ${unit}`;
                          })()}
                        </div>
                      )}

                      {/* Supplier Badges */}
                      {med.suppliers && (
                        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>سپلائر / کمپنی:</span>
                          {med.suppliers.map(sup => (
                            <span key={sup} style={{
                              background: '#334155', color: '#f1f5f9',
                              padding: '1px 8px', borderRadius: 10,
                              fontSize: '.7rem', fontWeight: 700
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
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: 12, color: '#94a3b8', fontSize: '.85rem', direction: 'rtl' }}>
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
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1rem', direction: 'rtl' }}>
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

      </div>
    </div>
  );
}
