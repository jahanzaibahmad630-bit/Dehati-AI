import { useState, useRef } from 'react';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { detectDisease, compressImage, fileToBase64 } from '../services/api';
import { useOffline } from '../hooks/useOffline';

const CROPS = ['گندم', 'چاول', 'کپاس', 'گنا', 'مکئی', 'آلو', 'ٹماٹر', 'پیاز', 'مرچ', 'لہسن'];

export default function DiseasePage() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [crop, setCrop] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const { isOffline } = useOffline();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError('');
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImage(file);
  };

  const handleDetect = async () => {
    if (!image) { setError('پہلے تصویر لیں'); return; }
    if (isOffline) { setError('انٹرنیٹ نہیں — AI بند ہے'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const compressed = await compressImage(image, 0.8);
      const base64 = await fileToBase64(compressed);
      const data = await detectDisease(base64, crop || null, compressed.type || 'image/jpeg');
      setResult(data);
    } catch (err) {
      setError(err.message || 'تجزیہ ناکام — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = () => {
    if (!result) return;
    const text = `🌾 DehatiAI فصل تجزیہ:\n\n🔬 بیماری: ${result.disease}\n⚡ وجہ: ${result.cause}\n💊 علاج: ${result.treatment}\n🛡️ بچاؤ: ${result.prevention}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ur-PK'; utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const allText = result ? `بیماری: ${result.disease}، وجہ: ${result.cause}، علاج: ${result.treatment}، بچاؤ: ${result.prevention}` : '';

  return (
    <div className="page">
      <div className="page-content">
        <div style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-600) 100%)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🔬</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>فصل کی بیماری پہچانیں</h2>
          <p style={{ opacity: .8, fontSize: '.82rem' }}>فصل کی تصویر لیں — AI بیماری بتائے گا</p>
        </div>

        {/* Upload Area */}
        <div
          className="card"
          style={{ cursor: 'pointer', border: '2px dashed var(--green-300, #b8d4a0)', textAlign: 'center', padding: '1.5rem' }}
          onClick={() => fileRef.current?.click()}
          id="disease-upload-area"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="فصل کی تصویر" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📷</div>
              <p style={{ fontWeight: 700, color: 'var(--green-700)' }}>تصویر لیں یا منتخب کریں</p>
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>فصل کا متاثرہ حصہ واضح دکھائیں</p>
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
          <label className="input-label" htmlFor="disease-crop-select">فصل کا نام (اختیاری)</label>
          <select id="disease-crop-select" className="input" value={crop} onChange={e => setCrop(e.target.value)}>
            <option value="">فصل منتخب کریں</option>
            {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleDetect}
          disabled={!image || loading}
          id="disease-detect-btn"
        >
          {loading ? '🔍 تجزیہ ہو رہا ہے...' : '🔍 بیماری پہچانیں'}
        </button>

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="spinner" />
            <p>تصویر کا تجزیہ ہو رہا ہے...</p>
          </div>
        )}

        {result && (
          <div className="animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <h3>🌾 تجزیہ نتیجہ</h3>
              <AIDisclaimer small />
            </div>

            {[
              { label: '🔬 بیماری', value: result.disease, className: 'disease-name' },
              { label: '⚡ وجہ', value: result.cause, className: 'cause' },
              { label: '💊 علاج', value: result.treatment, className: 'treatment' },
              { label: '🛡️ بچاؤ', value: result.prevention, className: 'prevention' }
            ].map(({ label, value, className }) => value ? (
              <div key={className} className={`disease-section ${className}`}>
                <div style={{ fontWeight: 700, marginBottom: '.3rem', fontSize: '.85rem' }}>{label}</div>
                <div style={{ fontSize: '.9rem', lineHeight: 1.7 }}>{value}</div>
              </div>
            ) : null)}

            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-whatsapp" onClick={shareWhatsApp} id="disease-share-btn">📤 WhatsApp</button>
              <button className="btn btn-sm btn-outline" onClick={() => speak(allText)} id="disease-speak-btn">🔊 سنیں</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
