import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { getDir, getFont, getAlign } from '../utils/textDir';
import { searchOffline, saveAIAnswer, queueQuestion, getOfflineQueue, removeFromQueue } from '../services/offlineDB';

import { API_URL } from '../config';

function getToken() {
  return localStorage.getItem('dehati_token');
}

const QUICK_REPLIES = [
  'کھاد کی سفارش دیں',
  'فصل کو پانی کب دیں',
  'سرکاری قرضہ کیسے لیں',
  'گندم میں بیماری کی علامات',
  'منڈی کی آج کی قیمتیں',
  'DAP اور یوریا کا فرق',
  'سپرے کا بہترین وقت',
  'بھینس کا دودھ کم ہے'
];

const LANGS = [
  { key: 'ur', label: 'اردو', srLang: 'ur-PK' },
  { key: 'pj', label: 'پنجابی', srLang: 'pa-PK' },
  { key: 'en', label: 'English', srLang: 'en-US' }
];

// Detect iOS (Safari on iPhone/iPad doesn't support SpeechRecognition in PWA mode)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function formatTime(date) {
  return date.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
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
function MicOverlay({ isListening, interimText, finalText, onStop, onSend, onCancel, iosError }) {
  const hasText = (finalText + interimText).trim().length > 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'overlayFadeIn 0.2s ease-out'
    }}>

      {/* Transcript box / iOS error */}
      <div style={{
        width: '80%', maxWidth: 340,
        background: iosError ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '16px 18px',
        minHeight: 72, marginBottom: 32,
        border: iosError ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.15)',
        textAlign: 'center'
      }}>
        {iosError ? (
          <div style={{ color: '#fca5a5', fontSize: '.9rem', lineHeight: 1.7, direction: 'rtl', fontFamily: '"Noto Nastaliq Urdu", serif' }}>
            📱 آئی فون پر آواز کی سہولت
            <br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem' }}>
              Chrome for Android میں مکمل کام کرتی ہے۔
              <br/>ابھی ٹائپ کریں یا Android Chrome استعمال کریں۔
            </span>
          </div>
        ) : (finalText || interimText) ? (
          <div style={{
            color: 'white', fontSize: '1rem', lineHeight: 1.8,
            fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl'
          }}>
            <span style={{ color: '#fff' }}>{finalText}</span>
            {interimText && (
              <span style={{ color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
                {finalText ? ' ' : ''}{interimText}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.85rem' }}>
            {isListening ? 'بول رہے ہیں...' : 'تیار...'}
          </div>
        )}
      </div>

      {/* Ripple mic button */}
      <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 32 }}>
        {/* Ripple rings — only when listening */}
        {isListening && [1,2,3].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(220,38,38,0.5)',
            animation: `ripple 1.8s ease-out infinite`,
            animationDelay: `${(i-1)*0.6}s`
          }} />
        ))}
        <button
          onClick={isListening ? onStop : undefined}
          style={{
            width: 90, height: 90, borderRadius: '50%', border: 'none',
            background: iosError
              ? 'linear-gradient(135deg,#6b7280,#4b5563)'
              : isListening
                ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                : 'linear-gradient(135deg,#2e5a27,#4a7c40)',
            color: 'white', fontSize: '2.2rem',
            cursor: 'pointer', position: 'relative', zIndex: 2,
            boxShadow: isListening
              ? '0 0 0 6px rgba(220,38,38,.25)'
              : '0 4px 20px rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .25s'
          }}
        >
          {iosError ? '❌' : isListening ? '⏹' : '🎤'}
        </button>
      </div>

      {/* Waveform (only when listening) */}
      <div style={{ height: 36, marginBottom: 28, opacity: isListening ? 1 : 0, transition: 'opacity .3s' }}>
        <Waveform />
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button onClick={onCancel} style={{
          background: 'rgba(255,255,255,0.12)', color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 24, padding: '10px 22px',
          fontSize: '.85rem', fontWeight: 700, cursor: 'pointer'
        }}>❌ منسوخ</button>

        {hasText && (
          <button onClick={onSend} style={{
            background: 'linear-gradient(135deg,#2e5a27,#4a7c40)',
            color: 'white', border: 'none',
            borderRadius: 24, padding: '10px 28px',
            fontSize: '.9rem', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(46,90,39,.5)'
          }}>بھیجیں ➤</button>
        )}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '.72rem', marginTop: 20, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '0 20px' }}>
        {iosError
          ? 'iPhone Safari — voice limited. Type or use Android Chrome.'
          : isListening
            ? 'Tap ⏹ to stop recording'
            : 'Connecting to microphone...'}
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
          {msg.streaming && msg.content === '' ? <TypingDots /> : formatContent(msg.content)}
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

        {/* Timestamp */}
        {msg.time && !msg.streaming && (
          <div style={{
            fontSize: '0.67rem', color: '#9ca3af', marginTop: 3,
            padding: '0 4px',
            display: 'flex', alignItems: 'center', gap: 3,
            flexDirection: isUser ? 'row-reverse' : 'row'
          }}>
            {formatTime(msg.time)}
            {isUser && <span style={{ color: '#4ade80' }}>✓✓</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Chat ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `سلام ${user?.name ? user.name.split(' ')[0] : ''}! 👋 میں DehatiAI ہوں — آپ کا زرعی ساتھی۔\nفصل، کھاد، بیماری، موسم — کچھ بھی پوچھیں! 🌾`,
      time: new Date()
    }
  ]);
  const [input, setInput]               = useState('');
  const [interimText, setInterimText]   = useState(''); // live speech transcript
  const [finalSpeech, setFinalSpeech]   = useState(''); // finalized speech words
  const [language, setLanguage]         = useState('ur');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [showMicOverlay, setShowMicOverlay] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [iosError, setIosError]         = useState(false); // iOS Safari can't do voice
  const [hasQueuedQuestions, setHasQueuedQuestions] = useState(
    () => getOfflineQueue().length > 0
  );

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);
  const recognitionRef = useRef(null);
  const { isOffline }  = useOffline();
  const [searchParams]  = useSearchParams();
  const [netError, setNetError]   = useState('');   // network/server error message

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

  // Cleanup on unmount — MUST call _stopped() before stop() to prevent zombie auto-restart
  useEffect(() => {
    return () => {
      try { recognitionRef.current?._stopped?.(); } catch {} // prevent onend auto-restart
      try { recognitionRef.current?.stop(); } catch {}
      try { abortRef.current?.abort(); } catch {}
    };
  }, []);

  // ── Voice input ─────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('آپ کا براؤزر آواز سپورٹ نہیں کرتا۔ Android Chrome استعمال کریں۔');
      return;
    }

    // Show overlay, reset state
    setShowMicOverlay(true);
    setIosError(false);
    setFinalSpeech('');
    setInterimText('');

    const lang = LANGS.find(l => l.key === language)?.srLang || 'ur-PK';

    let accumulated   = '';
    let stopped       = false;
    let gotSpeech     = false;   // did we ever get actual text?
    let emptyEnds     = 0;       // consecutive ends with no speech (iOS symptom)
    const MAX_EMPTY   = isIOS ? 2 : 99; // iOS: give up after 2 empty cycles

    function createRecognition() {
      const recognition = new SR();
      recognition.lang            = lang;
      recognition.continuous      = false; // better mobile/iOS support
      recognition.interimResults  = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (e) => {
        gotSpeech = true;
        emptyEnds = 0; // reset counter — real speech came through
        let sessionFinal = '';
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) sessionFinal += t + ' ';
          else interim += t;
        }
        if (sessionFinal.trim()) {
          accumulated += sessionFinal;
          setFinalSpeech(accumulated.trim());
        }
        setInterimText(interim);
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        setIsListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true;
          setShowMicOverlay(false);
          alert('مائیک کی اجازت دیں:\nSettings → Safari → Microphone → Allow');
        }
        if (e.error === 'service-not-allowed' && isIOS) {
          stopped = true;
          setIosError(true);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (stopped) return;

        if (!gotSpeech) {
          emptyEnds++;
        }

        // iOS symptom: keeps ending immediately with no speech
        if (emptyEnds >= MAX_EMPTY) {
          stopped = true;
          setIosError(true); // show helpful iOS message
          return;
        }

        // Auto-restart (Android Chrome / desktop)
        setTimeout(() => {
          if (!stopped) {
            try {
              const next = createRecognition();
              recognitionRef.current = next;
              recognitionRef.current._stopped = () => { stopped = true; };
              next.start();
            } catch {}
          }
        }, 200);
      };

      return recognition;
    }

    const recognition = createRecognition();
    recognitionRef.current = recognition;
    recognitionRef.current._stopped = () => { stopped = true; };
    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      setShowMicOverlay(false);
    }
  }, [language]);


  const stopListening = useCallback(() => {
    try { recognitionRef.current?._stopped?.(); } catch {}
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const sendVoiceMessage = useCallback(() => {
    const text = (finalSpeech + ' ' + interimText).trim();
    try { recognitionRef.current?._stopped?.(); } catch {}
    try { recognitionRef.current?.stop(); } catch {}
    setShowMicOverlay(false);
    setFinalSpeech('');
    setInterimText('');
    setIsListening(false);
    // Bug fix: use ref so we always call the latest sendMessage (not a stale closure)
    if (text) sendMessageRef.current?.(text);
  }, [finalSpeech, interimText]);

  const cancelMic = useCallback(() => {
    try { recognitionRef.current?._stopped?.(); } catch {}
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setShowMicOverlay(false);
    setFinalSpeech('');
    setInterimText('');
  }, []);

  // Legacy toggle for input-bar mic button
  const toggleSpeech = useCallback(() => {
    if (showMicOverlay) { cancelMic(); return; }
    startListening();
  }, [showMicOverlay, startListening, cancelMic]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isBusy) return;
    setNetError(''); // clear any previous error

    // Stop recording if active
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      setInterimText('');
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
        // Timed-out abort (10s no-data) — fall through to non-streaming fallback
        err._isTimeout = true;
      }

      if (err.name === 'AbortError' && !err._isTimeout) {
        // User manually pressed Stop — finalize whatever was received
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false };
          return copy;
        });
      } else {
        // Stream failed / timed-out / empty — try reliable non-streaming fallback
        let recovered = false;
        try {
          // Use explicit AbortController for timeout (AbortSignal.timeout not supported on older mobile browsers)
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000);
          let res2;
          try {
            res2 = await fetch(`${API_URL}/api/ai/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({ messages: history, language }),
              signal: fallbackController.signal
            });
          } finally {
            clearTimeout(fallbackTimeout);
          }
          if (res2.ok) {
            const data = await res2.json();
            const reply = data.reply || data.error || 'جواب نہیں ملا';
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
          // Both streaming and fallback failed — show retry banner
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.streaming) copy.pop();
            return copy;
          });
          setNetError('❌ سرور سے رابطہ نہیں — دوبارہ بھیجیں');
        }
      }
    } finally {
      setIsStreaming(false);
    }
  // Bug fix: removed 'messages' from deps — use messagesRef.current instead to avoid stale closures
  }, [input, isBusy, isListening, isOffline, language]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Bug fix: keep sendMessageRef always pointing to latest sendMessage
  sendMessageRef.current = sendMessage;

  const stopGenerating = () => {
    try { abortRef.current?.abort('user_stop'); } catch {}
  };

  const clearChat = () => {
    try { abortRef.current?.abort(); } catch {}
    setNetError('');
    setMessages([{
      role: 'assistant',
      content: `سلام! 👋 نئی گفتگو شروع کریں — فصل، کھاد، بیماری، موسم کچھ بھی پوچھیں 🌾`,
      time: new Date()
    }]);
    setInput('');
    setInterimText('');
    setIsStreaming(false);
    setShowQuickReplies(true);
  };

  // Auto-send queued questions when back online
  useEffect(() => {
    if (!isOffline && hasQueuedQuestions) {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        setHasQueuedQuestions(false);
        const first = queue[0];
        removeFromQueue(first.id);
        // Bug fix: use ref so we always call the latest sendMessage
        setTimeout(() => sendMessageRef.current?.(first.question), 800);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  const displayInput = input + (interimText ? (input ? ' ' : '') + interimText : '');
  const showMicOnly  = !input.trim() && !isListening;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 430, margin: '0 auto',
      background: '#ece5dd',
      position: 'relative', overflow: 'hidden'
    }}>

      {/* ── WhatsApp Mic Overlay ── */}
      {showMicOverlay && (
        <MicOverlay
          isListening={isListening}
          interimText={interimText}
          finalText={finalSpeech}
          onStop={stopListening}
          onSend={sendVoiceMessage}
          onCancel={cancelMic}
          iosError={iosError}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a16, #2e5a27)',
        padding: '12px 16px 10px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)', flexShrink: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', border: '2px solid rgba(255,255,255,.3)'
          }}>🌾</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '.95rem', fontFamily: 'Inter, sans-serif' }}>DehatiAI</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.72rem', fontFamily: 'Inter, sans-serif' }}>
              {isBusy ? '✍️ جواب لکھ رہا ہوں...' : isListening ? '🎙️ سن رہا ہوں...' : '🟢 آن لائن'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Language selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {LANGS.map(l => (
              <button key={l.key} onClick={() => setLanguage(l.key)} style={{
                padding: '3px 9px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: language === l.key ? 'white' : 'rgba(255,255,255,.2)',
                color: language === l.key ? '#2e5a27' : 'white',
                fontSize: '.7rem', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                transition: 'all .2s'
              }}>{l.label}</button>
            ))}
          </div>
          {/* Clear button */}
          <button onClick={clearChat} title="نئی گفتگو" style={{
            width: 34, height: 34, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,.15)', color: 'white', cursor: 'pointer',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>🗑️</button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 12px 0',
        display: 'flex', flexDirection: 'column',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,.2) transparent'
      }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}

        {/* Live interim transcript bubble */}
        {isListening && interimText && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', marginBottom: 8,
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

        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── Quick replies ── */}
      {showQuickReplies && (
        <div style={{
          padding: '6px 12px',
          background: 'transparent',
          flexShrink: 0,
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
            {QUICK_REPLIES.map((r, i) => (
              <button key={i} onClick={() => sendMessage(r)} disabled={isBusy} style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid #2e5a27',
                background: 'white', color: '#2e5a27', fontSize: '.78rem',
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: '"Noto Nastaliq Urdu", serif',
                boxShadow: '0 1px 4px rgba(0,0,0,.08)',
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
        <div style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
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
      {isListening && (
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
          {input && (
            <div style={{
              flex: 1, color: 'rgba(255,255,255,.9)', fontSize: '.8rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              direction: 'rtl', fontFamily: '"Noto Nastaliq Urdu", serif'
            }}>
              {input}
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

      {/* ── Input bar ── */}
      <div style={{
        padding: '8px 10px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom) + 56px)',
        background: '#ece5dd',
        flexShrink: 0,
        display: 'flex', alignItems: 'flex-end', gap: 8
      }}>
        {/* Mic button — left side (WhatsApp style) */}
        <button
          id="chat-mic-btn"
          onClick={toggleSpeech}
          disabled={isBusy}
          aria-label={isListening ? 'آواز بند کریں' : 'آواز سے لکھیں'}
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none',
            background: isListening
              ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
              : 'linear-gradient(135deg, #2e5a27, #4a7c40)',
            color: 'white', fontSize: '1.2rem',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isListening
              ? '0 0 0 4px rgba(220,38,38,.3), 0 4px 12px rgba(220,38,38,.4)'
              : '0 2px 8px rgba(0,0,0,.2)',
            animation: isListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
            transition: 'background .25s, box-shadow .25s',
            opacity: isBusy ? 0.5 : 1
          }}
        >
          {isListening ? '⏹' : '🎤'}
        </button>

        {/* Text input — direction auto-switches as user types */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            placeholder={isListening ? '🎙️ بول رہے ہیں...' : isBusy ? 'جواب آ رہا ہے...' : 'یہاں لکھیں یا 🎤 سے بولیں...'}
            value={isListening ? displayInput : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={isListening}
            maxLength={1000}
            dir={getDir(isListening ? displayInput : input)}
            lang={getDir(isListening ? displayInput : input) === 'rtl' ? 'ur' : 'en'}
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: 24, border: 'none',
              background: 'white',
              fontSize: '.9rem', resize: 'none', outline: 'none',
              fontFamily: getFont(isListening ? displayInput : input),
              textAlign: getAlign(isListening ? displayInput : input),
              maxHeight: 120, overflowY: 'auto',
              boxShadow: '0 1px 4px rgba(0,0,0,.1)',
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

        {/* Send button */}
        <button
          id="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={(!input.trim() && !interimText) || isBusy}
          aria-label="بھیجیں"
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none',
            background: input.trim() || interimText
              ? 'linear-gradient(135deg, #2e5a27, #4a7c40)'
              : '#d1d5db',
            color: 'white', fontSize: '1.1rem',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: input.trim() ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
            transition: 'background .2s, box-shadow .2s'
          }}
        >
          {isBusy ? (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,.3)',
              borderTopColor: 'white',
              animation: 'spin 0.7s linear infinite'
            }} />
          ) : '➤'}
        </button>
      </div>

      {/* ── CSS animations ── */}
      <style>{`
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
