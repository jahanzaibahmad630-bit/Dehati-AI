import { useState } from 'react';

// PLRA Standard (Rural Punjab: 1 Karam = 5.5 ft)
const KARAM_FT = 5.5;
const SARSAHI_SQFT = 30.25;      // 5.5 x 5.5
const RURAL_MARLA_SQFT = 272.25; // 9 Sarsahis
const URBAN_MARLA_SQFT = 225.0;  // Lahore urban plot standard
const KANAL_SQFT = 5445.0;       // 20 Marlas (Rural)
const KILLA_SQFT = 43560.0;      // 8 Kanals (1 Acre)
const MURABBA_SQFT = 1089000.0;  // 25 Killas (200 Kanals)
const JAREEB_SQFT = 21780.0;     // 4 Kanals (0.5 Acre)

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function LandConverter() {
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('ایکڑ (قلعہ)');
  const [standard, setStandard] = useState('rural'); // 'rural' (272.25) | 'urban' (225)
  const [results, setResults] = useState(null);

  const marlaSqft = standard === 'rural' ? RURAL_MARLA_SQFT : URBAN_MARLA_SQFT;
  const kanalSqft = marlaSqft * 20;
  const killaSqft = kanalSqft * 8;
  const murabbaSqft = killaSqft * 25;
  const jareebSqft = kanalSqft * 4;

  const UNITS = {
    'مربع (Murabba)':     murabbaSqft,
    'ایکڑ (قلعہ)':         killaSqft,
    'جریب (Jareeb)':       jareebSqft,
    'کنال (Kanal)':        kanalSqft,
    'مرلہ (Marla)':        marlaSqft,
    'سرسائی (Sarsahi)':    SARSAHI_SQFT,
    'سکوئر فٹ (Sq Ft)':    1,
    'سکوئر گز (Sq Yards)': 9,
    'سکوئر میٹر (Sq M)':   10.7639,
  };

  const convert = () => {
    const v = parseFloat(value);
    if (!v || v <= 0) return;
    const baseSqft = v * UNITS[fromUnit];
    const r = {};
    Object.entries(UNITS).forEach(([unit, ratio]) => {
      r[unit] = (baseSqft / ratio);
    });
    setResults({ ...r, baseSqft, inputVal: v, fromUnit });
  };

  const fmt = (n) => {
    if (n >= 100000) return n.toLocaleString('en-PK', { maximumFractionDigits: 0 });
    if (n >= 1000)   return n.toLocaleString('en-PK', { maximumFractionDigits: 2 });
    if (n >= 1)      return n.toFixed(3);
    return n.toFixed(5);
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>📐</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>پٹوار لینڈ کیلکولیٹر و رقبہ کنورٹر</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>
            پنجاب لینڈ ریکارڈ اتھارٹی (PLRA) و بورڈ آف ریونیو معیارات
          </div>
        </div>
      </div>

      {/* Standard Selector: Rural vs Urban */}
      <div style={{ marginBottom: 12 }}>
        <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
          مرلہ پیمائش کا معیار:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            onClick={() => { setStandard('rural'); setResults(null); }}
            style={{
              padding: '8px', borderRadius: 8,
              border: `2px solid ${standard === 'rural' ? '#166534' : '#e2e8f0'}`,
              background: standard === 'rural' ? '#f0fdf4' : 'white',
              color: standard === 'rural' ? '#166534' : '#64748b',
              fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
            }}
          >
            🌾 دیہی زرعی / PLRA (272.25 sq ft)
          </button>
          <button
            onClick={() => { setStandard('urban'); setResults(null); }}
            style={{
              padding: '8px', borderRadius: 8,
              border: `2px solid ${standard === 'urban' ? '#b45309' : '#e2e8f0'}`,
              background: standard === 'urban' ? '#fffbeb' : 'white',
              color: standard === 'urban' ? '#b45309' : '#64748b',
              fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
            }}
          >
            🏙️ شہری لاہور پلاٹ (225 sq ft)
          </button>
        </div>
        {standard === 'rural' ? (
          <div style={{ fontSize: '.68rem', color: '#166534', marginTop: 4, fontWeight: 700 }}>
            ✓ زرعی اراضی، فردِ ملکیت اور کسان کارڈ کیلئے سرکاری طور پر 272.25 مربع فٹ مرلہ ہی استعمال ہوتا ہے۔
          </div>
        ) : (
          <div style={{ fontSize: '.68rem', color: '#b45309', marginTop: 4, fontWeight: 700 }}>
            ⚠️ شہری ہاؤسنگ سوسائٹیز میں 225 مربع فٹ مرلہ لاگو ہوتا ہے، زرعی فرد میں نہیں۔
          </div>
        )}
      </div>

      {/* Input & Unit Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>رقبے کی مقدار:</label>
          <input
            id="land-value" type="number" className="input" placeholder="1"
            value={value} min="0" step="any" dir="ltr"
            onChange={e => { setValue(e.target.value); setResults(null); }}
            style={{ width: '100%', padding: '.6rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Inter' }}
          />
        </div>
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>موجودہ اکائی:</label>
          <select
            id="land-unit" className="input" value={fromUnit}
            onChange={e => { setFromUnit(e.target.value); setResults(null); }}
            style={{ width: '100%', padding: '.6rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '.88rem', fontWeight: 800, background: 'white', ...nas }}
          >
            {Object.keys(UNITS).map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <button
        className="btn btn-primary btn-full" id="land-calc-btn"
        onClick={convert} disabled={!value}
        style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg, #15803d, #166534)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', ...nas }}
      >
        📐 تمام پٹواری اکائیوں میں تبدیل کریں
      </button>

      {/* Results */}
      {results && (
        <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
          {/* Main Converted Summary */}
          <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: '.78rem', opacity: .85 }}>
              {results.inputVal} {results.fromUnit} کا کل رقبہ:
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
              {Number(results.baseSqft).toLocaleString()} مربع فٹ
            </div>
            <div style={{ fontSize: '.72rem', color: '#bbf7d0', marginTop: 2 }}>
              ({(results.baseSqft / 9).toLocaleString(undefined, { maximumFractionDigits: 1 })} مربع گز | {(results.baseSqft / 10.7639).toLocaleString(undefined, { maximumFractionDigits: 1 })} مربع میٹر)
            </div>
          </div>

          {/* Patwari Units Grid */}
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ background: '#1e293b', color: 'white', padding: '8px 12px', fontWeight: 800, fontSize: '.85rem' }}>
              📜 سرکاری پٹوار اکائیاں (PLRA فرد تناسب):
            </div>
            <div style={{ padding: '4px 12px' }}>
              {[
                { name: 'مربع (Murabba = 25 قلعے)', val: results['مربع (Murabba)'], sub: '200 کنال' },
                { name: 'قلعہ / ایکڑ (Killa = 8 کنال)', val: results['ایکڑ (قلعہ)'], sub: '160 مرلے (36×40 کرم)' },
                { name: 'جریب (Jareeb = 4 کنال)', val: results['جریب (Jareeb)'], sub: 'آدھا ایکڑ (80 مرلے)' },
                { name: 'کنال (Kanal = 20 مرلے)', val: results['کنال (Kanal)'], sub: '5,445 مربع فٹ' },
                { name: 'مرلہ (Marla = 9 سرسائی)', val: results['مرلہ (Marla)'], sub: `${marlaSqft} مربع فٹ` },
                { name: 'سرسائی (Sarsahi = 1 مربع کرم)', val: results['سرسائی (Sarsahi)'], sub: '30.25 مربع فٹ (5.5×5.5 فٹ)' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx === 5 ? 'none' : '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.85rem' }}>{item.name}</div>
                    <div style={{ fontSize: '.68rem', color: '#64748b' }}>{item.sub}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#15803d', fontFamily: 'Inter' }} dir="ltr">
                      {fmt(item.val)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Karam Dimensions Card */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '.82rem', marginBottom: 4 }}>
              📏 پٹواری کرم کی لمبائی کا فارمولا (1 کرم = 5.5 فٹ):
            </div>
            <div style={{ fontSize: '.72rem', color: '#475569', lineHeight: 1.6 }}>
              • <strong>1 کرم:</strong> 5.5 فٹ (66 انچ یا 3 ہاتھ)<br />
              • <strong>1 قلعہ کی پیمائش:</strong> 36 کرم لمبائی (198 فٹ) ضرب 40 کرم چوڑائی (220 فٹ) = 1,440 مربع کرم = 43,560 مربع فٹ (1 ایکڑ)۔
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
