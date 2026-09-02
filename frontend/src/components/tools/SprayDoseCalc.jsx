import { useState, useCallback } from 'react';
import { useOffline } from '../../hooks/useOffline';

// ─── Punjab district GPS coordinates ────────────────────────────────────────
const DISTRICTS = {
  'لاہور':       { lat: 31.5497, lon: 74.3436 },
  'فیصل آباد':  { lat: 31.4154, lon: 72.9977 },
  'ملتان':       { lat: 30.1575, lon: 71.5249 },
  'گوجرانوالہ': { lat: 32.1877, lon: 74.1945 },
  'سیالکوٹ':    { lat: 32.4945, lon: 74.5229 },
  'بہاولپور':   { lat: 29.3956, lon: 71.6836 },
  'ڈیرہ غازی خان': { lat: 30.0574, lon: 70.6335 },
  'رحیم یار خان':  { lat: 28.4202, lon: 70.2952 },
  'شیخوپورہ':   { lat: 31.7167, lon: 73.9833 },
  'سرگودھا':    { lat: 32.0836, lon: 72.6711 },
  'جھنگ':       { lat: 31.2681, lon: 72.3181 },
  'گجرات':      { lat: 32.5736, lon: 74.0796 },
  'ساہیوال':    { lat: 30.6706, lon: 73.1064 },
  'خانیوال':    { lat: 30.3012, lon: 71.9328 },
  'پاکپتن':     { lat: 30.3432, lon: 73.3832 },
  'وہاڑی':      { lat: 29.7044, lon: 72.3464 },
  'اوکاڑہ':     { lat: 30.8117, lon: 73.4535 },
  'چینیوٹ':     { lat: 31.7257, lon: 72.9773 },
  'نارووال':    { lat: 32.1020, lon: 74.8726 },
  'قصور':       { lat: 31.1160, lon: 74.3525 },
  'ننکانہ صاحب': { lat: 31.4512, lon: 73.7078 },
  'شکرگڑھ':    { lat: 32.2649, lon: 75.1491 },
  'حافظ آباد':  { lat: 32.0714, lon: 73.6877 },
  'منڈی بہاؤالدین': { lat: 32.5870, lon: 73.4694 },
  'ٹوبہ ٹیک سنگھ': { lat: 30.9680, lon: 72.4823 },
  'بھکر':       { lat: 31.6234, lon: 71.0651 },
  'لودھراں':    { lat: 29.5348, lon: 71.6338 },
  'میانوالی':   { lat: 32.5854, lon: 71.5421 },
  'لیہ':        { lat: 30.9813, lon: 70.9469 },
  'مظفرگڑھ':   { lat: 30.0723, lon: 71.1937 },
  'راجن پور':   { lat: 29.1040, lon: 70.3269 },
  'عطاک':       { lat: 33.7667, lon: 72.3600 },
  'چکوال':      { lat: 32.9327, lon: 72.8565 },
  'جہلم':       { lat: 32.9335, lon: 73.7260 },
  'راولپنڈی':   { lat: 33.5651, lon: 73.0169 },
};

