import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { getDir, getFont, getAlign } from '../utils/textDir';
import { createSpeechEngine, correctUrduAgriPhonetics, playAudioCue } from '../utils/speech';
import { searchOffline, saveAIAnswer, queueQuestion, getOfflineQueue, removeFromQueue } from '../services/offlineDB';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AudioPlayer from '../components/ui/AudioPlayer';

const CHAT_HISTORY_KEY = 'dehati_chat_history';
const MAX_SESSIONS = 30;  // Keep up to 30 past sessions in localStorage

import { API_URL } from '../config';

function getToken() {
  return localStorage.getItem('dehati_token');
}

const QUICK_REPLIES = {
  ur: [
    'کھاد کی سفارش دیں',
    'فصل کو پانی کب دیں',
    'سرکاری قرضہ کیسے لیں',
    'گندم میں بیماری کی علامات',
    'منڈی کی آج کی قیمتیں',
    'DAP اور یوریا کا فرق',
    'سپرے کا بہترین وقت',
    'بھینس کا دودھ کم ہے'
  ],
  pj: [
    'کھاد دی سفارش دیو',
    'فصل نوں پانی کدووں دیو',
    'سرکاری قرضہ کیویں لئیے',
    'کݨک وچ بیماری دیاں نشانیاں',
    'منڈی دیاں اج دیاں قیمتاں',
    'DAP تے یوریا دا فرق',
    'سپرے دا بہترین ویلا',
    'مجھ دا دُدھ گھٹ اے'
  ],
  en: [
    'Fertilizer recommendation',
    'When to irrigate wheat?',
    'How to apply for farm loan?',
    'Wheat disease symptoms',
    'Today mandi rates',
    'DAP vs Urea difference',
    'Best time to spray',
    'Increase buffalo milk yield'
  ]
};

const PLACEHOLDERS = {
  ur: 'فصل، کھاد، بیماری، منڈی ریٹ پوچھیں...',
  pj: 'فصل، کھاد، بیماری، منڈی ریٹ پچھو...',
  en: 'Ask about crops, fertilizer, disease, mandi rates...'
};

const WELCOME_MESSAGES = {
  ur: 'سلام! 👋 نئی گفتگو شروع کریں — فصل، کھاد، بیماری، موسم کچھ بھی پوچھیں 🌾',
  pj: 'جی آیاں نوں! 👋 نویں گل بات شروع کرو — فصل، کھاد، بیماری، موسم کجھ وی پچھو 🌾',
  en: 'Hello! 👋 Start a new conversation — ask about crops, fertilizers, weather, or market rates 🌾'
};

const LANGS = [
  { key: 'ur', label: 'اردو', srLang: 'ur-PK' },
  { key: 'pj', label: 'پنجابی', srLang: 'pa-PK' },
  { key: 'en', label: 'English', srLang: 'en-US' }
];

// Detect iOS (Safari on iPhone/iPad doesn't support SpeechRecognition in PWA mode)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function formatTime(date, lang = 'ur') {
  if (!date) return '';
  const d = new Date(date);
  const locale = lang === 'en' ? 'en-US' : 'ur-PK';
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return <bdi style={{ unicodeBidi: 'isolate' }}>{timeStr}</bdi>;
}

// ── Waveform animation bars ────────────────────────────────────────────────────
function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
      {[1,2,3,4,5,6,7,8,9].map(i => (
        <div key={i} style={{
          width: 3.5, borderRadius: 4,
          background: 'white',
          animation: `waveBar${((i-1)%7)+1} 0.7s ease-in-out infinite`,
          animationDelay: `${(i-1)*0.08}s`
        }} />
      ))}
    </div>
  );
}

