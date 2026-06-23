import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { AuthContext } from './AuthContextCore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('dehati_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('dehati_token'));
  const [loading] = useState(false);

  useEffect(() => {
  }, []);

  const saveSession = (token, user) => {
    localStorage.setItem('dehati_token', token);
    localStorage.setItem('dehati_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const register = async (name, phone, district, landSize, password) => {
    const data = await api.register({ name, phone, district, landSize, password });
    saveSession(data.token, data.user);
    return data;
  };

  const login = async (phone, password) => {
    const data = await api.login({ phone, password });
    saveSession(data.token, data.user);
    return data;
  };

  const guestLogin = async () => {
    const data = await api.guestLogin();
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

