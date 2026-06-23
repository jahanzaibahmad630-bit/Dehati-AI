import { useState, useRef, useEffect, useCallback } from 'react';
import { useOffline } from '../hooks/useOffline';
import AIDisclaimer from '../components/ui/AIDisclaimer';

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
  { key: 'ur', label: 'اردو' },
  { key: 'pj', label: 'پنجابی' },
  { key: 'en', label: 'English' }
];

function formatTime(date) {
  return date.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
}

function TypingDots() {
  return (
    <div className="typing-indicator">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'سلام! 👋 میں DehatiAI ہوں — آپ کا زرعی ساتھی۔\nفصل، کھاد، بیماری، موسم — کچھ بھی پوچھیں! 🌾',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('ur');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const { isOffline } = useOffline();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text) => {
    const msg = text.trim();
    if (!msg || isStreaming) return;

    if (isOffline) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg, time: new Date() },
        { role: 'assistant', content: '📵 انٹرنیٹ نہیں ہے — آن لائن ہونے پر پوچھیں', time: new Date() }
      ]);
      return;
    }

    const userMsg = { role: 'user', content: msg, time: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    // Keep last 10 messages for context
    const history = updatedMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      // Try streaming first
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

      // Add empty assistant message to stream into
      const assistantMsg = { role: 'assistant', content: '', time: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
      setIsStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              fullReply = parsed.error;
            } else if (parsed.text) {
              fullReply += parsed.text;
            }
            // Update last message in real-time
            setMessages(prev => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullReply };
              return msgs;
            });
          } catch {}
        }
      }

      if (!fullReply) {
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: '⚠️ جواب نہیں آیا — دوبارہ کوشش کریں' };
          return msgs;
        });
      }

    } catch (err) {
      if (err.name === 'AbortError') return;

      // Fallback to non-streaming
      try {
        const res2 = await fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({ messages: history, language })
        });
        const data = await res2.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply || '⚠️ جواب نہیں ملا',
          time: new Date()
        }]);
      } catch {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ جواب نہیں آیا — دوبارہ کوشش کریں',
          time: new Date()
        }]);
      }
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, language, isOffline, isStreaming]);

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setIsStreaming(false);
    setIsTyping(false);
    setMessages([{
      role: 'assistant',
      content: 'سلام! 👋 میں DehatiAI ہوں — آپ کا زرعی ساتھی۔\nفصل، کھاد، بیماری، موسم — کچھ بھی پوچھیں! 🌾',
      time: new Date()
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isBusy = isTyping || isStreaming;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      {/* Top bar */}
      <div style={{
        padding: '.5rem 1rem',
        background: 'var(--green-100)',
        display: 'flex',
        gap: '.4rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {LANGS.map(l => (
            <button
              key={l.key}
              className={`chip${language === l.key ? ' active' : ''}`}
              onClick={() => setLanguage(l.key)}
              id={`chat-lang-${l.key}`}
              disabled={isBusy}
              style={{ fontSize: '.78rem', padding: '.3rem .7rem', minHeight: '30px' }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <AIDisclaimer small />
          <button
            className="btn btn-ghost btn-sm"
            onClick={clearChat}
            style={{ fontSize: '.75rem', minHeight: '28px', padding: '.2rem .5rem', color: 'var(--text-muted)' }}
            id="chat-clear-btn"
            title="گفتگو صاف کریں"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.75rem',
        paddingBottom: '9.5rem'
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end'
            }}
          >
            <div
              className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}
              style={{
                whiteSpace: 'pre-wrap',
                position: 'relative'
              }}
            >
              {msg.content || (isStreaming && i === messages.length - 1 ? <TypingDots /> : '')}
              {/* Streaming cursor */}
              {isStreaming && i === messages.length - 1 && msg.content && (
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1em',
                  background: 'currentColor',
                  marginRight: '2px',
                  animation: 'blink 0.8s infinite',
                  verticalAlign: 'text-bottom'
                }} />
              )}
            </div>
            <div
              className="bubble-time"
              style={{ alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end', paddingInline: '.5rem' }}
            >
              {msg.time && formatTime(msg.time)}
              {isStreaming && i === messages.length - 1 && (
                <span style={{ marginRight: '.3rem', color: 'var(--green-600)', fontSize: '.65rem' }}> • تحریر ہو رہا ہے...</span>
              )}
            </div>
          </div>
        ))}

        {isTyping && !isStreaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="chat-bubble bubble-ai">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{
        padding: '.4rem 1rem',
        borderTop: '1px solid var(--green-100)',
        background: 'var(--cream)',
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + 58px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        flexShrink: 0
      }}>
        <div className="chips-scroll">
          {QUICK_REPLIES.map((r, i) => (
            <button
              key={i}
              className="chip"
              style={{ fontSize: '.78rem', opacity: isBusy ? 0.5 : 1 }}
              onClick={() => sendMessage(r)}
              disabled={isBusy}
              id={`quick-reply-${i}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: '.6rem 1rem',
        paddingBottom: 'calc(var(--nav-height) + .6rem)',
        background: 'white',
        borderTop: '1px solid var(--green-100)',
        display: 'flex',
        gap: '.5rem',
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px'
      }}>
        <input
          ref={inputRef}
          id="chat-input"
          className="input"
          style={{ flex: 1 }}
          placeholder={isBusy ? 'جواب آ رہا ہے...' : 'کوئی سوال لکھیں...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isBusy}
          id="chat-send-btn"
          aria-label="بھیجیں"
        >
          {isBusy ? '⏳' : '▶'}
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
