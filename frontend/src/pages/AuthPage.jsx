import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const DISTRICTS = [
  'لاہور', 'فیصل آباد', 'راولپنڈی', 'گجرانوالہ', 'ملتان', 'سیالکوٹ',
  'بہاولپور', 'سرگودھا', 'شیخوپورہ', 'جھنگ', 'رحیم یار خان', 'گجرات',
  'قصور', 'اوکاڑہ', 'ساہیوال', 'ڈیرہ غازی خان', 'میانوالی', 'چنیوٹ',
  'حافظ آباد', 'مظفرگڑھ', 'وہاڑی', 'خانیوال', 'پاکپتن', 'اٹک',
  'چکوال', 'جہلم', 'نارووال', 'ننکانہ صاحب', 'ٹوبہ ٹیک سنگھ',
  'بھکر', 'بہاولنگر', 'خوشاب', 'لیہ', 'لودھراں', 'منڈی بہاؤالدین', 'راجن پور'
];

export default function AuthPage() {
  const { register, login, guestLogin } = useAuth();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regLand, setRegLand] = useState('');
  const [regPass, setRegPass] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginPhone, loginPass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(regName, regPhone, regDistrict, regLand, regPass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await guestLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)', direction: 'rtl' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(145deg, var(--green-900) 0%, var(--green-800) 60%, var(--green-700) 100%)',
        padding: '3rem 1.5rem 2rem',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '.75rem' }}>🌾</div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'white', direction: 'ltr', letterSpacing: '-.02em' }}>DehatiAI</h1>
        <p style={{ opacity: .85, fontSize: '.95rem', marginTop: '.3rem' }}>کسان کا ذہین ساتھی</p>
        <div className="truck-art-border" style={{ marginTop: '1.5rem', borderRadius: '2px' }} />
      </div>

      {/* Form Card */}
      <div style={{ padding: '1.25rem', maxWidth: '400px', margin: '0 auto' }}>
        <div className="card" style={{ marginTop: '-1rem' }}>
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
              id="auth-tab-login"
            >
              لاگ ان
            </button>
            <button
              className={`auth-tab${tab === 'register' ? ' active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
              id="auth-tab-register"
            >
              نیا اکاؤنٹ
            </button>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-light)', color: 'var(--danger)',
              padding: '.75rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '.875rem', marginBottom: '1rem', fontWeight: 700
            }}>
              ⚠️ {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="form-group">
              <div>
                <label className="input-label" htmlFor="login-phone">فون نمبر</label>
                <input
                  id="login-phone"
                  type="tel"
                  className="input input-number"
                  placeholder="03001234567"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="input-label" htmlFor="login-pass">پاسورڈ</label>
                <input
                  id="login-pass"
                  type="password"
                  className="input"
                  placeholder="پاسورڈ درج کریں"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="login-submit-btn">
                {loading ? '...' : '✓ لاگ ان کریں'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-group">
              <div>
                <label className="input-label" htmlFor="reg-name">پورا نام</label>
                <input id="reg-name" type="text" className="input" placeholder="محمد علی" value={regName} onChange={e => setRegName(e.target.value)} required />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-phone">فون نمبر</label>
                <input id="reg-phone" type="tel" className="input input-number" placeholder="03001234567" value={regPhone} onChange={e => setRegPhone(e.target.value)} required dir="ltr" />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-district">ضلع</label>
                <select id="reg-district" className="input" value={regDistrict} onChange={e => setRegDistrict(e.target.value)}>
                  <option value="">ضلع منتخب کریں</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label" htmlFor="reg-land">زمین (ایکڑ)</label>
                <input id="reg-land" type="number" className="input input-number" placeholder="5" value={regLand} onChange={e => setRegLand(e.target.value)} min="0" step="0.5" dir="ltr" />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-pass">پاسورڈ</label>
                <input id="reg-pass" type="password" className="input" placeholder="کم از کم 6 حروف" value={regPass} onChange={e => setRegPass(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="register-submit-btn">
                {loading ? '...' : '✓ اکاؤنٹ بنائیں'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>— یا —</div>

          <button
            className="btn btn-outline btn-full"
            onClick={handleGuest}
            disabled={loading}
            id="guest-login-btn"
          >
            👤 مہمان کی طرح جاری رکھیں
          </button>

          <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--text-light)', marginTop: '.75rem' }}>
            مہمان موڈ میں پروفائل محفوظ نہیں ہوگا
          </p>
        </div>
      </div>
    </div>
  );
}
