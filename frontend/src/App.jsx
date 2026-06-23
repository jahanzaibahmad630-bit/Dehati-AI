import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
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
      <PrivacyNotice />
      <main>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/disease" element={<ProtectedRoute><DiseasePage /></ProtectedRoute>} />
          <Route path="/weather" element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />
          <Route path="/schemes" element={<ProtectedRoute><SchemesPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/more" element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
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