// ── WhatsApp-style full-screen mic overlay ─────────────────────────────────────
function MicOverlay({ isListening, interimText, finalText, onStop, onSend, onCancel, onRetry, iosError }) {
  const currentText = (finalText || interimText || '').trim();
  const hasText     = currentText.length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(11, 19, 12, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'overlayFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      padding: '24px 16px'
    }}>

      {/* Top Status Badge */}
      <div style={{
        background: isListening
          ? 'rgba(220, 38, 38, 0.2)'
          : hasText
            ? 'rgba(16, 185, 129, 0.2)'
            : 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${isListening ? 'rgba(220, 38, 38, 0.4)' : hasText ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
        color: isListening ? '#fca5a5' : hasText ? '#6ee7b7' : 'rgba(255,255,255,0.7)',
        borderRadius: 20, padding: '6px 16px',
        fontSize: '.82rem', fontWeight: 600,
        marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 8,
        direction: 'rtl', fontFamily: '"Noto Nastaliq Urdu", serif'
      }}>
        {isListening ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'statusPulse 1s infinite' }} />
            آواز ریکارڈ ہو رہی ہے... بولیں
          </>
        ) : hasText ? (
          <>
            <span style={{ fontSize: '1rem' }}>✓</span>
            آواز محفوظ ہو گئی! نیچے سے 'بھیجیں' پر کلک کریں
          </>
        ) : (
          'آواز ریکارڈ کرنے کے لیے مائیک پر ٹیپ کریں'
        )}
      </div>

      {/* Transcript Display Box */}
      <div style={{
        width: '88%', maxWidth: 360,
        background: iosError
          ? 'rgba(220,38,38,0.15)'
          : hasText
            ? 'rgba(16, 185, 129, 0.08)'
            : 'rgba(255,255,255,0.06)',
        borderRadius: 20, padding: '20px 22px',
        minHeight: 90, maxHeight: 160, overflowY: 'auto',
        marginBottom: 32,
        border: iosError
          ? '1px solid rgba(220,38,38,0.4)'
          : hasText
            ? '1px solid rgba(16,185,129,0.3)'
            : '1px solid rgba(255,255,255,0.15)',
        boxShadow: hasText ? '0 8px 32px rgba(16,185,129,0.12)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
      }}>
        {iosError ? (
          <div style={{ color: '#fca5a5', fontSize: '.9rem', lineHeight: 1.7, direction: 'rtl', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
            📱 آئی فون پر آواز کی سہولت
            <br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem' }}>
              Android Chrome میں مکمل آواز سپورٹ فعال ہے۔
            </span>
          </div>
        ) : hasText ? (
          <div style={{
            color: '#ffffff', fontSize: '1.1rem', lineHeight: 1.9,
            fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl',
            wordBreak: 'break-word'
          }}>
            {currentText}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.9rem', direction: 'rtl', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
            {isListening ? 'DehatiAI آپ کا سوال سن رہا ہے...' : 'کچھ بولیں...'}
          </div>
        )}
      </div>

      {/* Mic Button & Pulse Rings */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 32 }}>
        {isListening && [1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(239, 68, 68, 0.45)',
            animation: `ripple 1.8s ease-out infinite`,
            animationDelay: `${(i - 1) * 0.5}s`
          }} />
        ))}
        <button
          onClick={isListening ? onStop : onRetry}
          title={isListening ? 'روکیں' : 'دوبارہ بولیں'}
          style={{
            width: 96, height: 96, borderRadius: '50%', border: 'none',
            background: iosError
              ? 'linear-gradient(135deg,#6b7280,#4b5563)'
              : isListening
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#10b981,#059669)',
            color: 'white', fontSize: '2.4rem',
            cursor: 'pointer', position: 'relative', zIndex: 2,
            boxShadow: isListening
              ? '0 0 0 8px rgba(239,68,68,.25), 0 8px 25px rgba(220,38,38,.4)'
              : '0 8px 25px rgba(16,185,129,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {iosError ? '❌' : isListening ? '⏹' : '🎤'}
        </button>
      </div>

      {/* Waveform indicator */}
      <div style={{ height: 36, marginBottom: 28, opacity: isListening ? 1 : 0, transition: 'opacity .3s' }}>
        <Waveform />
      </div>

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onCancel} style={{
          background: 'rgba(255,255,255,0.12)', color: '#f3f4f6',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all .2s'
        }}>❌ منسوخ</button>

        {!isListening && !iosError && (
          <button onClick={onRetry} style={{
            background: 'rgba(245,158,11,0.18)', color: '#fbbf24',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 24, padding: '10px 22px',
            fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .2s'
          }}>🔄 دوبارہ بولیں</button>
        )}

        {hasText && (
          <button onClick={onSend} style={{
            background: 'linear-gradient(135deg,#10b981,#059669)',
            color: 'white', border: 'none',
            borderRadius: 24, padding: '11px 32px',
            fontSize: '.95rem', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(16,185,129,.45)',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .2s'
          }}>بھیجیں ➤</button>
        )}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '.72rem', marginTop: 20, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '0 20px' }}>
        {iosError
          ? 'iPhone Safari — voice limited. Type or use Android Chrome.'
          : isListening
            ? 'سن رہے ہیں... خاموش ہونے کے 3.5 سیکنڈ بعد خود بخود رک جائے گا'
            : hasText
              ? 'بولنا مکمل — بھیجیں یا 🎤 دبا کر دوبارہ بولیں'
              : '🎤 دبائیں اور بولنا شروع کریں'}
      </div>
    </div>
  );
}

