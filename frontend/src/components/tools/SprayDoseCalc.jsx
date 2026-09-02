import { useState, useCallback } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { getSavedSoilProfile } from './SoilProfile';
import InstitutionalBadge from '../ui/InstitutionalBadge';

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

// ─── Official Pest Warning Directorate Punjab & CCRI Multan Directory 2024-2026 ─
const PESTS = {
  'گلابی سنڈی (Pink Bollworm)': {
    icon: '🐛', crop: 'کپاس (Cotton)',
    etl: '≥5 سنڈیاں فی 100 ٹنڈے (5% نقصان) یا 5 پروانے فی ٹریپ مسلسل 3 راتیں',
    waterPerAcre: 100, bestTime: 'شام 5 تا 7 بجے',
    products: [
      { name: 'Spinetoram 11.7% SC', brand: 'Radiant (Corteva) / FMC United', dose: 100, unit: 'ملی لیٹر', phi: 7, note: 'جدید سسٹمک سنڈی کش — فوری اثر' },
      { name: 'Chlorantraniliprole + Lambda Mix', brand: 'Coragen + Karate Mix (FMC + Syngenta)', dose: 160, unit: 'ملی لیٹر', phi: 7, note: 'انڈے اور چھوٹی سنڈی دونوں کا خاتمہ' },
      { name: 'Gamma-cyhalothrin 10% EC', brand: 'Dominex (ICI Pakistan / 4B)', dose: 100, unit: 'ملی لیٹر', phi: 7, note: 'تیز تر رابطہ زہر' },
    ]
  },
  'سفید مکھی (Whitefly)': {
    icon: '🪰', crop: 'کپاس (Cotton)',
    etl: '≥5 بالغ یا بچے فی پتہ (Pest Warning Threshold)',
    waterPerAcre: 100, bestTime: 'صبح 6-9 بجے یا شام 5-7 بجے',
    products: [
      { name: 'Spirotetramat 125ml + Biopower 250ml', brand: 'Movento + Biopower (Bayer Pakistan)', dose: 125, unit: 'ملی لیٹر', phi: 7, note: 'سفید مکھی کے بچوں اور انڈوں پر دو طرفہ سسٹمک اثر' },
      { name: 'Cyantraniliprole + Diafenthiuron', brand: 'Cyazypyr Mix + Diafenthiuron (FMC + Bayer)', dose: 300, unit: 'ملی لیٹر', phi: 7, note: 'شدید حملے کی صورت میں فوری نوک ڈاؤن' },
      { name: 'Flonicamid 50% WG', brand: 'Teppeki (ISK / Kanzo / 4B)', dose: 80, unit: 'گرام', phi: 4, note: 'رس چوسنا فوری بند — محفوظ کیمیائی گروپ' },
      { name: 'Pyriproxyfen 10% EC', brand: 'Admiral (Syngenta Pakistan) / Ali Akbar', dose: 450, unit: 'ملی لیٹر', phi: 7, note: 'آئی جی آر — اگلی نسل کی پیداوار روکتا ہے' },
      { name: 'Pyrifluquinazon 20% WG', brand: 'Afinto (Bayer Pakistan)', dose: 200, unit: 'گرام', phi: 4, note: 'نئی کیمسٹری — رس چوسنے والے کیڑوں کا خاتمہ' },
    ]
  },
  'سست تیلا / امرا (Jassid)': {
    icon: '🦗', crop: 'کپاس (Cotton)',
    etl: 'نئے پتوں پر پیلاہٹ اور ہاٹ اسپاٹ میں تیزی سے اضافہ',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Flonicamid 50% WG', brand: 'Teppeki (ISK Biosciences / 4B)', dose: 60, unit: 'گرام', phi: 4, note: '60 گرام فی ایکڑ — سست تیلے کا حتمی کنٹرول' },
      { name: 'Dinotefuran 20% SG', brand: 'Starkle (ISK / Ali Akbar Group)', dose: 100, unit: 'گرام', phi: 7, note: 'سسٹمک اثر — دیرپا تحفظ' },
      { name: 'Isocycloseram 10% SC', brand: 'Sefina (BASF Pakistan)', dose: 80, unit: 'ملی لیٹر', phi: 7, note: 'جدید مالیکیول — ماحول دوست' },
    ]
  },
  'تھرپس (Thrips)': {
    icon: '🌿', crop: 'کپاس / مرچ (Cotton / Chilli)',
    etl: '>10 تھرپس فی پتہ اور پتوں پر چاندی جیسے چمکدار دھبے',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Imidacloprid 20% SL', brand: 'Confidor (Bayer) / Ali Akbar Group', dose: 175, unit: 'ملی لیٹر', phi: 14, note: 'پتوں کے اندر داخل ہو کر تحفظ دیتا ہے' },
      { name: 'Thiamethoxam 25% WG', brand: 'Actara (Syngenta Pakistan) / 4B', dose: 90, unit: 'گرام', phi: 8, note: 'متبادل گروپ — 80-100 گرام فی ایکڑ' },
    ]
  },
  'ڈسکی کاٹن بگ (Dusky Bug)': {
    icon: '🐞', crop: 'کپاس (Cotton)',
    etl: 'کھلے ہوئے ٹنڈوں پر کیڑوں کے جھنڈ اور کالی چپچپاہٹ',
    waterPerAcre: 100, bestTime: 'شام 5 تا 7 بجے',
    products: [
      { name: 'Clothianidin 20% SL', brand: 'Dantotsu (Sumitomo / Ali Akbar)', dose: 200, unit: 'ملی لیٹر', phi: 14, note: '200 مل فی ایکڑ — روئی کو داغدار ہونے سے بچائیں' },
    ]
  },
  'پیلی زنگ (Yellow/Stripe Rust)': {
    icon: '🍂', crop: 'گندم (Wheat)',
    etl: 'جھنڈے کے پتے (Flag leaf) پر پیلی پٹیاں یا 5% رقبہ متاثر',
    waterPerAcre: 100, bestTime: 'صبح 8 تا 11 بجے (شبنم سوکھنے کے بعد)',
    products: [
      { name: 'Tebuconazole 25% EC', brand: 'Folicur (Bayer) / Kanzo / Ali Akbar', dose: 450, unit: 'ملی لیٹر', phi: 25, note: 'پہلی علامت پر فوری سپرے — زنگ کا پھیلاؤ رک جائے گا' },
      { name: 'Propiconazole 25% EC', brand: 'Tilt (Syngenta) / Radar (Ali Akbar)', dose: 450, unit: 'ملی لیٹر', phi: 25, note: 'پھپھوندی کے سپورز کو تلف کرتا ہے' },
      { name: 'Azoxystrobin + Tebuconazole SC', brand: 'Amistar Top (Syngenta Pakistan)', dose: 275, unit: 'ملی لیٹر', phi: 21, note: 'حفاظتی اور علاجی دونوں خصوصیات' },
    ]
  },
  'گندم کا سست تیلا (Wheat Aphid)': {
    icon: '🦟', crop: 'گندم (Wheat)',
    etl: '≥5 تیلے فی سٹہ / بالی (دانے بننے کے مرحلے پر)',
    waterPerAcre: 100, bestTime: 'صبح 8 تا 11 بجے',
    products: [
      { name: 'Thiamethoxam 25% WG', brand: 'Actara (Syngenta Pakistan) / 4B', dose: 20, unit: 'گرام', phi: 8, note: 'صرف 20 گرام فی ایکڑ — سستے داموں فوری خاتمہ' },
      { name: 'Pymetrozine 50% WG', brand: 'Chess (Syngenta Pakistan)', dose: 70, unit: 'گرام', phi: 4, note: 'دوست کیڑوں (لیڈی برڈ وغیرہ) کے لیے بالکل محفوظ' },
      { name: 'Dinotefuran 20% SG', brand: 'Starkle (ISK / Ali Akbar Group)', dose: 90, unit: 'گرام', phi: 7, note: 'دانے بھرنے کے وقت محفوظ اور موثر' },
    ]
  },
  'چاول کا جھلساؤ (Rice Blast)': {
    icon: '🍚', crop: 'چاول باسمتی (Rice)',
    etl: 'پتوں پر آنکھ نما داغ یا گوب کی حالت پر گردن کا جھلساؤ خطرہ',
    waterPerAcre: 100, bestTime: 'صبح 6 تا 9 بجے',
    products: [
      { name: 'Tricyclazole 75% WP', brand: 'Beam (Syngenta) / Ali Akbar Group', dose: 225, unit: 'گرام', phi: 21, note: 'گوب کے وقت احتیاطی سپرے سے گردن توڑ کا خطرہ ختم' },
      { name: 'Azoxystrobin 25% SC', brand: 'Amistar (Syngenta Pakistan) / 4B', dose: 225, unit: 'ملی لیٹر', phi: 14, note: 'جھلساؤ اور بھورے داغ دونوں میں یکساں مفید' },
    ]
  },
  'پتہ لپیٹ سنڈی (Leaf Folder)': {
    icon: '🍃', crop: 'چاول (Rice)',
    etl: '>10% لپٹے ہوئے پتے یا 5-10 سنڈیاں فی مربع میٹر',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Chlorantraniliprole 18.5% SC', brand: 'Coragen (FMC United) / Kanzo', dose: 175, unit: 'ملی لیٹر', phi: 7, note: 'پتے کے اندر موجود سنڈی کو مارتا ہے' },
      { name: 'Emamectin Benzoate 1.9% EC', brand: 'Proclaim (Syngenta Pakistan) / FMC', dose: 225, unit: 'ملی لیٹر', phi: 14, note: 'چاول پر لیبل شدہ پی ایچ آئی 14 دن ہے' },
    ]
  },
  'تنے کی سنڈی (Stem Borer)': {
    icon: '🐌', crop: 'چاول / مکئی (Rice / Maize)',
    etl: '>5% مردہ دل (Dead Hearts) شگوفوں کے وقت',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Cartap Hydrochloride 50% SP', brand: 'Padan / Thiodan Generics', dose: 450, unit: 'گرام', phi: 14, note: '450 گرام فی ایکڑ پانی میں ملا کر سپرے' },
      { name: 'Chlorantraniliprole 18.5% SC', brand: 'Coragen (FMC United)', dose: 175, unit: 'ملی لیٹر', phi: 7, note: 'شگوفے نکلتے وقت پہلی خوراک' },
    ]
  },
  'آلو/ٹماٹر پچھیتا جھلساؤ (Late Blight)': {
    icon: '🥔', crop: 'آلو / ٹماٹر (Potato / Tomato)',
    etl: 'نم آلود سرد موسم میں پتوں پر پانی بھرے کالے داغ اور سفید پھپھوندی',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Metalaxyl-M + Mancozeb 68% WP', brand: 'Ridomil Gold (Syngenta Pakistan)', dose: 450, unit: 'گرام', phi: 7, note: 'پہلی علامت نظر آتے ہی فوری سپرے — 7 دن کا وقفہ' },
      { name: 'Cymoxanil + Famoxadone SC', brand: 'Curzate M8 (مقامی رجسٹرڈ)', dose: 275, unit: 'ملی لیٹر', phi: 4, note: 'بارش کے بعد سسٹمک علاج — تیز عمل' },
      { name: 'Fluopicolide + Propamocarb SC', brand: 'Previcur Energy (Bayer Pakistan)', dose: 225, unit: 'ملی لیٹر', phi: 3, note: 'ٹماٹر کے لیے محفوظ ترین — صرف 3 دن PHI' },
    ]
  },
  'آلو/ٹماٹر اگیتا جھلساؤ (Early Blight)': {
    icon: '🍅', crop: 'آلو / ٹماٹر (Potato / Tomato)',
    etl: 'پرانے پتوں پر دائرہ نما بھورے نشانات (Target spots)',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Mancozeb 75% WP', brand: 'Dithane M-45 (Corteva) / Indofil M-45', dose: 900, unit: 'گرام', phi: 8, note: 'حفاظتی سپرے — پودے کی سطح پر حفاظتی تہہ بناتا ہے' },
    ]
  },
};

