import { useState, useEffect } from 'react';

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

const SOIL_PARAMS = [
  { key: 'pH', label: 'pH (پی ایچ)', unit: '', placeholder: '7.2', min: 4, max: 10, ideal: [7.0, 7.8],
    low: 'مٹی تیزابی — زرعی چونا 200 کلو فی ایکڑ', high: 'قلوی/کلراٹھی — جپسم 400 کلو + سبز کھاد', ok: 'pH بہترین' },
  { key: 'ec', label: 'EC برقی موصلیت (mS/cm)', unit: 'mS/cm', placeholder: '1.8', min: 0, max: 20, ideal: [0, 2.0],
    low: 'EC نارمل', high: 'نمکیاتی زمین — یوریا کم کریں، پہلے آبپاشی سے نمک بہائیں', ok: 'EC نارمل' },
  { key: 'om', label: 'نامیاتی مادہ OM (%)', unit: '%', placeholder: '0.8', min: 0, max: 10, ideal: [1.0, 3.0],
    low: 'کم — گوبر 2-3 ٹرالی یا سبز کھاد', high: 'کافی', ok: 'بہترین' },
  { key: 'n', label: 'نائٹروجن N (%)', unit: '%', placeholder: '0.06', min: 0, max: 1, ideal: [0.05, 0.15],
    low: 'کم — یوریا 0.5 بوری اضافی', high: 'زیادہ — یوریا کم کریں', ok: 'مناسب' },
  { key: 'p', label: 'فاسفورس P (ppm)', unit: 'ppm', placeholder: '12', min: 0, max: 100, ideal: [8, 16],
    low: 'کم — DAP یا SSP ضروری', high: 'کافی — DAP نہ ڈالیں (PKR 8,500 بچت)', ok: 'مناسب' },
  { key: 'k', label: 'پوٹاش K (ppm)', unit: 'ppm', placeholder: '150', min: 0, max: 500, ideal: [120, 200],
    low: 'کم — SOP 1 بوری بوائی پر', high: 'کافی — SOP نہ ڈالیں', ok: 'مناسب' },
  { key: 'zn', label: 'زنک Zn (ppm)', unit: 'ppm', placeholder: '0.8', min: 0, max: 10, ideal: [0.8, 3.0],
    low: 'بہت کم — زنک سلفیٹ 8-10 کلو لازمی', high: 'کافی', ok: 'مناسب' },
];

function getStatus(param, val) {
  if (val === '' || val === null || isNaN(parseFloat(val))) return 'empty';
  const v = parseFloat(val);
  if (v < param.ideal[0]) return 'low';
  if (v > param.ideal[1]) return 'high';
  return 'ok';
}

