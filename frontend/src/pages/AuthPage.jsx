import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DISTRICTS = [
  'لاہور', 'فیصل آباد', 'راولپنڈی', 'گجرانوالہ', 'ملتان', 'سیالکوٹ',
  'بہاولپور', 'سرگودھا', 'شیخوپورہ', 'جھنگ', 'رحیم یار خان', 'گجرات',
  'قصور', 'اوکاڑہ', 'ساہیوال', 'ڈیرہ غازی خان', 'میانوالی', 'چنیوٹ',
  'حافظ آباد', 'مظفرگڑھ', 'وہاڑی', 'خانیوال', 'پاکپتن', 'اٹک',
  'چکوال', 'جہلم', 'نارووال', 'ننکانہ صاحب', 'ٹوبہ ٹیک سنگھ'
];

const FEATURES = [
  { icon: '🌾', text: 'AARI مصدقہ کھاد نسخہ' },
  { icon: '🐛', text: 'بیماری و کیڑے تشخیص' },
  { icon: '📈', text: 'لائیو منڈی قیمتیں' },
  { icon: '🌤️', text: 'سپرے ونڈو موسم' },
  { icon: '🐄', text: 'جانور صحت مشورہ' },
  { icon: '📊', text: 'فصل موازنہ کیلکولیٹر' },
];

function normalizePhone(raw) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) {
    return '0' + digits;
  }
  return raw.trim();
}

export default function AuthPage() {
  const { register, login } = useAuth();
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
      await login(normalizePhone(loginPhone), loginPass);
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
      await register(regName, normalizePhone(regPhone), regDistrict, regLand, regPass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(145deg, var(--green-900) 0%, var(--green-800) 60%, var(--green-700) 100%)',
        padding: '2.5rem 1.5rem 1.75rem',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>🌾</div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'white', direction: 'ltr', letterSpacing: '-.02em', margin: 0 }}>DehatiAI</h1>
        <p style={{ opacity: .85, fontSize: '.95rem', marginTop: '.3rem', marginBottom: '1rem' }}>کسان کا ذہین ساتھی</p>

        {/* Feature chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', justifyContent: 'center', marginTop: '.5rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 20, padding: '3px 10px', fontSize: '.68rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {f.icon} {f.text}
            </div>
          ))}
        </div>
        <div className="truck-art-border" style={{ marginTop: '1.25rem', borderRadius: '2px' }} />
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
            <form onSubmit={handleLogin} className="form-group" dir="rtl">
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
                  style={{ textAlign: 'left' }}
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
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="login-submit-btn">
                {loading ? '...' : '✓ لاگ ان کریں'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: '.5rem', direction: 'rtl' }}>
                اکاؤنٹ نہیں ہے؟ &nbsp;
                <button type="button" onClick={() => { setTab('register'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 800, cursor: 'pointer', fontSize: '.75rem', padding: 0 }}>
                  ابھی رجسٹر کریں
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-group" dir="rtl">
              <div>
                <label className="input-label" htmlFor="reg-name">پورا نام</label>
                <input
                  id="reg-name" type="text" className="input"
                  placeholder="محمد علی / Ali Ahmed"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                  dir="auto"
                />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-phone">فون نمبر</label>
                <input
                  id="reg-phone" type="tel" className="input input-number"
                  placeholder="03001234567"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  required dir="ltr" style={{ textAlign: 'left' }}
                />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-district">ضلع</label>
                <select id="reg-district" className="input" dir="rtl" value={regDistrict} onChange={e => setRegDistrict(e.target.value)}>
                  <option value="">ضلع منتخب کریں</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label" htmlFor="reg-land">زمین (ایکڑ)</label>
                <input
                  id="reg-land" type="number" className="input input-number"
                  placeholder="5"
                  value={regLand}
                  onChange={e => setRegLand(e.target.value)}
                  min="0" step="0.5" dir="ltr" style={{ textAlign: 'left' }}
                />
              </div>
              <div>
                <label className="input-label" htmlFor="reg-pass">پاسورڈ</label>
                <input
                  id="reg-pass" type="password" className="input"
                  placeholder="کم از کم 6 حروف"
                  value={regPass}
                  onChange={e => setRegPass(e.target.value)}
                  required minLength={6}
                  dir="ltr" style={{ textAlign: 'left' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="register-submit-btn">
                {loading ? '...' : '✓ مفت اکاؤنٹ بنائیں'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--text-secondary)', direction: 'rtl', marginTop: '.5rem', lineHeight: 1.5 }}>
                ✅ مفت | 🔒 محفوظ | 📴 آف لائن بھی کام کرتا ہے
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
