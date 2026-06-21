import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'گھر', id: 'nav-home' },
  { path: '/disease', icon: '🔬', label: 'بیماری', id: 'nav-disease' },
  { path: '/weather', icon: '🌤️', label: 'موسم', id: 'nav-weather' },
  { path: '/schemes', icon: '📋', label: 'اسکیمیں', id: 'nav-schemes' },
  { path: '/chat', icon: '💬', label: 'چیٹ', id: 'nav-chat' },
  { path: '/more', icon: '⚙️', label: 'مزید', id: 'nav-more' }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="مرکزی نیویگیشن">
      {NAV_ITEMS.map(item => (
        <button
          key={item.path}
          id={item.id}
          className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
          onClick={() => navigate(item.path)}
          aria-label={item.label}
          aria-current={location.pathname === item.path ? 'page' : undefined}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