const TANK_SIZES = [15, 16, 20, 25, 100, 400];
const DISCLAIMER = '⚠️ تمام ادویات کی مقداریں محکمہ آفات نباتات و مالیاتی معیار کیڑے مار ادویات پنجاب (Pest Warning & Quality Control) اور CCRI ملتان 2024-2026 ایڈوائزری کے مطابق ہیں۔ سپرے کے بعد درج شدہ PHI (ممنوعہ دن) کا احترام لازمی کریں۔ تصدیق: 0800-17000';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function SprayDoseCalc() {
  const [pest, setPest] = useState('');
  const [tankSize, setTankSize] = useState(20);
  const [district, setDistrict] = useState('');
  const [acres, setAcres] = useState('1');
  const [weather, setWeather] = useState(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { isOffline } = useOffline();

  // Soil profile — affects spray efficacy (pH, EC)
  const [soilData] = useState(() => { try { return getSavedSoilProfile(); } catch { return null; } });

  const fetchWeather = useCallback(async (dist) => {
    const coords = DISTRICTS[dist];
    if (!coords) return;
    setWxLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=windspeed_10m,precipitation_probability&timezone=Asia%2FKarachi&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      const now = new Date();
      const h = now.getHours();
      const wind = data.hourly?.windspeed_10m?.[h] ?? null;
      const rain = data.hourly?.precipitation_probability?.[h] ?? null;
      setWeather({ wind, rain, cached: false });
      localStorage.setItem('dehati_spray_weather', JSON.stringify({ wind, rain, district: dist, ts: Date.now() }));
    } catch {
      const cached = localStorage.getItem('dehati_spray_weather');
      if (cached) {
        setWeather({ ...JSON.parse(cached), cached: true });
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

    // Standard water volume per acre is 100L in Punjab
    const waterVol = pestData.waterPerAcre || 100;
    const products = pestData.products.map(p => {
      // Dose per tank: (dose_per_acre / waterVol) * tankSize
      const dosePerTank = ((p.dose / waterVol) * tank).toFixed(1);
      const totalQuantity = (p.dose * a).toFixed(0);
      return { ...p, dosePerTank, totalQuantity };
    });

    setResult({
      pest,
      pestData,
      products,
      a,
      tank,
      totalTanks: Math.ceil((a * waterVol) / tank)
    });
  };

  const safeSpray = weather && weather.wind !== null
    ? (weather.wind < 15 && weather.rain < 20)
    : null;

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>💧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ سپرے و کیڑے مار کیلکولیٹر</div>
          <div style={{ color: '#bae6fd', fontSize: '0.72rem', marginTop: 2 }}>محکمہ پیسٹ وارننگ پنجاب + CCRI ملتان مصدقہ ڈائریکٹری</div>
        </div>
      </div>

      <div className="form-group">
        {/* Pest Selection */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>کیڑا یا بیماری منتخب کریں:</label>
          <select className="input" value={pest} id="spray-pest"
            onChange={e => { setPest(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', background: 'white', fontWeight: 700, fontSize: '0.85rem', ...nas }}
          >
            <option value="">-- فہرست سے منتخب کریں --</option>
            {Object.entries(PESTS).map(([name, d]) => (
              <option key={name} value={name}>{d.icon} {name} ({d.crop})</option>
            ))}
          </select>
          {pest && PESTS[pest] && (
            <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: 4, fontWeight: 700 }}>
              فصل: {PESTS[pest].crop} | پانی: {PESTS[pest].waterPerAcre} لیٹر / ایکڑ
            </div>
          )}
        </div>

        {/* Tank Size */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>سپرے ٹینکی کا سائز:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {TANK_SIZES.map(t => (
              <button key={t} id={`spray-tank-${t}`}
                onClick={() => setTankSize(t)}
                style={{
                  padding: '0.55rem', borderRadius: 8,
                  border: `2px solid ${tankSize === t ? '#0369a1' : '#e5e7eb'}`,
                  background: tankSize === t ? '#e0f2fe' : 'white',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                  color: tankSize === t ? '#0369a1' : '#1e293b', fontFamily: 'Inter, sans-serif'
                }}
              >
                {t} لیٹر {t === 20 ? '⭐ (سولو/معیاری)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>رقبہ (ایکڑ میں):</label>
          <input id="spray-acres" type="number" className="input" placeholder="1" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => { setAcres(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* District Weather Check */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>ضلع (محفوظ سپرے ونڈو چیک):</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={district} id="spray-district" style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', background: 'white', ...nas }}
              onChange={e => { setDistrict(e.target.value); setWeather(null); }}
            >
              <option value="">ضلع منتخب کریں</option>
              {Object.keys(DISTRICTS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button id="spray-wx-btn"
              onClick={() => district && !isOffline && fetchWeather(district)}
              disabled={!district || isOffline || wxLoading}
              style={{ padding: '0 1rem', borderRadius: 8, border: '2px solid #0369a1', background: '#eff6ff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', minWidth: 50 }}
            >
              {wxLoading ? '⏳' : '🌤️ چیک کریں'}
            </button>
          </div>
        </div>

        {/* Weather Window Card */}
        {weather && (
          <div style={{ marginTop: 10, borderRadius: 10, padding: '0.75rem 1rem', border: '1.5px solid', borderColor: safeSpray ? '#86efac' : '#fca5a5', background: safeSpray ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: safeSpray ? '#15803d' : '#dc2626' }}>
              {safeSpray ? '✅ سپرے کے لیے موسم بالکل محفوظ ہے' : '⛔ ابھی سپرے نہ کریں — دوائی اڑنے یا دھلنے کا خطرہ'}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem' }}>💨</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '0.95rem' }}>{weather.wind?.toFixed(0) ?? '?'} km/h</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>ہوا کی رفتار</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem' }}>🌧️</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '0.95rem' }}>{weather.rain?.toFixed(0) ?? '?'}%</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>بارش امکان</div>
              </div>
              {safeSpray !== null && (
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: safeSpray ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                    {safeSpray ? `بہترین وقت: ${PESTS[pest]?.bestTime || 'صبح 7-10 بجے یا شام'}` : 'ہوا تیز یا بارش متوقع ہے — کل صبح تک انتظار کریں'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <button className="btn btn-primary btn-full" id="spray-calc-btn"
          onClick={calculate} disabled={!pest}
          style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.8rem', background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
        >
          💧 مصدقہ سپرے نسخہ حساب لگائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {/* Summary */}
            <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: 12, padding: '0.85rem', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: '0.92rem', color: '#0369a1', fontWeight: 800 }}>
                {result.pestData.icon} {result.pest} — رقبہ: {result.a} ایکڑ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: 4 }}>
                ٹینک کا سائز: {result.tank} لیٹر | کل درکار ٹینکس: <strong>{result.totalTanks} ٹینک</strong>
              </div>
            </div>

            {/* Pest Warning ETL Card */}
            {result.pestData.etl && (
              <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '8px 12px', marginBottom: 10, direction: 'rtl' }}>
                <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#92400e' }}>
                  ⚠️ نقصان کی معاشی حد (Pest Warning ETL):
                </div>
                <div style={{ fontSize: '.78rem', color: '#78350f', marginTop: 3, fontWeight: 700, lineHeight: 1.5 }}>
                  {result.pestData.etl}
                </div>
                <div style={{ fontSize: '.68rem', color: '#b45309', marginTop: 3 }}>
                  💡 نوٹ: کیمیائی سپرے صرف تب کریں جب کیڑوں کی تعداد اس حد سے تجاوز کرے۔ ورنہ دوست کیڑوں کا نقصان ہوتا ہے۔
                </div>
              </div>
            )}

            {/* Soil Profile Context */}
            {soilData && (() => {
              const ph = parseFloat(soilData.pH || soilData.ph || 7.5);
              const ec = parseFloat(soilData.ec || 1.5);
              const tips = [];
              if (ph > 8.0) tips.push('آپ کی زمین کا pH ' + ph + ' ہے (الکالائن) — سپرے کے پانی میں تھوڑا سرکہ یا بائیو پاور ملائیں تاکہ دوائی کا اثر 100% ہو۔');
              if (ec > 4.0) tips.push('EC ' + ec + ' dS/m — نمکین مٹی پر پودے کمزور ہوتے ہیں، پانی کی مقدار 100 کے بجائے 120 لیٹر فی ایکڑ رکھیں۔');
              if (!tips.length) return null;
              return (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#065f46', marginBottom: 2 }}>🌱 آپ کی مٹی پروفائل — سپرے رہنمائی:</div>
                  {tips.map((t, idx) => <div key={idx} style={{ fontSize: '.72rem', color: '#047857', lineHeight: 1.5 }}>• {t}</div>)}
                </div>
              );
            })()}

            {/* Products List */}
            {result.products.map((p, i) => {
              const phiColor = p.phi <= 5 ? '#15803d' : p.phi <= 14 ? '#d97706' : '#dc2626';
              const phiBg = p.phi <= 5 ? '#f0fdf4' : p.phi <= 14 ? '#fffbeb' : '#fef2f2';
              return (
                <div key={i} style={{ background: 'white', border: '1.5px solid #e0f2fe', borderRadius: 12, padding: '0.85rem', marginBottom: 10, borderRight: `4px solid ${i === 0 ? '#0369a1' : '#64748b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.9rem' }}>
                        {i === 0 ? '✅ اولین تجویز:' : '🔄 متبادل مالیکیول:'} {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2, fontWeight: 700 }}>
                        🏷️ تجارتی برانڈز: {p.brand}
                      </div>
                    </div>
                    {/* PHI Badge */}
                    <div style={{ background: phiBg, border: `1.5px solid ${phiColor}`, borderRadius: 16, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '.68rem' }}>⏳</span>
                      <span style={{ fontSize: '.7rem', fontWeight: 800, color: phiColor, fontFamily: 'Inter, sans-serif' }}>
                        PHI: {p.phi} دن (کٹائی سے قبل ممنوع)
                      </span>
                    </div>
                  </div>

                  {/* Dose Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>فی {result.tank}L ٹینک خوراک</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0369a1', fontFamily: 'Inter' }} dir="ltr">
                        {p.dosePerTank}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 700 }}>{p.unit}</div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>کل مقدار ({result.a} ایکڑ)</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', fontFamily: 'Inter' }} dir="ltr">
                        {p.totalQuantity}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>{p.unit} (فی ایکڑ: {p.dose} {p.unit})</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 8, lineHeight: 1.5 }}>
                    📝 <strong>طریقہ استعمال:</strong> {p.note}
                  </div>
                </div>
              );
            })}

            {/* Institutional Badge & Disclaimer */}
            <div style={{ marginTop: 8 }}>
              <InstitutionalBadge type="pest" helpline="0800-17000" />
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', fontSize: '0.72rem', color: '#92400e', marginTop: 8 }}>
              {DISCLAIMER}
            </div>

            {/* WhatsApp Share Prescription */}
            <button onClick={() => {
              const lines = [
                '💧 *DehatiAI مصدقہ سپرے نسخہ*',
                `کیڑا/بیماری: ${result.pest} (${result.pestData.crop})`,
                `رقبہ: ${result.a} ایکڑ | ٹینک سائز: ${result.tank} لیٹر | کل ٹینکس: ${result.totalTanks}`,
                `⚠️ معاشی حد (ETL): ${result.pestData.etl}`,
                '━━━━━━━━━━━━━━━━━',
                ...result.products.map((p, i) =>
                  `${i === 0 ? '✅ اولین تجویز' : '🔄 متبادل'}: ${p.name}` +
                  `\nبرانڈ: ${p.brand}` +
                  `\nفی ٹینک خوراک: ${p.dosePerTank} ${p.unit} | کل درکار: ${p.totalQuantity} ${p.unit}` +
                  `\n⏳ PHI: ${p.phi} دن | ${p.note}`
                ),
                '━━━━━━━━━━━━━━━━━',
                `بہترین وقت: ${result.pestData.bestTime}`,
                '📚 ماخذ: محکمہ آفات نباتات پنجاب + CCRI ملتان',
                '📞 تصدیق کیلئے: 0800-17000 | 🌐 dehati-ai.vercel.app',
              ];
              window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
            }}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer', marginTop: 10, direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              📤 ڈیلر یا زراعت افسر کو واٹس ایپ نسخہ بھیجیں
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
