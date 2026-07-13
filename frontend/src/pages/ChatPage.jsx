import { useState, useRef, useEffect, useCallback } from 'react';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

function formatTime(date) {
  return date.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
}

// ── Waveform animation bars ────────────────────────────────────────────────────
function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 3,
          background: 'white',
          animation: `waveBar${i} 0.8s ease-in-out infinite`,
          animationDelay: `${(i - 1) * 0.1}s`
        }} />
      ))}
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

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isLast }) {
  const isUser = msg.role === 'user';

  const formatContent = (text) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 12,
      animation: 'msgFadeIn 0.25s ease-out',
    }}>
      {/* Avatar */}
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
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #2e5a27, #3d7a33)'
            : 'white',
          color: isUser ? 'white' : '#111827',
          fontSize: '0.92rem',
          lineHeight: 1.65,
          fontFamily: msg.content && /[\u0600-\u06ff]/.test(msg.content)
            ? '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif'
            : 'Inter, sans-serif',
          direction: isUser && /[\u0600-\u06ff]/.test(msg.content) ? 'rtl' : 'rtl',
          boxShadow: isUser
            ? '0 2px 8px rgba(46,90,39,.3)'
            : '0 1px 6px rgba(0,0,0,.08)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          border: isUser ? 'none' : '1px solid #f0f0f0',
          position: 'relative',
        }}>
          {msg.streaming && msg.content === '' ? <TypingDots /> : formatContent(msg.content)}
          {msg.streaming && msg.content !== '' && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: '#2e5a27', marginLeft: 2, verticalAlign: 'middle',
              animation: 'cursorBlink 0.7s step-end infinite'
            }} />
          )}
        </div>

        {/* Time */}
        {msg.time && !msg.streaming && (
          <div style={{
            fontSize: '0.67rem', color: '#9ca3af', marginTop: 3,
            padding: '0 4px',
            display: 'flex', alignItems: 'center', gap: 3
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
  const [language, setLanguage]         = useState('ur');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);
  const recognitionRef = useRef(null);
  const { isOffline }  = useOffline();

  const isBusy = isStreaming;

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      try { abortRef.current?.abort(); } catch {}
    };
  }, []);

  // ── Voice input ─────────────────────────────────────────────────────────────
  const toggleSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('آپ کا براؤزر آواز سپورٹ نہیں کرتا۔ Chrome استعمال کریں۔');
      return;
    }

    // Second tap → stop recording, finalize transcript
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      // Move interim text to input if any
      if (interimText.trim()) {
        setInput(prev => (prev + ' ' + interimText).trim());
        setInterimText('');
      }
      return;
    }

    // First tap → start recording
    const lang = LANGS.find(l => l.key === language)?.srLang || 'ur-PK';
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (e) => {
      let finalText  = '';
      let interim    = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      // Finalized words go to input, interim shown live
      if (finalText) setInput(prev => (prev + ' ' + finalText).trim());
      setInterimText(interim);
    };

    recognition.onerror = (e) => {
      console.warn('Speech error:', e.error);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, language, interimText]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isBusy) return;

    // Stop recording if active
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      setInterimText('');
    }

    if (isOffline) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg, time: new Date() },
        { role: 'assistant', content: '📵 انٹرنیٹ نہیں ہے — آن لائن ہونے پر پوچھیں', time: new Date() }
      ]);
      setInput('');
      return;
    }

    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setInterimText('');
    setShowQuickReplies(false);

    // Build history for context
    const history = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
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

      // Finalize
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: fullReply || '...', streaming: false, time: new Date() };
        return copy;
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.streaming) copy[copy.length - 1] = { ...last, streaming: false };
          return copy;
        });
      } else {
        // Fallback non-streaming
        try {
          const res2 = await fetch(`${API_URL}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ messages: history, language })
          });
          const data = await res2.json();
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: data.reply || data.error || 'جواب نہیں ملا', streaming: false, time: new Date() };
            return copy;
          });
        } catch {
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: '❌ نیٹ ورک مسئلہ — دوبارہ کوشش کریں', streaming: false, time: new Date() };
            return copy;
          });
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isBusy, isListening, isOffline, language, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    try { abortRef.current?.abort(); } catch {}
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

  const displayInput = input + (interimText ? (input ? ' ' : '') + interimText : '');
  const showMicOnly  = !input.trim() && !isListening; // WhatsApp: show mic when nothing typed

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 430, margin: '0 auto',
      background: '#ece5dd', // WhatsApp-like background
      position: 'relative', overflow: 'hidden'
    }}>

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

        {/* Text input */}
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
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: 24, border: 'none',
              background: 'white',
              fontSize: '.9rem', resize: 'none', outline: 'none',
              fontFamily: /[\u0600-\u06ff]/.test(input) ? '"Noto Nastaliq Urdu", serif' : 'Inter, sans-serif',
              direction: 'rtl',
              maxHeight: 120, overflowY: 'auto',
              boxShadow: '0 1px 4px rgba(0,0,0,.1)',
              color: isListening ? '#6b7280' : '#111827',
              lineHeight: 1.5,
              boxSizing: 'border-box'
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
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        /* Waveform bars */
        @keyframes waveBar1 { 0%,100%{height:4px} 50%{height:18px} }
        @keyframes waveBar2 { 0%,100%{height:8px} 50%{height:22px} }
        @keyframes waveBar3 { 0%,100%{height:6px} 50%{height:20px} }
        @keyframes waveBar4 { 0%,100%{height:14px} 50%{height:24px} }
        @keyframes waveBar5 { 0%,100%{height:6px} 50%{height:18px} }
        @keyframes waveBar6 { 0%,100%{height:8px} 50%{height:22px} }
        @keyframes waveBar7 { 0%,100%{height:4px} 50%{height:16px} }

        /* Hide scrollbar on quick replies */
        div::-webkit-scrollbar { height: 3px; width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
      `}</style>
    </div>
  );
}
