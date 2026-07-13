import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { askAI } from '../services/api';
import { usePermission, PERMISSION_MESSAGES } from '../hooks/usePermission';
import { useOffline } from '../hooks/useOffline';
import { getDir, getFont, getAlign } from '../utils/textDir';

const QUICK_CHIPS = [
  { label: '💧 پانی', question: 'گندم کو کتنا پانی چاہیے اور کب دیں؟' },
  { label: '🐛 سنڈی', question: 'فصل میں سنڈی لگ گئی ہے، کیا کروں؟' },
  { label: '🌱 DAP', question: 'DAP کھاد کتنی ڈالیں اور کیسے؟' },
  { label: '🌽 مکئی', question: 'مکئی کب بوئیں اور کیا احتیاط کریں؟' },
  { label: '🐄 جانور', question: 'بھینس کا دودھ کم ہو گیا ہے، وجہ کیا ہے؟' },
  { label: '💳 کسان کارڈ', question: 'کسان کارڈ کیسے ملتا ہے؟' },
  { label: '🏦 ZTBL', question: 'ZTBL سے قرضہ کیسے لیں؟' },
  { label: '⏰ سپرے وقت', question: 'سپرے کرنے کا بہترین وقت کیا ہے؟' },
];

// Wheat price sparkline data (7 days, simulated around current market)
const SPARKLINE_DATA = [3750, 3820, 3800, 3870, 3840, 3910, 3900];

