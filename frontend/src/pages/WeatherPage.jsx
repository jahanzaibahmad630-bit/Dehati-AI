import { useState, useEffect, useRef } from 'react';
import { getWeatherByCoords, getWeatherByCity, askAI } from '../services/api';
import { usePermission, PERMISSION_MESSAGES } from '../hooks/usePermission';
import { useOffline } from '../hooks/useOffline';
import AIDisclaimer from '../components/ui/AIDisclaimer';

const CITIES = [
  'lahore','faisalabad','multan','rawalpindi','gujranwala','sialkot',
  'bahawalpur','sargodha','jhang','rahim yar khan','sahiwal','okara',
  'dera ghazi khan','mianwali','khanewal','vehari','hafizabad'
];
const CITY_LABELS = {
  'lahore':'لاہور','faisalabad':'فیصل آباد','multan':'ملتان',
  'rawalpindi':'راولپنڈی','gujranwala':'گجرانوالہ','sialkot':'سیالکوٹ',
  'bahawalpur':'بہاولپور','sargodha':'سرگودھا','jhang':'جھنگ',
  'rahim yar khan':'رحیم یار خان','sahiwal':'ساہیوال','okara':'اوکاڑہ',
  'dera ghazi khan':'ڈیرہ غازی خان','mianwali':'میانوالی',
  'khanewal':'خانیوال','vehari':'وہاڑی','hafizabad':'حافظ آباد'
};

export default function WeatherPage() {
  const [weather, setWeather] = useState(null);
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { isOffline } = useOffline();
  const locPerm = usePermission('geolocation');
  const requestGen = useRef(0); // M2 fix: generation counter to discard stale responses

  // Auto-load last city on mount
  useEffect(() => {
    const lastCity = localStorage.getItem('dehati_last_city');
    if (lastCity && !isOffline) {
      handleCitySelect(lastCity);
    }
  }, []); // eslint-disable-line

  const fetchWeatherAndAdvice = async (weatherData) => {
    setWeather(weatherData);
    setAdviceLoading(true);
    try {
      const prompt = `موسم: ${weatherData.condition}, درجہ حرارت: ${weatherData.temp}°C, نمی: ${weatherData.humidity}%, ہوا: ${weatherData.windSpeed} km/h\n\nآج کے موسم کے مطابق پنجاب کے کسانوں کے لیے 2-3 عملی مشورے دیں (آبپاشی، سپرے، دھوپ سے بچاؤ وغیرہ)`;
      const data = await askAI(prompt);
      setAdvice(data.answer);
    } catch {
      // advice is optional
    } finally {
      setAdviceLoading(false);
    }
  };

  const handleGeolocate = () => {
    if (isOffline) { setError('انٹرنیٹ نہیں ہے'); return; }
    locPerm.requestWithPrePrompt(async () => {
      setLoading(true); setError('');
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        const data = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        await fetchWeatherAndAdvice(data);
      } catch (err) {
        setError(err.message || 'موسم نہیں ملا — شہر منتخب کریں');
      } finally { setLoading(false); }
    });
  };

  const handleCitySelect = async (city) => {
    if (!city) return;
    if (isOffline) { setError('انٹرنیٹ نہیں — موسم نہیں مل سکتا'); return; }
    // M2 fix: increment generation so any in-flight previous request is discarded
    const gen = ++requestGen.current;
    setSelectedCity(city); setLoading(true); setError('');
    localStorage.setItem('dehati_last_city', city);
    try {
      const data = await getWeatherByCity(city);
      if (gen !== requestGen.current) return; // stale response — discard
      await fetchWeatherAndAdvice(data);
    } catch (err) {
      if (gen !== requestGen.current) return;
      setError(err.message || 'موسم نہیں ملا');
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page">
      <div className="page-content">
        <div style={{ background: 'linear-gradient(135deg, #0f2d5e 0%, #2563eb 100%)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🌤️</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>موسم کی معلومات</h2>
          <p style={{ opacity: .8, fontSize: '.82rem' }}>Open-Meteo سے حقیقی موسم — مفت</p>
        </div>

        <div className="card">
          <button
            className="btn btn-primary btn-full"
            onClick={handleGeolocate}
            disabled={loading}
            id="weather-geolocate-btn"
          >
            {loading ? 'لوڈ ہو رہا ہے...' : '📍 میری جگہ کا موسم دیکھیں'}
          </button>
          <div style={{ textAlign: 'center', margin: '.75rem 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>— یا شہر منتخب کریں —</div>
          <select
            className="input"
            value={selectedCity}
            onChange={e => handleCitySelect(e.target.value)}
            id="weather-city-select"
          >
            <option value="">شہر منتخب کریں</option>
            {CITIES.map(c => <option key={c} value={c}>{CITY_LABELS[c] || c}</option>)}
          </select>
        </div>

        {/* Permission modals */}
        {locPerm.showPrePrompt && (
          <div className="permission-modal">
            <div className="permission-modal-content">
              <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📍</div>
              <h3 style={{ marginBottom: '.75rem' }}>{PERMISSION_MESSAGES.geolocation.title}</h3>
              <p style={{ fontSize: '.9rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>{PERMISSION_MESSAGES.geolocation.body}</p>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={locPerm.dismissPrePrompt}>بعد میں</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={locPerm.proceedAfterPrePrompt} id="loc-allow-btn">اجازت دیں ✓</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {loading && <div className="loading-container"><div className="spinner" /><p>موسم دیکھ رہے ہیں...</p></div>}

        {weather && (
          <>
            <div className="weather-main">
              <div className="weather-emoji">{weather.emoji}</div>
              <div className="weather-temp">{weather.temp}°C</div>
              <div style={{ fontSize: '1.1rem', marginTop: '.3rem', fontWeight: 700 }}>{weather.condition}</div>
              {weather.cityName && (
                <div style={{ fontSize: '.8rem', opacity: .7, marginTop: '.2rem' }}>{weather.cityName}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
                {[
                  { label: 'نمی', value: `${weather.humidity}%` },
                  { label: 'جیسا لگے', value: `${weather.feelsLike}°` },
                  { label: 'ہوا', value: `${weather.windSpeed} km/h` }
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: '.72rem', opacity: .75 }}>{label}</div>
                  </div>
                ))}
              </div>
              {weather.updatedAt && (
                <div style={{ fontSize: '.68rem', opacity: .6, marginTop: '1rem', fontFamily: 'Inter, sans-serif' }}>
                  Open-Meteo سے • آخری تازہ کاری: {formatTime(weather.updatedAt)}
                </div>
              )}
            </div>

            {adviceLoading && (
              <div className="loading-container"><div className="spinner" /><p>AI زرعی مشورہ تیار ہو رہا ہے...</p></div>
            )}

            {advice && (
              <div className="ai-response-card animate-fade-in-up">
                <div className="ai-response-header">
                  <span style={{ fontWeight: 700 }}>🌾 آج کے موسم کے مطابق مشورہ</span>
                  <AIDisclaimer small />
                </div>
                <div className="ai-response-body">{advice}</div>
              </div>
            )}
          </>
        )}

        {!weather && !loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem' }}>🌤️</div>
            <p style={{ marginTop: '.75rem' }}>اوپر سے اپنی جگہ یا شہر منتخب کریں</p>
          </div>
        )}
      </div>
    </div>
  );
}
