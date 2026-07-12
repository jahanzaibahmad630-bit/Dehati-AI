import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decode JWT payload (no crypto — just parse base64) to check expiry
  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp && payload.exp * 1000 < Date.now();
    } catch {
      return true; // malformed token → treat as expired
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('dehati_token');
    const savedUser  = localStorage.getItem('dehati_user');
    if (savedToken && savedUser) {
      if (isTokenExpired(savedToken)) {
        // Token expired while offline — clear session, send to login
        localStorage.removeItem('dehati_token');
        localStorage.removeItem('dehati_user');
      } else {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('dehati_token');
          localStorage.removeItem('dehati_user');
        }
      }
    }
    setLoading(false);
  }, []);

  const saveSession = (token, user) => {
    localStorage.setItem('dehati_token', token);
    localStorage.setItem('dehati_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const register = async (name, phone, district, landSize, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, district, landSize, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'رجسٹریشن ناکام');
    saveSession(data.token, data.user);
    return data;
  };

  const login = async (phone, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'لاگ ان ناکام');
    saveSession(data.token, data.user);
    return data;
  };

  const guestLogin = async () => {
    const res = await fetch(`${API_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'مہمان لاگ ان ناکام');
    saveSession(data.token, data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('dehati_token');
    localStorage.removeItem('dehati_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('dehati_user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated: !!token,
      isGuest: user?.isGuest || false,
      register, login, guestLogin, logout, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