function Sparkline({ data, width = 260, height = 56 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 8, padY = 6;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * w;
    const y = padY + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const polylineStr = points.join(' ');
  const firstPt = points[0].split(',');
  const lastPt = points[points.length - 1].split(',');
  const areaPath = `M ${firstPt[0]},${height} L ${polylineStr.split(' ').join(' L ')} L ${lastPt[0]},${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', direction: 'ltr' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e5a27" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2e5a27" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline points={polylineStr} fill="none" stroke="#2e5a27" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        const [x, y] = points[i].split(',');
        const isLast = i === data.length - 1;
        return (
          <circle key={i} cx={x} cy={y} r={isLast ? 5 : 3}
            fill={isLast ? '#fbc02d' : '#2e5a27'}
            stroke="white" strokeWidth={isLast ? 2 : 1.5}
          />
        );
      })}
    </svg>
  );
}

function getSeasonAdvice() {
  const m = new Date().getMonth() + 1;
  const h = new Date().getHours();
  const timeAdvice = h < 10 ? 'صبح سویرے سپرے کریں' : h > 17 ? 'شام کو پانی دیں' : 'دھوپ میں سپرے سے بچیں';
  if (m >= 5 && m <= 10) return { season: 'خریف', icon: '🌿', crops: 'چاول، مکئی، گنا، کپاس', advice: timeAdvice, color: '#16a34a' };
  return { season: 'ربیع', icon: '🌾', crops: 'گندم، سرسوں، آلو، چنا', advice: timeAdvice, color: '#92400e' };
}

function getIrrigationAdvice() {
  const m = new Date().getMonth() + 1;
  if (m >= 5 && m <= 9) return 'گرمی زیادہ ہے — صبح 6-8 بجے یا شام 5-7 بجے پانی دیں';
  if (m === 12 || m === 1 || m === 2) return 'سردی میں دن کے وقت پانی دیں — فصل کو پالے سے بچائیں';
  return 'موسم معتدل ہے — ہفتے میں 2 بار پانی کافی ہے';
}

function getPestAlert() {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 8) return { alert: true, msg: 'خبردار! سنڈی اور سست تیلا کا موسم — فوری سپرے کریں', color: 'var(--danger)' };
  if (m >= 3 && m <= 5) return { alert: true, msg: 'گندم میں زنگ اور بھبھوتیا کا خطرہ — نگرانی رکھیں', color: 'var(--warning)' };
  return { alert: false, msg: 'ابھی کوئی بڑا کیڑے کا خطرہ نہیں', color: 'var(--green-700)' };
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
  const navigate = useNavigate();

  const season = getSeasonAdvice();
  const irrigationAdvice = getIrrigationAdvice();
  const pestAlert = getPestAlert();

  const askQuestion = async (q) => {
    if (!q.trim()) return;
    if (isOffline) { setError('انٹرنیٹ نہیں — AI بند ہے'); return; }
    setLoading(true); setError(''); setAnswer('');
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
    utt.lang = 'ur-PK'; utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const shareWhatsApp = (text) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`🌾 DehatiAI جواب:\n\n${text}`)}`, '_blank');
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Voice Hero ── */}
        <div className="voice-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '.78rem', opacity: .75, marginBottom: '.5rem' }}>
              {season.icon} {season.season} موسم • {season.crops}
            </p>
            <h2 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '.25rem' }}>بول کر پوچھیں 🎤</h2>
            <p style={{ fontSize: '.78rem', opacity: .75, marginBottom: '1rem' }}>
              اردو، پنجابی، یا English میں
            </p>

            <button
              id="home-mic-btn"
              className={`voice-mic-btn${isRecording ? ' recording' : ''}`}
              onClick={startVoice}
              aria-label="آواز سے سوال کریں"
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
            <p style={{ fontSize: '.75rem', opacity: .7, marginTop: '.5rem' }}>
              {isRecording ? 'سن رہا ہوں...' : 'دبائیں اور بولیں'}
            </p>

            {/* Text input */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
              <input
                id="home-question-input"
                className="input"
                dir={getDir(question)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,.15)',
                  color: 'white',
                  borderColor: 'rgba(251,192,45,.4)',
                  fontSize: '.9rem',
                  fontFamily: getFont(question),
                  textAlign: getAlign(question),
                  transition: 'text-align .1s'
                }}
                placeholder="سوال لکھیں... / Type your question..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
              <button
                type="submit"
                className="btn"
                style={{ background: 'var(--gold)', color: '#1a2f0e', fontWeight: 800, minHeight: 48, padding: '0 1rem' }}
                disabled={loading || !question.trim()}
                id="home-send-btn"
              >
                {loading ? '⏳' : '▶'}
              </button>
            </form>
          </div>

          {/* Permission modals */}
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
          {micPerm.showDeniedModal && (
            <div className="permission-modal">
              <div className="permission-modal-content">
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔇</div>
                <h3 style={{ marginBottom: '.75rem' }}>{PERMISSION_MESSAGES.microphone.deniedTitle}</h3>
                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '.75rem' }}>
                  {PERMISSION_MESSAGES.microphone.deniedBody}
                </p>
                <button className="btn btn-primary btn-full" onClick={micPerm.dismissDeniedModal} id="mic-denied-close-btn">ٹھیک ہے</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Info Grid 2×2 ── */}
        <div className="dashboard-grid">
          <div className="dash-card" onClick={() => navigate('/weather')} id="dash-weather">
            <div className="dash-card-icon blue">🌤️</div>
            <div className="dash-card-label">موسم</div>
            <div className="dash-card-value" style={{ fontSize: '1.5rem' }}>28°C</div>
            <div className="dash-card-sub">صاف آسمان</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/more')} id="dash-market">
            <div className="dash-card-icon gold">📈</div>
            <div className="dash-card-label">منڈی قیمت</div>
            <div className="dash-card-value" style={{ color: 'var(--green-700)', fontSize: '.9rem' }}>گندم</div>
            <div className="dash-card-sub" style={{ fontSize: '.65rem', color: 'var(--amber-600)' }}>حوالہ قیمت — نمونہ</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/more')} id="dash-crops">
            <div className="dash-card-icon">🌾</div>
            <div className="dash-card-label">میری فصل</div>
            <div className="dash-card-value" style={{ fontSize: '1.5rem' }}>2</div>
            <div className="dash-card-sub">گندم • کپاس</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/disease')} id="dash-disease">
            <div className="dash-card-icon red">🔬</div>
            <div className="dash-card-label">بیماری چیک</div>
            <div className="dash-card-value" style={{ fontSize: '1rem', color: 'var(--danger)' }}>فوری چیک</div>
            <div className="dash-card-sub">تصویر لیں</div>
          </div>
        </div>

        {/* ── Quick Chips ── */}
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

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '.75rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="loading-container">
            <div className="spinner" />
            <p>AI سوچ رہا ہے...</p>
          </div>
        )}

        {/* ── AI Answer ── */}
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

        {/* ── Advice Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <div className="section-title">آج کا مشورہ</div>

          <div className="advice-card irrigation">
            <div className="advice-icon">💧</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0369a1' }}>آبپاشی کا وقت</div>
              <div style={{ fontSize: '.82rem', color: '#0c4a6e', marginTop: '.2rem', lineHeight: 1.6 }}>{irrigationAdvice}</div>
            </div>
          </div>

          <div className={`advice-card pest`} style={{ borderColor: pestAlert.alert ? '#fca5a5' : '#bbf7d0' }}>
            <div className="advice-icon">🐛</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: pestAlert.alert ? 'var(--danger)' : 'var(--green-700)' }}>
                {pestAlert.alert ? '⚠️ کیڑوں کا خطرہ' : '✅ کیڑے صاف'}
              </div>
              <div style={{ fontSize: '.82rem', marginTop: '.2rem', lineHeight: 1.6, color: '#7f1d1d' }}>{pestAlert.msg}</div>
            </div>
          </div>

          <div className="advice-card season">
            <div className="advice-icon">{season.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--gold-700)' }}>{season.season} کا موسم</div>
              <div style={{ fontSize: '.82rem', color: '#78350f', marginTop: '.2rem', lineHeight: 1.6 }}>
                {season.advice} • مناسب فصلیں: {season.crops}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sparkline Price Chart ── */}
        <div className="sparkline-wrap">
          <div className="sparkline-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>📊 گندم قیمت رجحان</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>پچھلے 7 دن (₨/من)</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-800)', direction: 'ltr' }}>
                ₨{SPARKLINE_DATA[SPARKLINE_DATA.length - 1].toLocaleString()}
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--green-600)', direction: 'ltr', fontFamily: 'Inter, sans-serif' }}>
                +₨{(SPARKLINE_DATA[SPARKLINE_DATA.length - 1] - SPARKLINE_DATA[0]).toLocaleString()} ↑
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Sparkline data={SPARKLINE_DATA} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.4rem', fontSize: '.68rem', color: 'var(--text-light)', fontFamily: 'Inter, sans-serif', direction: 'ltr' }}>
            <span>7 دن پہلے</span>
            <span style={{ color: 'var(--text-muted)' }}>کم: ₨{Math.min(...SPARKLINE_DATA).toLocaleString()} | زیادہ: ₨{Math.max(...SPARKLINE_DATA).toLocaleString()}</span>
            <span>آج</span>
          </div>
        </div>

      </div>
    </div>
  );
}
