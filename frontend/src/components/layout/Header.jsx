import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useOffline } from '../../hooks/useOffline';

export default function Header({ title, showBack = false, rightAction }) {
  const navigate = useNavigate();
  const { largeText, toggleLargeText } = useLanguage();
  const { isOffline } = useOffline();

  return (
    <header className="header" role="banner">
      <div className="header-logo">
        <div className="header-logo-icon" aria-hidden="true">🌾</div>
        <div>
          <div className="header-title" dir="ltr">DehatiAI</div>
          <div className="header-subtitle">کسان کا ذہین ساتھی</div>
        </div>
      </div>

      <div className="header-actions">
        {isOffline && (
          <span
            style={{
              background: 'rgba(255,200,0,0.25)',
              border: '1px solid rgba(255,200,0,0.5)',
              color: '#ffd700',
              borderRadius: '20px',
              padding: '3px 8px',
              fontSize: '.68rem',
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif'
            }}
            title="انٹرنیٹ بند ہے"
          >
            ✕ آف لائن
          </span>
        )}
        <button
          id="header-large-text-toggle"
          onClick={toggleLargeText}
          style={{
            background: largeText ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            color: 'white',
            padding: '4px 10px',
            fontSize: '.75rem',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            transition: 'all .2s ease'
          }}
          title={largeText ? 'چھوٹا متن' : 'بڑا متن'}
          aria-label={largeText ? 'چھوٹا متن کریں' : 'بڑا متن کریں'}
        >
          {largeText ? 'A-' : 'A+'}
        </button>
        {rightAction}
      </div>
    </header>
  );
}
