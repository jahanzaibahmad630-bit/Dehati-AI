import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',         icon: '🏠', label: 'گھر',      id: 'nav-home' },
  { path: '/disease',  icon: '🔬', label: 'بیماری',   id: 'nav-disease' },
  { path: '/weather',  icon: '🌤️', label: 'موسم',     id: 'nav-weather' },
  { path: '/schemes',  icon: '📋', label: 'اسکیمیں',  id: 'nav-schemes' },
  { path: '/chat',     icon: '💬', label: 'چیٹ',      id: 'nav-chat' },
  { path: '/more',     icon: '⚙️', label: 'مزید',     id: 'nav-more' },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label="مرکزی نیویگیشن"
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            id={item.id}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            // Android-specific touch optimizations
            style={{
              // Explicit 48px minimum touch target (Android WCAG 2.5.5)
              minHeight: 48,
              minWidth: 48,
              // Remove 300ms tap delay on Android Chrome
              touchAction: 'manipulation',
              // Remove grey tap highlight square on Android
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span className={`nav-icon${isActive ? ' active' : ''}`}>
              {item.icon}
              {/* Active dot indicator */}
              {isActive && <span className="nav-active-dot" aria-hidden="true" />}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
