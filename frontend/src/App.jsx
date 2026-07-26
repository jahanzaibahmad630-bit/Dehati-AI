import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import OfflineBanner from './components/ui/OfflineBanner';
import PrivacyNotice from './components/ui/PrivacyNotice';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import DiseasePage from './pages/DiseasePage';
import WeatherPage from './pages/WeatherPage';
import SchemesPage from './pages/SchemesPage';
import ChatPage from './pages/ChatPage';
import MorePage from './pages/MorePage';
import CropsPage from './pages/CropsPage';
import PriceAlertPage from './pages/PriceAlertPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import AnnouncementBanner from './components/ui/AnnouncementBanner';
import EmergencyAlertBanner from './components/EmergencyAlertBanner';
import InstallBanner from './components/ui/InstallBanner';


// ── Admin Shell (completely isolated — no farmer Header/Nav) ──────────────────
function AdminShell() {
  const [adminToken, setAdminToken] = useState(
    () => sessionStorage.getItem('dehati_admin_token') || ''
  );

  const handleLogin  = (token) => setAdminToken(token);
  const handleLogout = () => { setAdminToken(''); };

  if (!adminToken) return <AdminLogin onLogin={handleLogin} />;
  return <AdminPanel onLogout={handleLogout} />;
}

// ── Farmer App Shell ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <div className="loading-container">
          <div className="spinner" />
          <p>لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function AppShell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <OfflineBanner />
      <EmergencyAlertBanner />
      <AnnouncementBanner />
      <PrivacyNotice />

      <main>
        <Routes>
          <Route path="/"             element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/disease"      element={<ProtectedRoute><DiseasePage /></ProtectedRoute>} />
          <Route path="/weather"      element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />
          <Route path="/schemes"      element={<ProtectedRoute><SchemesPage /></ProtectedRoute>} />
          <Route path="/chat"         element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/more"         element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
          <Route path="/crops"        element={<ProtectedRoute><CropsPage /></ProtectedRoute>} />
          <Route path="/price-alert"  element={<ProtectedRoute><PriceAlertPage /></ProtectedRoute>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <InstallBanner />
    </div>
  );
}

// ── Root: split admin vs farmer ───────────────────────────────────────────────
export default function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');

  // ── Auto-reload when new service worker is ready (skipWaiting already set) ──
  // This ensures mobile users always get the latest version immediately
  useRegisterSW({
    onNeedRefresh() {
      // New SW is waiting — reload right away (skipWaiting handles the rest)
      window.location.reload();
    },
    onOfflineReady() {
      console.log('DehatiAI ready for offline use');
    },
    onRegisteredSW(swUrl, r) {
      // Check for SW updates every 60 seconds
      if (r) {
        setInterval(() => { r.update().catch(() => {}); }, 60 * 60 * 1000); // 1 hour (was 60s — too aggressive)
      }
    }
  });

  if (isAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/admin*" element={<AdminShell />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