// ─── Pest/Disease pesticide database ────────────────────────────────────────
const PESTS = {
  'گلابی سنڈی (Pink Bollworm)': {
    icon: '🐛', crop: 'کپاس',
    products: [
      { name: 'Emamectin Benzoate 1.9% EC', dose: 250, tankMl: true, note: 'شام کو چھڑکاؤ — 80 لیٹر / ایکڑ' },
      { name: 'Spinosad 48% SC', dose: 100, tankMl: true, note: 'مقدار: 100 مل / ایکڑ' },
    ],
    waterPerAcre: 80, bestTime: 'شام 5-7 بجے'
  },
  'سفید مکھی (Whitefly)': {
    icon: '🪰', crop: 'کپاس',
    products: [
      { name: 'Imidacloprid 200 SL', dose: 200, tankMl: true, note: '200 مل / ایکڑ' },
      { name: 'Acetamiprid 20 SP', dose: 150, tankMl: true, note: 'متبادل — 150 گرام / ایکڑ' },
    ],
    waterPerAcre: 80, bestTime: 'صبح 6-9 بجے یا شام 5-7 بجے'
  },
  'تیلا (Aphid)': {
    icon: '🦟', crop: 'گندم / کپاس',
    products: [
      { name: 'Chlorpyrifos 40% EC', dose: 500, tankMl: true, note: '500 مل / ایکڑ' },
      { name: 'Dimethoate 40% EC', dose: 500, tankMl: true, note: 'متبادل — 500 مل / ایکڑ' },
    ],
    waterPerAcre: 100, bestTime: 'صبح 7-10 بجے'
  },
  'زنگ / Rust': {
    icon: '🍂', crop: 'گندم',
    products: [
      { name: 'Propiconazole 25% EC', dose: 500, tankMl: true, note: 'پہلی علامت پر — 500 مل / ایکڑ' },
      { name: 'Tebuconazole 25% WG', dose: 200, tankMl: true, note: 'متبادل — 200 گرام / ایکڑ' },
    ],
    waterPerAcre: 100, bestTime: 'صبح 8-11 بجے'
  },
  'بلاسٹ / Rice Blast': {
    icon: '🍚', crop: 'چاول',
    products: [
      { name: 'Tricyclazole 75% WP', dose: 200, tankMl: true, note: '200 گرام / ایکڑ' },
      { name: 'Isoprothiolane 40% EC', dose: 500, tankMl: true, note: 'متبادل — 500 مل / ایکڑ' },
    ],
    waterPerAcre: 100, bestTime: 'صبح 6-9 بجے'
  },
  'لال سنڈی (Stem Borer)': {
    icon: '🐌', crop: 'چاول / مکئی',
    products: [
      { name: 'Cartap Hydrochloride 4% GR', dose: 8000, tankMl: false, note: '8 کلو گرانیول / ایکڑ' },
      { name: 'Chlorantraniliprole 18.5% SC', dose: 200, tankMl: true, note: 'فاموریش — 200 مل / ایکڑ' },
    ],
    waterPerAcre: 100, bestTime: 'صبح 7-10 بجے'
  },
  'فال آرمی ورم': {
    icon: '🪱', crop: 'مکئی',
    products: [
      { name: 'Spinetoram 12% SC', dose: 300, tankMl: true, note: 'Radiant — 300 مل / ایکڑ، بنڈ میں ڈالیں' },
      { name: 'Emamectin Benzoate 1.9%', dose: 250, tankMl: true, note: '250 مل / ایکڑ' },
    ],
    waterPerAcre: 80, bestTime: 'شام 5-7 بجے'
  },
  'جھلساؤ (Early/Late Blight)': {
    icon: '🍅', crop: 'آلو / ٹماٹر',
    products: [
      { name: 'Mancozeb 80% WP', dose: 1000, tankMl: false, note: '1 کلو / ایکڑ — ہفتہ وار' },
      { name: 'Metalaxyl + Mancozeb', dose: 750, tankMl: false, note: 'Ridomil — 750 گرام / ایکڑ' },
    ],
    waterPerAcre: 100, bestTime: 'صبح 7-10 بجے'
  },
  'دیمک (Termite)': {
    icon: '🐜', crop: 'تمام فصلیں',
    products: [
      { name: 'Chlorpyrifos 40% EC', dose: 1500, tankMl: true, note: 'جڑوں کے پاس ڈالیں — 1.5 لیٹر / ایکڑ' },
      { name: 'Imidacloprid Seed Treatment', dose: 5, tankMl: false, note: 'بوائی سے پہلے بیج علاج' },
    ],
    waterPerAcre: 100, bestTime: 'کسی بھی وقت'
  },
};

const TANK_SIZES = [15, 16, 20, 25, 100, 400];
const ACTIVE_INGREDIENTS = {
  'Emamectin Benzoate 1.9% EC': 'Emamectin Benzoate 1.9% — ایمامیکٹن بینزویٹ',
  'Spinosad 48% SC': 'Spinosad 48% SC — سپیناسیڈ',
  'Imidacloprid 200 SL': 'Imidacloprid 20% SL — امیڈاکلوپریڈ',
  'Acetamiprid 20 SP': 'Acetamiprid 20% SP — ایسیٹامی پرڈ',
  'Chlorpyrifos 40% EC': 'Chlorpyrifos 40% EC — کلورپائری فاس',
  'Dimethoate 40% EC': 'Dimethoate 40% EC — ڈائی میتھویٹ',
  'Propiconazole 25% EC': 'Propiconazole 25% EC — پروپی کونازول (Tilt / Bumper / Radar)',
  'Tebuconazole 25% WG': 'Tebuconazole 25% WG — ٹیبوکونازول (Folicur / Orius)',
  'Tricyclazole 75% WP': 'Tricyclazole 75% WP — ٹرائی سائکلازول',
  'Isoprothiolane 40% EC': 'Isoprothiolane 40% EC — آئسوپروتھیولین',
  'Cartap Hydrochloride 4% GR': 'Cartap Hydrochloride 4% GR — کارٹاپ ہائیڈروکلورائیڈ (Padan)',
  'Chlorantraniliprole 18.5% SC': 'Chlorantraniliprole 18.5% SC — کلورینٹرینی لیپرول (Coragen)',
  'Spinetoram 12% SC': 'Spinetoram 12% SC — سپائنٹورم (Radiant)',
  'Emamectin Benzoate 1.9%': 'Emamectin Benzoate 1.9% EC — ایمامیکٹن',
  'Mancozeb 80% WP': 'Mancozeb 80% WP — مینکوزیب (Indofil M-45 / Dithane)',
  'Metalaxyl + Mancozeb': 'Metalaxyl 8% + Mancozeb 64% WP — (Ridomil Gold)',
};

