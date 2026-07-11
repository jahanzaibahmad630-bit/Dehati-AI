import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('dehati_admin_token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1a08 0%, #162410 40%, #2e5a27 100%)',
      padding: '1.5rem', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255,255,255,.97)', borderRadius: 24, padding: '2.5rem 2rem',
        width: '100%', maxWidth: 380, boxShadow: '0 25px 60px rgba(0,0,0,.4)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, background: 'linear-gradient(135deg, #2e5a27, #3a7232)',
            borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', marginBottom: '1rem', boxShadow: '0 8px 24px rgba(46,90,39,.35)'
          }}>🌾</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#162410', margin: 0 }}>DehatiAI Admin</h1>
          <p style={{ color: '#666', fontSize: '.875rem', marginTop: '.3rem' }}>Management Panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: '#374151', marginBottom: '.4rem' }}>
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@dehati.ai"
              required
              style={{
                width: '100%', padding: '.75rem 1rem', borderRadius: 10,
                border: '2px solid #e5e7eb', fontSize: '.95rem', outline: 'none',
                transition: 'border-color .2s', boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif'
              }}
              onFocus={e => e.target.style.borderColor = '#2e5a27'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 700, color: '#374151', marginBottom: '.4rem' }}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '.75rem 1rem', borderRadius: 10,
                border: '2px solid #e5e7eb', fontSize: '.95rem', outline: 'none',
                transition: 'border-color .2s', boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif'
              }}
              onFocus={e => e.target.style.borderColor = '#2e5a27'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626', padding: '.75rem 1rem',
              borderRadius: 10, fontSize: '.875rem', fontWeight: 600, marginBottom: '1rem',
              border: '1px solid #fecaca'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '.9rem', borderRadius: 10, border: 'none',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2e5a27, #3a7232)',
              color: 'white', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .2s', fontFamily: 'Inter, sans-serif',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(46,90,39,.4)'
            }}
          >
            {loading ? 'Signing in...' : '🔐 Sign In to Admin'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.78rem', color: '#9ca3af' }}>
          DehatiAI &copy; {new Date().getFullYear()} — Authorised Personnel Only
        </p>

      </div>
    </div>
  );
}
