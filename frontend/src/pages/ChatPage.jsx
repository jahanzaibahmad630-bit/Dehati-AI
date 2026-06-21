import { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/api';
import { useOffline } from '../hooks/useOffline';
import AIDisclaimer from '../components/ui/AIDisclaimer';

const QUICK_REPLIES = [
  'کھاد کی سلاح دیں',
  'فصل کو پانی کب دیں',
  'سرکاری قرضہ کیسے لیں',
  'بیماری کی وجہ بتائیں',
  'منڈی کی قیمتیں'
];

const LANGS = [
  { key: 'ur', label: 'اردو' },
  { key: 'pj', label: 'پنجابی' },
  { key: 'en', label: 'English' }
];

function formatTime(date) {
  return date.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'سلام گوالاں 👋 میں DehatiAI ہوں — آپ کی فصل یا زراعت کی کسی بھی بات پوچھیں!', time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('ur');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const { isOffline } = useOffline();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const msg = text.trim();
    if (!msg) return;

    if (isOffline) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg, time: new Date() },
        { role: 'assistant', content: '📵 انٹرنیٹ نہیں ہے — آن لائن ہونے پر جواب ملے گا', time: new Date() }
      ]);
      return;
    }

    const newMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = [...messages, newMsg].slice(-8).map(m => ({ role: m.role, content: m.content }));
      const data = await chatWithAI(history, language);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, time: new Date() }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ جواب نہیں آیا — دوبارہ کوشش کریں',
        time: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'سلام گوالاں 👋 میں DehatiAI ہوں — آپ کی فصل یا زراعت کی کسی بھی بات پوچھیں!', time: new Date() }]);
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      {/* Top bar */}
      <div style={{ padding: '.5rem 1rem', background: 'var(--green-100)', display: 'flex', gap: '.4rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {LANGS.map(l => (
            <button
              key={l.key}
              className={`chip${language === l.key ? ' active' : ''}`}
              onClick={() => setLanguage(l.key)}
              id={`chat-lang-${l.key}`}
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
          >
            🗑
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '.75rem',
        paddingBottom: '9rem'
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end'
            }}
          >
            <div className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
              {msg.content}
            </div>
            <div
              className="bubble-time"
              style={{ alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end', paddingInline: '.5rem' }}
            >
              {msg.time && formatTime(msg.time)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="chat-bubble bubble-ai">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div style={{
        padding: '.4rem 1rem', borderTop: '1px solid var(--green-100)',
        background: 'var(--cream)',
        position: 'fixed', bottom: 'calc(var(--nav-height) + 58px)',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px'
      }}>
        <div className="chips-scroll">
          {QUICK_REPLIES.map((r, i) => (
            <button
              key={i}
              className="chip"
              style={{ fontSize: '.78rem' }}
              onClick={() => sendMessage(r)}
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
        display: 'flex', gap: '.5rem',
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px'
      }}>
        <input
          id="chat-input"
          className="input"
          style={{ flex: 1 }}
          placeholder="کوئی سوال لکھیں..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          id="chat-send-btn"
          aria-label="بھیجیں"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