const DISCLAIMER = '⚠️ یہ تجاویز زرعی تحقیقاتی ڈیٹا پر مبنی ہیں۔ حتمی فیصلے سے قبل مقامی زراعت آفیسر سے مشورہ کریں۔';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function SprayDoseCalc() {
  const [pest, setPest] = useState('');
  const [tankSize, setTankSize] = useState(15);
  const [district, setDistrict] = useState('');
  const [acres, setAcres] = useState('');
  const [weather, setWeather] = useState(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { isOffline } = useOffline();

  const fetchWeather = useCallback(async (dist) => {
    const coords = DISTRICTS[dist];
    if (!coords) return;
    setWxLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=windspeed_10m,precipitation_probability&timezone=Asia%2FKarachi&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      // Get current hour index
      const now = new Date();
      const h = now.getHours();
      const wind = data.hourly?.windspeed_10m?.[h] ?? null;
      const rain = data.hourly?.precipitation_probability?.[h] ?? null;
      setWeather({ wind, rain, cached: false });
      localStorage.setItem('dehati_spray_weather', JSON.stringify({ wind, rain, district: dist, ts: Date.now() }));
    } catch {
      // try cache
      const cached = localStorage.getItem('dehati_spray_weather');
      if (cached) {
        const c = JSON.parse(cached);
        setWeather({ ...c, cached: true });
      }
    } finally {
      setWxLoading(false);
    }
  }, []);

  const calculate = () => {
    const pestData = PESTS[pest];
    if (!pestData) return;
    const a = parseFloat(acres) || 1;
    const tank = parseFloat(tankSize);
    const products = pestData.products.map(p => {
      const dosePerTank = p.tankMl
        ? ((p.dose / pestData.waterPerAcre) * tank).toFixed(1)
        : 'گرانیول — براہ راست ڈالیں';
      return { ...p, dosePerTank };
    });
    setResult({ pestData, products, a, tank, totalTanks: Math.ceil((a * pestData.waterPerAcre) / tank) });
  };

  const safeSpray = weather && weather.wind !== null
    ? (weather.wind < 15 && weather.rain < 20)
    : null;

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ fontSize: '1.6rem' }}>🌤️</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ سپرے کیلکولیٹر</div>
          <div style={{ color: '#bae6fd', fontSize: '0.72rem', marginTop: 2 }}>موسم چیک + محفوظ ونڈو + درست مقدار</div>
        </div>
      </div>

      <div className="form-group">
        {/* Pest Selection */}
        <div>
          <label className="input-label">کیڑا / بیماری منتخب کریں</label>
          <select className="input" value={pest} id="spray-pest"
            onChange={e => { setPest(e.target.value); setResult(null); }}
            style={{ ...nas }}
          >
            <option value="">کیڑا یا بیماری منتخب کریں</option>
            {Object.entries(PESTS).map(([name, d]) => (
              <option key={name} value={name}>{d.icon} {name}</option>
            ))}
          </select>
          {pest && PESTS[pest] && (
            <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: 4, ...nas }}>
              فصل: {PESTS[pest].crop}
            </div>
          )}
        </div>

        {/* Tank Size */}
        <div>
          <label className="input-label">ٹینک کا سائز</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {TANK_SIZES.map(t => (
              <button key={t} id={`spray-tank-${t}`}
                onClick={() => setTankSize(t)}
                style={{ padding: '0.55rem', borderRadius: 8, border: `2px solid ${tankSize === t ? '#0369a1' : '#e5e7eb'}`, background: tankSize === t ? '#eff6ff' : 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#1a2f0e', fontFamily: 'Inter, sans-serif' }}
              >{t}L</button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div>
          <label className="input-label">رقبہ (ایکڑ)</label>
          <input id="spray-acres" type="number" className="input input-number" placeholder="5" value={acres} min="0.5" step="0.5" dir="ltr" onChange={e => { setAcres(e.target.value); setResult(null); }} />
        </div>

        {/* District + Weather */}
        <div>
          <label className="input-label">ضلع (موسم چیک کے لیے)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={district} id="spray-district" style={{ flex: 1, ...nas }}
              onChange={e => { setDistrict(e.target.value); setWeather(null); }}
            >
              <option value="">ضلع منتخب کریں</option>
              {Object.keys(DISTRICTS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button id="spray-wx-btn"
              onClick={() => district && !isOffline && fetchWeather(district)}
              disabled={!district || isOffline || wxLoading}
              style={{ padding: '0 0.9rem', borderRadius: 8, border: '2px solid #0369a1', background: '#eff6ff', fontWeight: 800, fontSize: '1.2rem', cursor: 'pointer', minWidth: 48 }}
            >{wxLoading ? '⏳' : '🌤️'}</button>
          </div>
        </div>

        {/* Weather Card */}
        {weather && (
          <div style={{ borderRadius: 10, padding: '0.75rem', border: '1.5px solid', borderColor: safeSpray ? '#86efac' : '#fca5a5', background: safeSpray ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: safeSpray ? '#15803d' : '#dc2626', ...nas }}>
              {safeSpray ? '✅ سپرے کا بہترین وقت' : '⛔ ابھی سپرے نہ کریں'}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>💨</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '1rem' }}>{weather.wind?.toFixed(0) ?? '?'} km/h</div>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', ...nas }}>ہوا</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem' }}>🌧️</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '1rem' }}>{weather.rain?.toFixed(0) ?? '?'}%</div>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', ...nas }}>بارش امکان</div>
              </div>
              {safeSpray !== null && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: safeSpray ? '#15803d' : '#dc2626', fontWeight: 700, ...nas }}>
                    {safeSpray ? `آج شام ${PESTS[pest]?.bestTime || '5-7 بجے'}` : 'ہوا یا بارش زیادہ ہے — کل کوشش کریں'}
                  </div>
                </div>
              )}
            </div>
            {weather.cached && <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 4, ...nas }}>⚡ آف لائن — آخری محفوظ موسم</div>}
          </div>
        )}

        <button className="btn btn-primary btn-full" id="spray-calc-btn"
          onClick={calculate} disabled={!pest}
          style={{ background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', fontSize: '1rem', padding: '0.85rem', ...nas }}
        >
          💧 سپرے مقدار حساب لگائیں
        </button>

        {/* Result */}
        {result && (
          <div className="animate-fade-in-up">
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0c4a6e', marginBottom: 8, ...nas }}>
              {result.pestData.icon} {pest} — {result.a} ایکڑ — کل {result.totalTanks} ٹینک
            </div>
            {result.products.map((p, i) => (
              <div key={i} style={{ background: 'white', border: '1.5px solid #e0f2fe', borderRadius: 12, padding: '0.85rem', marginBottom: 8, borderRight: '4px solid #0369a1' }}>
                <div style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.88rem', ...nas }}>{i === 0 ? '✅ پہلی پسند:' : '🔄 متبادل:'} {p.name}</div>
                {ACTIVE_INGREDIENTS[p.name] && (
                  <div style={{ fontSize: '0.68rem', color: '#0369a1', marginTop: 2, ...nas }}>🧪 فارمولا: {ACTIVE_INGREDIENTS[p.name]}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.55rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', ...nas }}>فی {tankSize}L ٹینک</div>
                    {tankSize !== 20 && p.tankMl && (
                      <div style={{ fontSize: '0.6rem', color: '#0369a1', ...nas }}>20L ٹینکی: {((p.dose / pestData.waterPerAcre) * 20).toFixed(1)} مل</div>
                    )}
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0369a1', fontFamily: 'Inter' }} dir="ltr">{p.dosePerTank}</div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', ...nas }}>مل/گرام</div>
                  </div>
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.55rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', ...nas }}>فی ایکڑ</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0369a1', fontFamily: 'Inter' }} dir="ltr">{p.dose}</div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', ...nas }}>مل/گرام</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 6, ...nas }}>📝 {p.note}</div>
              </div>
            ))}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>
            <button onClick={() => {
              const lines = [
                '💧 DehatiAI سپرے نسخہ',
                `کیڑا/بیماری: ${pest} | فصل: ${result.pestData.crop}`,
                `رقبہ: ${result.a} ایکڑ | ٹینک: ${tankSize}L | کل ٹینک: ${result.totalTanks}`,
                '━━━━━━━━━━━━━━━━━',
                ...result.products.map((p,i) => `${i===0?'✅':'🔄'} ${p.name}\n   فی ٹینک: ${p.dosePerTank} مل | فی ایکڑ: ${p.dose} مل\n   ${p.note}`),
                '━━━━━━━━━━━━━━━━━',
                `بہترین وقت: ${result.pestData.bestTime}`,
                '⚠️ استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں',
                '📞 0800-17000 | 🌐 dehati-ai.vercel.app',
              ];
              window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
            }}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', marginTop: 8, direction: 'rtl' }}
            >📤 ڈیلر کو واٹس ایپ پر سپرے نسخہ بھیجیں</button>
          </div>
        )}
      </div>
    </div>
  );
}
