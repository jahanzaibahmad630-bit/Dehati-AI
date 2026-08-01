import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

import { API_URL } from '../config';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decode JWT payload (no crypto — just parse base64) to check expiry
  function isTokenExpired(token) {
    try {
      let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while(b64.length%4)b64+='='; const payload = JSON.parse(atob(b64));
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
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, district, landSize, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رجسٹریشن ناکام');
      saveSession(data.token, data.user);
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('انٹرنیٹ یا سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں یا "مہمان لاگ ان" استعمال کریں۔');
      }
      throw err;
    }
  };

  const login = async (phone, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'لاگ ان ناکام');
      saveSession(data.token, data.user);
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('انٹرنیٹ یا سرور کا مسئلہ ہے');
      throw err;
    }
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