// ── Typing dots ────────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 0', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#6b7280',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser    = msg.role === 'user';
  const isOffline = msg.offline === true;

  // Detect direction from the actual message content
  const dir   = getDir(msg.content);
  const font  = getFont(msg.content);
  const align = getAlign(msg.content);

  const formatContent = (text) =>
    text.split('\n').map((line, i, arr) => (
      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
    ));

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 12,
      animation: 'msgFadeIn 0.25s ease-out',
    }}>
      {/* AI Avatar */}
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #2e5a27, #4a7c40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,.15)'
        }}>🌾</div>
      )}

      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Bubble */}
        <div
          dir={dir}
          lang={dir === 'rtl' ? 'ur' : 'en'}
          style={{
            padding: '10px 14px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #2e5a27, #3d7a33)'
              : isOffline
                ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
                : 'white',
            color: isUser ? 'white' : '#111827',
            fontSize: dir === 'rtl' ? '0.95rem' : '0.9rem',
            lineHeight: dir === 'rtl' ? 1.9 : 1.6,
            fontFamily: font,
            textAlign: align,
            boxShadow: isUser
              ? '0 2px 8px rgba(46,90,39,.3)'
              : isOffline
                ? '0 1px 6px rgba(251,192,45,.3)'
                : '0 1px 6px rgba(0,0,0,.08)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            border: isUser ? 'none' : isOffline ? '1px solid #fbbf24' : '1px solid #f0f0f0',
          }}
        >
          {msg.streaming && msg.content === '' ? (
            <TypingDots />
          ) : isUser ? (
            formatContent(msg.content)
          ) : (
            <MarkdownRenderer text={msg.content} dir={dir} lang={dir === 'rtl' ? 'ur' : 'en'} />
          )}
          {msg.streaming && msg.content !== '' && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: isUser ? 'rgba(255,255,255,.8)' : '#2e5a27',
              marginLeft: dir === 'rtl' ? 0 : 2,
              marginRight: dir === 'rtl' ? 2 : 0,
              verticalAlign: 'middle',
              animation: 'cursorBlink 0.7s step-end infinite'
            }} />
          )}
        </div>


        {/* Timestamp + Audio Player row */}
        {msg.time && !msg.streaming && (
          <div style={{
            fontSize: '0.67rem', color: '#9ca3af', marginTop: 4,
            padding: '0 4px',
            display: 'flex', alignItems: 'center', gap: 6,
            flexDirection: isUser ? 'row-reverse' : 'row'
          }}>
            {formatTime(msg.time, dir === 'rtl' ? 'ur' : 'en')}
            {isUser && <span style={{ color: '#4ade80' }}>✓✓</span>}
            {/* Compact audio player — only for AI messages with content */}
            {!isUser && msg.content && (
              <AudioPlayer
                text={msg.content}
                langKey={dir === 'rtl' ? 'ur' : 'en'}
                compact={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Chat ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();

  // ── Chat Session History (localStorage) ─────────────────────────────────────
  const [chatHistory, setChatHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const currentSessionId = useRef(Date.now().toString());

  const saveChatSession = useCallback((msgs) => {
    const convo = msgs.filter(m => m.role !== 'assistant' || msgs.indexOf(m) > 0); // skip welcome
    const userMsgs = convo.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return; // Don't save empty sessions

    // Auto-generate title from first user message (max 30 chars)
    const firstQ = userMsgs[0]?.content || '';
    const title = firstQ.length > 30 ? firstQ.slice(0, 28) + '…' : firstQ;

    const session = {
      id: currentSessionId.current,
      title: title || 'گفتگو',
      date: new Date().toISOString(),
      messages: convo.slice(-20), // store last 20 msgs per session
      messageCount: userMsgs.length
    };

    setChatHistory(prev => {
      const filtered = prev.filter(s => s.id !== session.id);
      const updated = [session, ...filtered].slice(0, MAX_SESSIONS);
      try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const loadSession = useCallback((session) => {
    setShowSidebar(false);
    currentSessionId.current = session.id;
    setMessages(session.messages.map(m => ({ ...m, time: m.time ? new Date(m.time) : new Date() })));
    setShowQuickReplies(false);
    setNetError('');
  }, []);

  const deleteSession = useCallback((id, e) => {
    e.stopPropagation();
    setChatHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      try { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const formatSessionDate = (isoStr) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffMs = now - d;
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) return 'ابھی';
      if (diffH < 24) return `${diffH} گھنٹے پہلے`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return `${diffD} دن پہلے`;
      return d.toLocaleDateString('ur-PK', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `سلام ${user?.name ? user.name.split(' ')[0] : ''}! 👋 میں DehatiAI ہوں — آپ کا زرعی ساتھی۔\nفصل، کھاد، بیماری، موسم — کچھ بھی پوچھیں! 🌾`,
      time: new Date()
    }
  ]);
  const [interimText, setInterimText]   = useState(''); // live speech transcript
  const [finalSpeech, setFinalSpeech]   = useState(''); // finalized speech words
  const [input, setInput]               = useState(''); // text input box value
  const [language, setLanguage]         = useState('ur');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [showMicOverlay, setShowMicOverlay] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [iosError, setIosError]         = useState(false); // iOS Safari can't do voice
  const [hasQueuedQuestions, setHasQueuedQuestions] = useState(
    () => getOfflineQueue().length > 0
  );
  const [netError, setNetError]   = useState('');   // network/server error message


  const bottomRef       = useRef(null);
  const inputRef        = useRef(null);
  const abortRef        = useRef(null);
  const speechEngineRef  = useRef(null);  // Speech engine instance
  const isProcessingRef  = useRef(false);  // 300ms debounce lock — prevents duplicate submissions
  const { isOffline }    = useOffline();
  const [searchParams]   = useSearchParams();

  // Bug fix: keep a ref to always have latest messages so sendMessage
  // doesn't need 'messages' in its dep array (prevents stale closures)
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Bug fix: ref to always call latest sendMessage from voice/auto-send handlers
  const sendMessageRef = useRef(null);

  const isBusy = isStreaming;

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // Auto-send question from ?q= URL param (e.g. from homepage chips)
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const q = searchParams.get('q');
    if (q && q.trim()) {
      autoSentRef.current = true;
      // Bug fix: use sendMessageRef so we always call the latest sendMessage
      const t = setTimeout(() => sendMessageRef.current?.(q.trim()), 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);



  // Cleanup on unmount — abort (not stop) to avoid Android buffer-flush hang
  useEffect(() => {
    return () => {
      try { speechEngineRef.current?.reset(); } catch {}
      try { abortRef.current?.abort(); } catch {}
    };
  }, []);

  // ── Voice input (Rural Mode: 3.5s silence + live transcription + zero duplication) ──
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('آپ کا براؤزر آواز سپورٹ نہیں کرتا۔ Android Chrome استعمال کریں۔');
      return;
    }

    // Show overlay and mic state IMMEDIATELY on tap (0ms visual feedback)
    setIsListening(true);
    setShowMicOverlay(true);
    setIosError(false);
    setFinalSpeech('');
    setInterimText('');
    setInput('');
    isProcessingRef.current = false;

    // Play pleasant upward start chime
    playAudioCue('start');

    // Destroy previous engine — abort() for instant 0ms hardware release
    try { speechEngineRef.current?.reset(); } catch {}
    speechEngineRef.current = null;

    const engine = createSpeechEngine({
      langKey: language,
      ruralMode: true,
      silenceMs: 4500, // 4.5s — gives room for natural mid-sentence pauses without interrupting

      // Live interim: stream words character-by-character into overlay text box
      onInterim: (text) => {
        setInterimText(text || '');
        setIsListening(true);
      },

      // Final confirmed word/phrase: populate both overlay + input box (REPLACE, never append)
      onFinalWord: (text) => {
        if (!text) return;
        setFinalSpeech(text);
        setInterimText('');
        setInput(text);
        setIsListening(true);
      },

      // 3.5s silence auto-stop: populate input for user to review then tap Send
      onStopped: (finalText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsListening(false);
        setInterimText('');

        if (finalText && finalText.trim()) {
          setFinalSpeech(finalText);
          setInput(finalText);
          playAudioCue('stop');
          // Overlay stays open — user reviews text and taps بھیجیں
        } else {
          // Nothing was captured — close overlay cleanly
          setShowMicOverlay(false);
        }
        setTimeout(() => { isProcessingRef.current = false; }, 300);
      },

      onError: (errType) => {
        setIsListening(false);
        isProcessingRef.current = false;
        setShowMicOverlay(false);
        playAudioCue('error');

        if (errType === 'permission_denied') {
          alert(
            'مائیک کی اجازت دیں:\n' +
            '• ایڈریس بار میں 🔒 تالے کے نشان پر ٹیپ کریں\n' +
            '• Microphone → Allow کریں\n' +
            '• صفحہ دوبارہ لوڈ کریں'
          );
        } else if (errType === 'audio-capture') {
          alert('مائیک دستیاب نہیں — براہ کرم دوبارہ کوشش کریں');
        } else if (errType === 'no_speech') {
          setNetError('آواز محسوس نہیں ہوئی — 🎤 دبا کر دوبارہ بولیں یا کی بورڈ سے ٹائپ کریں');
        } else if (errType === 'language-not-supported') {
          setNetError('آپ کے فون پر اردو آواز سپورٹ نہیں ہے — براہ کرم کی بورڈ سے ٹائپ کریں');
        } else if (errType === 'ios_limit') {
          setShowMicOverlay(true);
          setIosError(true);
        }
      }
    });

    speechEngineRef.current = engine;
    engine?.start();
  }, [language]);


  // Stop recording — called by overlay ⏹ button (keeps overlay open to show text)
  const stopListening = useCallback(() => {
    playAudioCue('stop');
    try { speechEngineRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  // Send voice message — called by overlay بھیجیں button
  const sendVoiceMessage = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    playAudioCue('stop');

    // Get best available transcript
    const accumulated = speechEngineRef.current?.getAccumulated?.() || '';
    const rawText = finalSpeech.trim() || accumulated.trim() || interimText.trim();
    const text    = correctUrduAgriPhonetics(rawText);

    // Destroy engine immediately
    try { speechEngineRef.current?.reset(); } catch {}
    speechEngineRef.current = null;

    // Close overlay and clear voice state
    setShowMicOverlay(false);
    setFinalSpeech('');
    setInterimText('');
    setIsListening(false);
    setInput('');

    setTimeout(() => { isProcessingRef.current = false; }, 300);

    if (text) {
      setTimeout(() => { sendMessageRef.current?.(text); }, 150);
    }
  }, [finalSpeech, interimText]);

  // Cancel mic — close overlay with NO message sent
  const cancelMic = useCallback(() => {
    // reset() uses abort() internally — 0ms hardware release, no buffer-flush hang
    try { speechEngineRef.current?.reset(); } catch {}
    speechEngineRef.current = null;
    setIsListening(false);
    setShowMicOverlay(false);
    setFinalSpeech('');
    setInterimText('');
    // Keep input text if user had already typed something before using mic
  }, []);

  // Retry mic — re-open overlay and start fresh session
  const retryMic = useCallback(() => {
    try { speechEngineRef.current?.reset(); } catch {}
    speechEngineRef.current = null;
    setIsListening(false);
    setFinalSpeech('');
    setInterimText('');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setTimeout(() => { startListening(); }, 200);
  }, [startListening]);

  // Toggle: input bar 🎤 button
  const toggleSpeech = useCallback(() => {
    if (showMicOverlay) { cancelMic(); return; }
    startListening();
  }, [showMicOverlay, startListening, cancelMic]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isBusy) return;
    setNetError(''); // clear any previous error

    // Stop recording if active — use reset() (abort) to prevent Android hang
    if (isListening) {
      try { speechEngineRef.current?.reset(); } catch {}
      speechEngineRef.current = null;
      setIsListening(false);
      setInterimText('');
      setShowMicOverlay(false);
    }

    if (isOffline) {
      const userMsg2 = { role: 'user', content: msg, time: new Date() };
      setMessages(prev => [...prev, userMsg2]);
      setInput('');
      setShowQuickReplies(false);

      // Show searching indicator
      const searchingMsg = { role: 'assistant', content: '', streaming: true, offline: true, time: new Date() };
      setMessages(prev => [...prev, searchingMsg]);

      // Search offline: AI cache first, then FAQ
      const result = await searchOffline(msg);

      if (result.found) {
        const badge = result.source === 'cache'
          ? '\n\n---\n📱 *یہ جواب آپ کے پچھلے سوال سے ملا*'
          : '\n\n---\n📚 *آف لائن ڈیٹا بیس سے جواب*';
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: result.answer + badge,
            streaming: false, offline: true, time: new Date()
          };
          return copy;
        });
      } else {
        // No match — queue the question
        queueQuestion(msg);
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: '📥 سوال محفوظ کر لیا گیا۔\n\nآن لائن ہونے پر یہ سوال خود بخود بھیج دیا جائے گا۔\n\n💡 *ابھی کے لیے: اپنے سوال میں گندم، کپاس، کھاد، پانی جیسے الفاظ ڈالیں — میرے پاس آف لائن جوابات ہو سکتے ہیں۔*',
            streaming: false, offline: true, time: new Date()
          };
          return copy;
        });
        setHasQueuedQuestions(true);
      }
      return;
    }

    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setInterimText('');
    setShowQuickReplies(false);

    // Bug fix: use messagesRef.current so history is always current (not stale closure)
    const history = [...messagesRef.current, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));

    // Add streaming placeholder
    const streamingMsg = { role: 'assistant', content: '', streaming: true, time: new Date() };
    setMessages(prev => [...prev, streamingMsg]);
    setIsStreaming(true);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ messages: history, language }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) throw new Error('stream_failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';
      let buffer    = '';
      let gotFirstChunk = false;

      // ── 10-second no-data timeout ─────────────────────────────────────────
      // If no actual text arrives within 10s (Railway buffering / DB hang),
      // abort the stream and fall back to the reliable non-streaming endpoint.
      const noDataTimer = setTimeout(() => {
        if (!gotFirstChunk) {
          try { controller.abort(); } catch {}
        }
      }, 10000);

      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break outer;   // properly exit while loop
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                gotFirstChunk = true;             // cancel the timeout
                fullReply += parsed.text;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: 'assistant', content: fullReply, streaming: true, time: new Date() };
                  return copy;
                });
              }
            } catch {}
          }
        }
      } finally {
        clearTimeout(noDataTimer);
        reader.cancel().catch(() => {});
      }

      if (!gotFirstChunk) {
        // Stream connected but sent no text — treat as failure, fall to fallback
        throw new Error('stream_empty');
      }

      // Finalize
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: fullReply, streaming: false, time: new Date() };
        return copy;
      });

      // Save to offline cache for future offline use
      if (fullReply) saveAIAnswer(msg, fullReply).catch(() => {});

    } catch (err) {
      if (err.name === 'AbortError' && abortRef.current?.signal?.reason !== 'user_stop') {
        err._isTimeout = true;
      }

      if (err.name === 'AbortError' && !err._isTimeout) {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false };
          return copy;
        });
      } else {
        let recovered = false;
        try {
          const lastUserMsg = history.filter(m => m.role === 'user').slice(-1)[0]?.content || msg;
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000);
          let res2;
          try {
            res2 = await fetch(`${API_URL}/api/ai/ask`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({ question: lastUserMsg, language }),
              signal: fallbackController.signal
            });
          } finally {
            clearTimeout(fallbackTimeout);
          }
          if (res2.ok) {
            const data = await res2.json();
            const reply = data.reply || data.answer || data.error || 'جواب نہیں ملا';
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'assistant', content: reply, streaming: false, time: new Date() };
              return copy;
            });
            if (reply) saveAIAnswer(msg, reply).catch(() => {});
            recovered = true;
          }
        } catch {}

        if (!recovered) {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.streaming) copy.pop();
            return copy;
          });
          const errText = language === 'en' ? '❌ Connection error — tap retry' : language === 'pj' ? '❌ سرور نال رابطہ نہیں ہویا — مڑ بھیجو' : '❌ سرور سے رابطہ نہیں — دوبارہ بھیجیں';
          setNetError(errText);
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isBusy, isListening, isOffline, language]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      sendMessage();
    }
  };

  sendMessageRef.current = sendMessage;

  const stopGenerating = () => {
    try { abortRef.current?.abort('user_stop'); } catch {}
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    setShowClearConfirm(false);
    saveChatSession(messagesRef.current);
    try { abortRef.current?.abort(); } catch {}
    currentSessionId.current = Date.now().toString();
    setNetError('');
    setMessages([{
      role: 'assistant',
      content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES.ur,
      time: new Date()
    }]);
    setInput('');
    setInterimText('');
    setIsStreaming(false);
  };

  useEffect(() => {
    if (!isOffline && hasQueuedQuestions) {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        setHasQueuedQuestions(false);
        const first = queue[0];
        removeFromQueue(first.id);
        setTimeout(() => sendMessageRef.current?.(first.question), 800);
      }
    }
  }, [isOffline]);

  const displayInput = (input + ' ' + finalSpeech + ' ' + interimText).trim();
  const showMicOnly  = !input.trim() && !isListening;

  const currentQuickReplies = QUICK_REPLIES[language] || QUICK_REPLIES.ur;
  const currentPlaceholder = PLACEHOLDERS[language] || PLACEHOLDERS.ur;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      position: 'fixed',
      top: 'var(--header-height, 60px)',
      bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 430,
      background: '#ece5dd',
      overflow: 'hidden',
      zIndex: 10
    }}>

      {/* ── Clear Confirmation Modal ── */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '20px 24px',
            maxWidth: 320, width: '100%', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            direction: language === 'en' ? 'ltr' : 'rtl',
            fontFamily: language === 'en' ? 'Inter, sans-serif' : 'Noto Nastaliq Urdu, serif'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', marginBottom: 8 }}>
              {language === 'en' ? 'Clear Conversation?' : language === 'pj' ? 'کیہ تسیں گل بات صاف کرنا چاہندے او؟' : 'کیا آپ گفتگو صاف کرنا چاہتے ہیں؟'}
            </div>
            <div style={{ fontSize: '.82rem', color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
              {language === 'en' ? 'This action will clear all messages in this session.' : 'موجودہ گفتگو کے تمام پیغامات صاف ہو جائیں گے۔'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 10, border: '1px solid #d1d5db',
                  background: '#f3f4f6', color: '#374151', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer'
                }}
              >
                {language === 'en' ? 'Cancel' : 'منسوخ'}
              </button>
              <button
                onClick={confirmClearChat}
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 10, border: 'none',
                  background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '.85rem', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
                }}
              >
                {language === 'en' ? 'Yes, Clear' : 'جی ہاں، صاف کریں'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSidebar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex'
        }}>
          <div
            onClick={() => setShowSidebar(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'relative', width: 300, maxWidth: '85vw',
            background: '#162410', height: '100%',
            display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
            animation: 'sidebarSlideIn 0.25s ease-out'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a3a16, #2e5a27)',
              padding: '16px 14px',
              paddingTop: 'calc(16px + env(safe-area-inset-top))'
            }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>
                🌾 DehatiAI
              </div>
              <button
                onClick={() => { setShowSidebar(false); handleClearClick(); }}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: 10, padding: '9px 14px',
                  color: 'white', fontWeight: 800, fontSize: '.88rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: language === 'en' ? 'Inter, sans-serif' : '"Noto Nastaliq Urdu", serif',
                  direction: language === 'en' ? 'ltr' : 'rtl'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>✏️</span>
                {language === 'en' ? '+ New Chat' : '+ نئی بات چیت'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {chatHistory.length === 0 ? (
                <div style={{
                  padding: '2rem 1rem', textAlign: 'center',
                  color: '#64748b', fontSize: '.82rem',
                  fontFamily: language === 'en' ? 'Inter, sans-serif' : '"Noto Nastaliq Urdu", serif',
                  direction: language === 'en' ? 'ltr' : 'rtl'
                }}>
                  {language === 'en' ? 'No chat history. Ask a question!' : 'کوئی پرانی گفتگو نہیں۔ سوال کریں — پھر یہاں ظاہر ہو گا۔'}
                </div>
              ) : (
                <>
                  {chatHistory.map(session => (
                    <div
                      key={session.id}
                      onClick={() => loadChatSession(session)}
                      style={{
                        padding: '10px 14px', margin: '2px 8px', borderRadius: 8,
                        background: currentSessionId.current === session.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                        cursor: 'pointer', transition: 'background .15s',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        direction: language === 'en' ? 'ltr' : 'rtl'
                      }}
                    >
                      <div style={{
                        color: 'white', fontSize: '.84rem', fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        fontFamily: language === 'en' ? 'Inter, sans-serif' : '"Noto Nastaliq Urdu", serif'
                      }}>
                        {session.title || (language === 'en' ? 'Untitled Conversation' : 'غیر عنوان گفتگو')}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '.7rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{session.messages?.length || 0} {language === 'en' ? 'messages' : 'پیغامات'}</span>
                        <span>{formatSessionDate(session.updatedAt || session.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showMicOverlay && (
        <MicOverlay
          isListening={isListening}
          interimText={interimText}
          finalText={finalSpeech}
          onStop={stopListening}
          onSend={sendVoiceMessage}
          onCancel={cancelMic}
          onRetry={retryMic}
          iosError={iosError}
        />
      )}

      {/* ── Message list container ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px 8px',
        display: 'flex', flexDirection: 'column', gap: 12,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,.15) transparent'
      }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}

        {isListening && interimText && (
          <div style={{
            display: 'flex', justifyContent: language === 'en' ? 'flex-start' : 'flex-end', marginBottom: 8,
            animation: 'msgFadeIn .2s ease-out'
          }}>
            <div style={{
              background: 'rgba(46,90,39,.5)', color: 'white',
              padding: '8px 14px', borderRadius: '18px 18px 4px 18px',
              fontSize: '.88rem', maxWidth: '78%', fontStyle: 'italic',
              border: '1.5px dashed rgba(255,255,255,.5)'
            }}>
              {interimText}
              <span style={{ opacity: 0.6 }}> ...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Floating Quick Reply Chips (Right above Input Bar) ── */}
      {showQuickReplies && (
        <div style={{
          padding: '4px 10px 8px',
          background: 'transparent',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          maxWidth: '100%',
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {currentQuickReplies.map((r, i) => (
              <button key={i} onClick={() => sendMessage(r)} disabled={isBusy} style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid #2e5a27',
                background: 'white', color: '#2e5a27', fontSize: '.8rem',
                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: language === 'en' ? 'Inter, sans-serif' : '"Noto Nastaliq Urdu", serif',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                opacity: isBusy ? 0.5 : 1, transition: 'all .15s',
                direction: 'rtl'
              }}>{r}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Network error banner ── */}
      {netError && (
        <div style={{
          background: '#fef2f2', borderTop: '1px solid #fecaca',
          padding: '8px 16px', display: 'flex', alignItems: 'center',
          gap: 10, flexShrink: 0
        }}>
          <span style={{ flex: 1, color: '#dc2626', fontSize: '.82rem', fontFamily: '"Noto Nastaliq Urdu",serif', direction: 'rtl' }}>
            {netError}
          </span>
          <button
            onClick={() => { setNetError(''); sendMessage(input || (messagesRef.current.filter(m=>m.role==='user').slice(-1)[0]?.content || '')); }}
            style={{ background:'#dc2626', color:'white', border:'none', borderRadius:8, padding:'4px 12px', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
          >دوبارہ بھیجیں</button>
          <button onClick={() => setNetError('')} style={{ background:'transparent', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'1rem' }}>✕</button>
        </div>
      )}

      {/* ── Stop generating button ── */}
      {isBusy && (
        <div style={{ padding: '4px 12px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={stopGenerating}
            style={{
              background: 'white', border: '1.5px solid #6b7280',
              borderRadius: 20, padding: '5px 18px',
              fontSize: '.78rem', fontWeight: 700, color: '#374151',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 1px 4px rgba(0,0,0,.1)'
            }}
          >
            <span style={{ fontSize: '.7rem' }}>⏹</span> جواب روکیں
          </button>
        </div>
      )}

      {/* ── Recording indicator bar ── */}
      {isListening && !showMicOverlay && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, animation: 'slideUp .2s ease-out'
        }}>
          <div style={{ color: 'white', fontSize: '.8rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            🎙️ سن رہا ہوں
          </div>
          <Waveform />
          {(displayInput || interimText || finalSpeech) ? (
            <div style={{
              flex: 1, color: 'rgba(255,255,255,.95)', fontSize: '.85rem', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              direction: getDir(displayInput || interimText || finalSpeech),
              fontFamily: getFont(displayInput || interimText || finalSpeech)
            }}>
              {displayInput || interimText || finalSpeech}
            </div>
          ) : (
            <div style={{ flex: 1, color: 'rgba(255,255,255,.7)', fontSize: '.8rem', fontStyle: 'italic' }}>
              {language === 'en' ? 'Speak now...' : 'بولیں، میں سن رہا ہوں...'}
            </div>
          )}
          <button onClick={toggleSpeech} style={{
            background: 'rgba(255,255,255,.2)', border: 'none', color: 'white',
            borderRadius: 12, padding: '4px 10px', cursor: 'pointer',
            fontSize: '.75rem', fontWeight: 700, fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap'
          }}>■ بند کریں</button>
        </div>
      )}

      {/* ── Bottom Input Bar (Exactly Matching Reference Image) ── */}
      <div style={{
        padding: '8px 12px 10px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        background: '#ece5dd',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        direction: 'ltr',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        {/* Mic button — Left side (Dark Green Circle with Mic icon) */}
        <button
          id="chat-mic-btn"
          onClick={toggleSpeech}
          disabled={isBusy}
          aria-label={isListening ? 'آواز بند کریں' : 'آواز سے لکھیں'}
          style={{
            width: 48, minWidth: 48, height: 48, borderRadius: '50%', border: 'none',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #1e3a16, #2e5a27)',
            color: 'white', fontSize: '1.3rem',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isListening
              ? '0 0 0 4px rgba(239,68,68,.3), 0 4px 12px rgba(239,68,68,.4)'
              : '0 3px 10px rgba(30,58,22,.4)',
            animation: isListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
            transition: 'all .25s',
            opacity: isBusy ? 0.5 : 1,
            zIndex: 5
          }}
        >
          {isListening ? '⏹' : '🎤'}
        </button>

        {/* Text input box — Center (Rounded white input box with placeholder) */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            placeholder={isListening ? (language === 'en' ? '🎙️ Listening...' : '🎙️ بول رہے ہیں...') : isBusy ? (language === 'en' ? 'Thinking...' : 'جواب آ رہا ہے...') : currentPlaceholder}
            value={isListening ? displayInput : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={isListening}
            maxLength={1000}
            dir={getDir(isListening ? displayInput : input)}
            lang={getDir(isListening ? displayInput : input) === 'rtl' ? 'ur' : 'en'}
            style={{
              width: '100%', padding: '12px 16px',
              borderRadius: 24, border: 'none',
              background: 'white',
              fontSize: '.9rem', resize: 'none', outline: 'none',
              fontFamily: getFont(isListening ? displayInput : input),
              textAlign: getAlign(isListening ? displayInput : input),
              maxHeight: 120, overflowY: 'auto',
              boxShadow: '0 2px 6px rgba(0,0,0,.08)',
              color: isListening ? '#6b7280' : '#111827',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              transition: 'text-align 0.1s, direction 0.1s'
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            disabled={isBusy}
          />
        </div>

        {/* Send button — Right side (Circular send button) */}
        <button
          id="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={(!input.trim() && !interimText) || isBusy}
          aria-label="بھیجیں"
          style={{
            width: 48, minWidth: 48, height: 48, borderRadius: '50%', border: 'none',
            background: (input.trim() || interimText)
              ? 'linear-gradient(135deg, #2e5a27, #1e3a16)'
              : '#e5e7eb',
            color: (input.trim() || interimText) ? 'white' : '#9ca3af',
            fontSize: '1.2rem',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: (input.trim() || interimText) ? '0 3px 10px rgba(30,58,22,.35)' : 'none',
            transition: 'all .2s'
          }}
        >
          {isBusy ? (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,.3)',
              borderTopColor: 'white',
              animation: 'spin .8s linear infinite'
            }} />
          ) : '➤'}
        </button>
      </div>

      {/* ── WhatsApp Full-Screen Mic Overlay ── */}
      {showMicOverlay && (
        <MicOverlay
          isListening={isListening}
          interimText={interimText}
          finalText={finalSpeech}
          onStop={stopListening}
          onSend={sendVoiceMessage}
          onCancel={cancelMic}
          onRetry={retryMic}
          iosError={iosError}
        />
      )}

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes sidebarSlideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(220,38,38,.3), 0 4px 12px rgba(220,38,38,.4); }
          50%       { box-shadow: 0 0 0 10px rgba(220,38,38,.1), 0 4px 12px rgba(220,38,38,.2); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        /* Waveform bars */
        @keyframes waveBar1 { 0%,100%{height:4px}  50%{height:16px} }
        @keyframes waveBar2 { 0%,100%{height:8px}  50%{height:24px} }
        @keyframes waveBar3 { 0%,100%{height:5px}  50%{height:20px} }
        @keyframes waveBar4 { 0%,100%{height:14px} 50%{height:28px} }
        @keyframes waveBar5 { 0%,100%{height:5px}  50%{height:20px} }
        @keyframes waveBar6 { 0%,100%{height:8px}  50%{height:24px} }
        @keyframes waveBar7 { 0%,100%{height:4px}  50%{height:16px} }

        div::-webkit-scrollbar { height: 3px; width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
      `}</style>
    </div>
  );
}
