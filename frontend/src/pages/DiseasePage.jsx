import { useState, useRef, useEffect } from 'react';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { detectDisease, compressImage, fileToBase64 } from '../services/api';
import { useOffline } from '../hooks/useOffline';

const CROPS = [
  'گندم', 'چاول / دھان', 'کپاس', 'گنا', 'مکئی', 'آلو', 'ٹماٹر',
  'پیاز', 'مرچ', 'لہسن', 'سرسوں', 'چنا', 'مسور', 'مونگ', 'سبزی (عام)'
];

// Photo tips shown before capture
const PHOTO_TIPS = [
  { icon: '☀️', tip: 'دھوپ میں لیں — روشنی کافی ہو' },
  { icon: '🔍', tip: 'متاثرہ پتے / حصہ قریب سے دکھائیں' },
  { icon: '📐', tip: 'کیمرہ سیدھا رکھیں — دھندلا نہ ہو' },
  { icon: '🌿', tip: 'ایک پتہ فریم میں واضح ہو' },
];

// Severity color map
const SEVERITY_COLOR = {
  'ہلکی':    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'درمیانی': { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  'شدید':    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

function SeverityBadge({ severity }) {
  if (!severity) return null;
  const key = Object.keys(SEVERITY_COLOR).find(k => severity.includes(k)) || 'درمیانی';
  const s = SEVERITY_COLOR[key];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 12px', fontSize: '.75rem', fontWeight: 800,
      display: 'inline-block'
    }}>
      {severity}
    </span>
  );
}

function ConfidenceDots({ confidence }) {
  if (!confidence) return null;
  const levels = { 'کم': 1, 'درمیانہ': 2, 'زیادہ': 3 };
  const level = Object.entries(levels).find(([k]) => confidence.includes(k))?.[1] || 2;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: '.7rem', color: '#6b7280' }}>اعتماد:</span>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= level ? '#16a34a' : '#d1d5db'
        }} />
      ))}
      <span style={{ fontSize: '.7rem', color: '#4b5563' }}>
        {confidence}
      </span>
    </div>
  );
}

