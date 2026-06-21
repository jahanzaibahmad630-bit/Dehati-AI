import { useState, useRef } from 'react';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { askAI } from '../services/api';
import { usePermission, PERMISSION_MESSAGES } from '../hooks/usePermission';
import { useOffline } from '../hooks/useOffline';

const QUICK_CHIPS = [
  { label: '💧 پانی', question: 'گندم کو کتنا پانی چاہیے اور کب دیں؟' },
  { label: '🐛 سنڈی', question: 'فصل میں سنڈی لگ گئی ہے، کیا کروں؟' },
  { label: '🌱 DAP', question: 'DAP کھاد کتنی ڈالیں اور کیسے؟' },
  { label: '🌽 مکئی', question: 'مکئی کب بوئیں اور کیا احتیاط کریں؟' },
  { label: '🐄 جانور', question: 'بھینس کا دودھ کم ہو گیا ہے، وجہ کیا ہے؟' },
  { label: '💳 کسان کارڈ', question: 'کسان کارڈ کیسے ملتا ہے؟' },
  { label: '🏦 ZTBL', question: 'ZTBL سے قرضہ کیسے لیں؟' },
  { label: '⏰ سپرے وقت', question: 'سپرے کرنے کا بہترین وقت کیا ہے؟' }
];

function getSeasonInfo() {
  const m = new Date().getMonth() + 1;
  if (m >= 5 && m <= 10) return { name: 'خریف کا موسم', crops: 'جون–اکتوبر • چاول، مکئی، گنا', icon: '🌿', color: 'var(--green-600)' };
  return { name: 'ربیع کا موسم', crops: 'نومبر–اپریل • گندم، سرسوں، آلو', icon: '🌾', color: 'var(--amber-600)' };
}

function getWeatherAlert() {
  const m = new Date().getMonth() + 1;
  if (m >= 5 && m <= 7) return { msg: '⚠️ گرمی کی لہر — صبح سویرے سپرے کریں', type: 'danger' };
  if (m === 12 || m === 1) return { msg: '❄️ پالہ خطرہ — فصل کو ڈھانپیں، آبپاشی کریں', type: 'warning' };
  return null;
}