const STATUS_COLORS = {
  ok:    { bg: '#f0fdf4', border: '#86efac', text: '#15803d', dot: '#22c55e' },
  low:   { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },
  high:  { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
  empty: { bg: '#f9fafb', border: '#e5e7eb', text: '#9ca3af', dot: '#d1d5db' },
};

function getSoilAdvice(profile) {
  if (!profile) return { flags: [], savings: [], adjustments: {} };
  const flags = []; const savings = []; const adjustments = {};
  const { pH, ec, om, n, p, k, zn } = profile;
  if (pH && pH > 8.0)  { flags.push({ level: 'critical', msg: 'جپسم (Gypsum 80-mesh) 400-800 کلو فی ایکڑ — کاشت سے 3 ہفتے پہلے' }); adjustments.gypsum = true; }
  if (pH && pH < 6.5)  { flags.push({ level: 'warning',  msg: 'زرعی چونا 200 کلو فی ایکڑ' }); }
  if (ec && ec > 4.0)  { flags.push({ level: 'critical', msg: 'نمکیاتی زمین — یوریا 20% کم کریں، پہلے آبپاشی' }); adjustments.reduceUrea = 0.2; }
  if (om && om < 0.5)  { flags.push({ level: 'warning',  msg: 'گوبر کی کھاد 2-3 ٹرالی یا سبز کھاد (جنتر) ڈالیں' }); adjustments.needsFYM = true; }
  if (n  && n < 0.05)  { flags.push({ level: 'warning',  msg: 'نائٹروجن کم — یوریا 0.5 بوری اضافی' }); adjustments.extraUrea = 0.5; }
  if (p  && p > 14)    { flags.push({ level: 'success',  msg: 'فاسفورس کافی ہے — DAP بالکل نہ ڈالیں' }); savings.push('DAP بچت: PKR 8,500 فی بوری'); adjustments.skipDAP = true; }
  if (k  && k > 180)   { flags.push({ level: 'success',  msg: 'پوٹاش کافی ہے — SOP کی ضرورت نہیں' }); savings.push('SOP بچت: PKR 9,500 فی بوری'); adjustments.skipSOP = true; }
  if (zn && zn < 0.5)  { flags.push({ level: 'critical', msg: 'زنک بہت کم — زنک سلفیٹ 8-10 کلو فی ایکڑ لازمی' }); adjustments.doubleZinc = true; }
  if (flags.length === 0) flags.push({ level: 'success', msg: 'آپ کی مٹی بہترین حالت میں ہے — معیاری کھاد جاری رکھیں' });
  return { flags, savings, adjustments };
}

export const SOIL_STORAGE_KEY = 'dehati_soil_profile_v1';

export function getSavedSoilProfile() {
  try { const s = localStorage.getItem(SOIL_STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

export function buildSoilContextBlock(profile) {
  if (!profile) return '';
  return [
    '',
    '',
    '[کسان کا ذاتی لیبارٹری مٹی ٹیسٹ ریکارڈ]:',
    'pH: ' + (profile.pH || '?') + ' | EC: ' + (profile.ec || '?') + ' mS/cm | نامیاتی مادہ: ' + (profile.om || '?') + '%',
    'نائٹروجن: ' + (profile.n || '?') + '% | فاسفورس: ' + (profile.p || '?') + ' ppm | پوٹاش: ' + (profile.k || '?') + ' ppm | زنک: ' + (profile.zn || '?') + ' ppm',
    '(تمام کھاد اور فصلی سفارشات اس ذاتی ڈیٹا کے مطابق دیں)'
  ].join('\n');
}

import InstitutionalBadge from '../ui/InstitutionalBadge';

export default function SoilProfile() {
  const [values, setValues] = useState({ pH: '', ec: '', om: '', n: '', p: '', k: '', zn: '' });
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(null);
  const [showAdvice, setShowAdvice] = useState(false);

  useEffect(() => {
    const profile = getSavedSoilProfile();
    if (profile) { setExisting(profile); setValues(profile); setShowAdvice(true); }
  }, []);

  const numericValues = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v !== '' ? parseFloat(v) : null])
  );
  const advice = showAdvice || Object.values(values).some(v => v !== '')
    ? getSoilAdvice(numericValues) : null;

  const handleSave = () => {
    const profile = { ...values, savedAt: new Date().toLocaleDateString('ur-PK') };
    localStorage.setItem(SOIL_STORAGE_KEY, JSON.stringify(profile));
    setSaved(true); setExisting(profile); setShowAdvice(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = () => {
    localStorage.removeItem(SOIL_STORAGE_KEY);
    setValues({ pH: '', ec: '', om: '', n: '', p: '', k: '', zn: '' });
    setExisting(null); setShowAdvice(false);
  };

  const anyFilled = Object.values(values).some(v => v !== '');

  return (
    <div dir="rtl" style={{ ...nas }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#166534)', borderRadius: 14, padding: '1rem 1.2rem', marginBottom: 14, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>🔬 میری مٹی کا پروفائل</div>
            <div style={{ fontSize: '0.72rem', color: '#86efac', marginTop: 3 }}>
              سرکاری مٹی ٹیسٹ نتائج درج کریں — 100% ذاتی کھاد نسخہ
            </div>
          </div>
          {existing && (
            <div style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e', borderRadius: 8, padding: '4px 10px', fontSize: '0.68rem', color: '#86efac', fontWeight: 700 }}>
              ✅ محفوظ
            </div>
          )}
        </div>
      </div>

      {/* How-to get soil test */}
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.6 }}>
          <strong>مٹی ٹیسٹ کہاں سے ملے گا؟</strong><br />
          قریبی <strong>ماڈل ایگری مال</strong> یا <strong>ضلعی زرعی دفتر</strong> پر جائیں — ٹیسٹ <strong>مفت</strong> ہے۔
          آپ کو ایک <strong>Soil Health Card</strong> ملے گا جس میں یہ اعداد لکھے ہوں گے۔
        </div>
        <a href="tel:0800-17000" style={{ display: 'inline-block', marginTop: 6, color: 'white', background: '#1d4ed8', borderRadius: 8, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}>
          📞 0800-17000 مفت ہیلپ لائن
        </a>
      </div>

      {/* Soil Parameter Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {SOIL_PARAMS.map(param => {
          const status = getStatus(param, values[param.key]);
          const colors = STATUS_COLORS[status];
          const v = parseFloat(values[param.key]);
          const pct = status !== 'empty' ? Math.min(100, Math.max(0, ((v - param.min) / (param.max - param.min)) * 100)) : 0;
          const i0 = ((param.ideal[0] - param.min) / (param.max - param.min)) * 100;
          const i1 = ((param.ideal[1] - param.min) / (param.max - param.min)) * 100;

          return (
            <div key={param.key} style={{ background: colors.bg, border: '1.5px solid ' + colors.border, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{param.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot }} />
                  <input
                    type="number" value={values[param.key]} placeholder={param.placeholder} step="any" dir="ltr"
                    onChange={e => setValues(prev => ({ ...prev, [param.key]: e.target.value }))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 8, border: '1.5px solid ' + colors.border, background: 'white', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', color: '#111827', outline: 'none' }}
                  />
                  {param.unit && <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'Inter' }}>{param.unit}</span>}
                </div>
              </div>

              {/* Progress bar */}
              {status !== 'empty' && (
                <div style={{ position: 'relative', height: 6, background: '#e5e7eb', borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: i0 + '%', width: (i1 - i0) + '%', height: '100%', background: 'rgba(34,197,94,0.3)' }} />
                  <div style={{ position: 'absolute', left: 0, width: pct + '%', height: '100%', background: colors.dot, borderRadius: 6, transition: 'width 0.3s' }} />
                </div>
              )}

              {status !== 'empty' && (
                <div style={{ fontSize: '0.68rem', color: colors.text, lineHeight: 1.5 }}>
                  {status === 'low' ? '⬇️ کم — ' + param.low : status === 'high' ? '⬆️ زیادہ — ' + param.high : '✅ ' + param.ok}
                </div>
              )}
              <div style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: 3, direction: 'ltr', fontFamily: 'Inter' }}>
                Ideal: {param.ideal[0]}{param.ideal[1] ? ' – ' + param.ideal[1] : '+'} {param.unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save & Clear */}
      <button onClick={handleSave} disabled={!anyFilled}
        style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: anyFilled ? 'linear-gradient(135deg,#15803d,#16a34a)' : '#e5e7eb', color: anyFilled ? '#fff' : '#9ca3af', fontWeight: 800, fontSize: '0.92rem', cursor: anyFilled ? 'pointer' : 'not-allowed', marginBottom: 8, direction: 'rtl' }}>
        {saved ? '✅ پروفائل محفوظ ہو گیا!' : '💾 پروفائل محفوظ کریں — ذاتی کھاد نسخہ پائیں'}
      </button>

      {existing && (
        <button onClick={handleClear} style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid #fca5a5', background: 'white', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', direction: 'rtl', marginBottom: 12 }}>
          🗑️ پروفائل مٹائیں
        </button>
      )}

      {/* Live Advice Panel */}
      {advice && advice.flags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#14532d', marginBottom: 8 }}>
            🎯 آپ کی مٹی کے مطابق خصوصی ہدایات:
          </div>

          {advice.flags.map((f, i) => (
            <div key={i} style={{
              background: f.level === 'critical' ? '#fee2e2' : f.level === 'success' ? '#f0fdf4' : '#fef3c7',
              border: '1.5px solid ' + (f.level === 'critical' ? '#fca5a5' : f.level === 'success' ? '#86efac' : '#fcd34d'),
              borderRadius: 10, padding: '8px 12px', marginBottom: 6, fontSize: '0.75rem',
              color: f.level === 'critical' ? '#991b1b' : f.level === 'success' ? '#14532d' : '#92400e',
              fontWeight: 600, lineHeight: 1.6
            }}>
              {f.level === 'critical' ? '🔴' : f.level === 'success' ? '✅' : '⚠️'} {f.msg}
            </div>
          ))}

          {advice.savings.length > 0 && (
            <div style={{ background: '#ecfdf5', border: '2px solid #6ee7b7', borderRadius: 12, padding: '10px 14px', marginTop: 6, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#065f46', marginBottom: 4 }}>💰 آپ کی متوقع بچت (اس سیزن):</div>
              {advice.savings.map((s, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#047857', marginTop: 2 }}>• {s}</div>)}
            </div>
          )}

          {/* WhatsApp Share */}
          <button onClick={() => {
            const lines = [
              'DehatiAI مٹی ٹیسٹ رپورٹ',
              'pH: ' + values.pH + ' | EC: ' + values.ec + ' | OM: ' + values.om + '%',
              'N: ' + values.n + '% | P: ' + values.p + ' ppm | K: ' + values.k + ' ppm | Zn: ' + values.zn + ' ppm',
              '---',
              'ہدایات:',
              ...advice.flags.map(f => '• ' + f.msg),
              '---',
              'DehatiAI: https://dehati-ai.vercel.app',
            ];
            window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
          }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', direction: 'rtl' }}>
            📤 مٹی رپورٹ واٹس ایپ پر بھیجیں (ڈیلر / زراعت افسر کو دکھائیں)
          </button>
        </div>
      )}
    </div>
  );
}