export default function DiseasePage() {
  const [image, setImage]         = useState(null);
  const [imageUrl, setImageUrl]   = useState('');
  const [crop, setCrop]           = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError]         = useState('');
  const [showTips, setShowTips]   = useState(true);
  const fileRef = useRef(null);
  const { isOffline } = useOffline();

  // Memory leak fix: revoke ObjectURL on unmount (M1 fix)
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError('');
    setShowTips(false);
    // Show preview immediately using object URL (no memory spike)
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImage(file);
  };

  const handleDetect = async () => {
    if (!image) { setError('پہلے تصویر لیں'); return; }
    if (isOffline) { setError('انٹرنیٹ نہیں — AI بند ہے'); return; }

    setLoading(true);
    setCompressing(true);
    setError('');
    setResult(null);

    try {
      // Canvas resize first (no memory spike), then base64
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
    const text = `🌾 DehatiAI فصل تجزیہ نتیجہ:\n\n🔬 بیماری: ${result.disease}\n📊 شدت: ${result.severity || '—'}\n⚡ وجہ: ${result.cause}\n👁️ علامات: ${result.symptoms || '—'}\n💊 علاج: ${result.treatment}\n🛡️ بچاؤ: ${result.prevention}\n⚠️ فوری اقدام: ${result.urgentAction || '—'}\n\n🤖 DehatiAI - dehati-ai.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    // Toggle: tap again while speaking = cancel (prevents overlapping audio)
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ur-PK'; utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const allText = result
    ? `بیماری: ${result.disease}۔ وجہ: ${result.cause}۔ علامات: ${result.symptoms || ''}۔ علاج: ${result.treatment}۔ بچاؤ: ${result.prevention}۔ فوری اقدام: ${result.urgentAction || ''}`
    : '';

  const isUrgent = Boolean(result?.urgentAction?.trim()) ||
                   result?.severity?.includes('شدید');

  return (
    <div className="page">
      <div className="page-content">

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3a0f 0%, var(--green-700) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem',
          color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>🔬</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>فصل کی بیماری پہچانیں</h2>
          <p style={{ opacity: .8, fontSize: '.8rem', margin: 0 }}>
            تصویر لیں — AI ماہر ڈاکٹر جیسا تجزیہ کرے گا
          </p>
        </div>

        {/* Photo tips (shown before image is selected) */}
        {showTips && (
          <div style={{
            background: '#f0fdf4', borderRadius: 12,
            border: '1px solid #bbf7d0', padding: '12px 14px'
          }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#15803d', marginBottom: 8, direction: 'rtl' }}>
              📸 اچھی تصویر کے لیے
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PHOTO_TIPS.map((t, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: 8, padding: '6px 10px',
                  fontSize: '.72rem', direction: 'rtl', display: 'flex',
                  alignItems: 'center', gap: 6, color: '#374151'
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
            border: imageUrl ? '2px solid var(--green-300)' : '2px dashed var(--green-300, #b8d4a0)',
            textAlign: 'center', padding: imageUrl ? '0' : '1.5rem',
            overflow: 'hidden', position: 'relative'
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
              {/* Retake overlay */}
              <button
                onClick={(e) => { e.stopPropagation(); handleRetake(); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', color: 'white',
                  border: 'none', borderRadius: 20, padding: '4px 12px',
                  fontSize: '.75rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                🔄 دوبارہ لیں
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>📷</div>
              <p style={{ fontWeight: 700, color: 'var(--green-700)', margin: 0 }}>تصویر لیں یا منتخب کریں</p>
              <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>
                متاثرہ پتہ یا حصہ قریب سے دکھائیں
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
          <label className="input-label" htmlFor="disease-crop-select">
            فصل کا نام — بتائیں تو تجزیہ بہتر ہوگا
          </label>
          <select
            id="disease-crop-select"
            className="input"
            value={crop}
            onChange={e => setCrop(e.target.value)}
          >
            <option value="">فصل منتخب کریں (اختیاری)</option>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Detect button */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleDetect}
          disabled={!image || loading}
          id="disease-detect-btn"
          style={{ fontSize: '1rem' }}
        >
          {compressing ? '⏳ تصویر چھوٹی کی جا رہی ہے...'
            : loading ? '🔍 AI تجزیہ کر رہا ہے...'
            : '🔍 بیماری پہچانیں'}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626',
            padding: '.875rem', borderRadius: 10, fontWeight: 700,
            border: '1px solid #fecaca', direction: 'rtl'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading animation */}
        {loading && (
          <div className="loading-container" style={{ padding: '1.5rem' }}>
            <div className="spinner" />
            <p style={{ marginTop: '.75rem', color: 'var(--green-700)', fontWeight: 600 }}>
              {compressing ? 'تصویر تیار ہو رہی ہے...' : 'AI ماہر تجزیہ کر رہا ہے...'}
            </p>
            <p style={{ fontSize: '.72rem', color: '#6b7280', marginTop: '.25rem' }}>
              30 ثانیے لگ سکتے ہیں
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-fade-in-up">

            {/* Urgent alert banner */}
            {isUrgent && (
              <div style={{
                background: '#fef2f2', border: '2px solid #dc2626',
                borderRadius: 12, padding: '12px 14px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl'
              }}>
                <span style={{ fontSize: '1.5rem' }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '.9rem' }}>
                    فوری توجہ ضروری!
                  </div>
                  <div style={{ fontSize: '.78rem', color: '#7f1d1d', marginTop: 2 }}>
                    {result.urgentAction}
                  </div>
                </div>
              </div>
            )}

            {/* Result header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: 8
            }}>
              <h3 style={{ margin: 0 }}>🌾 تجزیہ نتیجہ</h3>
              <AIDisclaimer small />
            </div>

            {/* Disease name + badges */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, white)',
              border: '2px solid #bbf7d0', borderRadius: 14,
              padding: '14px 16px', marginBottom: 10
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', direction: 'rtl', marginBottom: 8 }}>
                🔬 {result.disease || 'بیماری نہیں پہچانی گئی'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <SeverityBadge severity={result.severity} />
                {result.confidence && (
                  <span style={{
                    background: '#f3f4f6', color: '#374151',
                    border: '1px solid #e5e7eb', borderRadius: 20,
                    padding: '3px 10px', fontSize: '.72rem', fontWeight: 600
                  }}>
                    اعتماد: {result.confidence}
                  </span>
                )}
              </div>
            </div>

            {/* Detailed fields */}
            {[
              { label: '👁️ نظر آنے والی علامات', value: result.symptoms,     bg: '#fafafa' },
              { label: '⚡ بیماری کی وجہ',       value: result.cause,         bg: '#fffbeb' },
              { label: '💊 علاج',                 value: result.treatment,     bg: '#f0fdf4' },
              { label: '🛡️ بچاؤ',                value: result.prevention,    bg: '#eff6ff' },
            ].map(({ label, value, bg }) => value ? (
              <div key={label} style={{
                background: bg, borderRadius: 12,
                padding: '12px 14px', marginBottom: 8,
                border: '1px solid #f0f0f0'
              }}>
                <div style={{
                  fontWeight: 700, fontSize: '.82rem',
                  color: '#374151', marginBottom: 6, direction: 'rtl'
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: '.88rem', lineHeight: 1.8,
                  direction: 'rtl', color: '#1f2937'
                }}>
                  {value}
                </div>
              </div>
            ) : null)}

            {/* Helpline */}
            <div style={{
              background: '#f3f4f6', borderRadius: 10,
              padding: '10px 14px', fontSize: '.75rem',
              color: '#6b7280', direction: 'rtl', textAlign: 'center'
            }}>
              مزید مدد کے لیے: <strong style={{ color: '#2F4A1E' }}>0800-15000</strong> (زراعت ہیلپ لائن — مفت)
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-whatsapp"
                onClick={shareWhatsApp}
                id="disease-share-btn"
                style={{ flex: 1 }}
              >
                📤 WhatsApp
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => speak(allText)}
                id="disease-speak-btn"
                style={{ flex: 1 }}
              >
                🔊 سنیں
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={handleRetake}
                id="disease-retake-btn"
                style={{ flex: 1 }}
              >
                📷 نئی تصویر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