export default function HomePage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const { isOffline } = useOffline();
  const micPerm = usePermission('microphone');

  const season = getSeasonInfo();
  const weatherAlert = getWeatherAlert();

  const askQuestion = async (q) => {
    if (!q.trim()) return;
    if (isOffline) { setError('انٹرنیٹ نہیں — AI بند ہے'); return; }
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const data = await askAI(q);
      setAnswer(data.answer);
    } catch (err) {
      setError(err.message || 'جواب نہیں ملا — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); askQuestion(question); };
  const handleChip = (q) => { setQuestion(q); askQuestion(q); };

  const startVoice = () => {
    micPerm.requestWithPrePrompt(() => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setError('آپ کا براؤزر آواز نہیں سمجھتا'); return; }
      const recognition = new SR();
      recognition.lang = 'ur-PK';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setQuestion(text);
        askQuestion(text);
      };
      recognition.onerror = () => { setIsRecording(false); setError('آواز نہیں سمجھ آئی — دوبارہ کوشش کریں'); };
      recognition.start();
    });
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ur-PK';
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const shareWhatsApp = (text) => {
    const msg = encodeURIComponent(`🌾 DehatiAI جواب:\n\n${text}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="page">
      <div className="page-content">
        {/* Season Banner */}
        <div className="season-banner">
          <div style={{ fontSize: '1.8rem' }}>{season.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{season.name}</div>
            <div style={{ fontSize: '.8rem', opacity: .85 }}>{season.crops}</div>
          </div>
        </div>

        {/* Weather Alert */}
        {weatherAlert && (
          <div className={`alert-banner ${weatherAlert.type}`}>
            <div style={{ flex: 1, fontWeight: 700, fontSize: '.9rem' }}>{weatherAlert.msg}</div>
          </div>
        )}

        {/* Hero AI Card */}
        <div className="hero-card">
          <h2 style={{ textAlign: 'center', color: 'white', marginBottom: '.3rem', fontSize: '1.3rem', position: 'relative', zIndex: 1 }}>
            سوال کریں، جواب پائیں
          </h2>
          <p style={{ textAlign: 'center', opacity: .8, fontSize: '.82rem', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
            Urdu، Roman Urdu، یا English میں
          </p>

          {/* Mic Button */}
          <button
            id="home-mic-btn"
            className={`mic-button${isRecording ? ' recording' : ''}`}
            onClick={startVoice}
            aria-label="آواز سے سوال کریں"
          >
            {isRecording ? '🔴' : '🎤'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '.78rem', opacity: .75, marginTop: '.6rem', position: 'relative', zIndex: 1 }}>
            {isRecording ? 'سن رہا ہوں...' : 'دبائیں اور بولیں'}
          </p>

          {/* Pre-prompt Modal */}
          {micPerm.showPrePrompt && (
            <div className="permission-modal">
              <div className="permission-modal-content">
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🎤</div>
                <h3 style={{ marginBottom: '.75rem' }}>{PERMISSION_MESSAGES.microphone.title}</h3>
                <p style={{ fontSize: '.9rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                  {PERMISSION_MESSAGES.microphone.body}
                </p>
                <div style={{ display: 'flex', gap: '.75rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={micPerm.dismissPrePrompt}>بعد میں</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={micPerm.proceedAfterPrePrompt} id="mic-allow-btn">اجازت دیں ✓</button>
                </div>
              </div>
            </div>
          )}

          {/* Denied Modal */}
          {micPerm.showDeniedModal && (
            <div className="permission-modal">
              <div className="permission-modal-content">
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔇</div>
                <h3 style={{ marginBottom: '.75rem' }}>{PERMISSION_MESSAGES.microphone.deniedTitle}</h3>
                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '.75rem' }}>
                  {PERMISSION_MESSAGES.microphone.deniedBody}
                </p>
                <ol style={{ textAlign: 'right', paddingRight: '1rem', fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  {PERMISSION_MESSAGES.microphone.deniedStepsChromeAndroid.map((s, i) => (
                    <li key={i} style={{ marginBottom: '.3rem' }}>{s}</li>
                  ))}
                </ol>
                <button className="btn btn-primary btn-full" onClick={micPerm.dismissDeniedModal} id="mic-denied-close-btn">ٹھیک ہے</button>
              </div>
            </div>
          )}

          {/* Text Input */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
            <input
              id="home-question-input"
              className="input"
              style={{ flex: 1, background: 'rgba(255,255,255,.15)', color: 'white', borderColor: 'rgba(255,255,255,.3)' }}
              placeholder="مثلاً: گندم میں کون سی کھاد ڈالیں؟"
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <button type="submit" className="btn btn-amber" disabled={loading || !question.trim()} id="home-send-btn" aria-label="بھیجیں">
              {loading ? '...' : '▶'}
            </button>
          </form>
        </div>

        {/* Quick Chips */}
        <div>
          <div className="section-title">عام سوال</div>
          <div className="chips-scroll">
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => handleChip(chip.question)}
                id={`quick-chip-${i}`}
                disabled={loading}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '.75rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-container">
            <div className="spinner" />
            <p>AI سوچ رہا ہے...</p>
          </div>
        )}

        {/* AI Response */}
        {answer && (
          <div className="ai-response-card animate-fade-in-up">
            <div className="ai-response-header">
              <span style={{ fontWeight: 700, fontSize: '.9rem' }}>🌾 DehatiAI کا جواب</span>
              <AIDisclaimer small />
            </div>
            <div className="ai-response-body">{answer}</div>
            <div className="ai-response-actions">
              <button className="btn btn-sm btn-whatsapp" onClick={() => shareWhatsApp(answer)} id="home-share-btn">📤 WhatsApp</button>
              <button className="btn btn-sm btn-outline" onClick={() => speak(answer)} id="home-speak-btn">🔊 سنیں</button>
              <button className="btn btn-sm btn-ghost" onClick={() => copyText(answer)} id="home-copy-btn">📋 کاپی</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
