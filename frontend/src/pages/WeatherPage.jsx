import { useState, useEffect, useRef } from 'react';
import { getWeatherByCoords, getWeatherByCity, askAI } from '../services/api';
import { usePermission, PERMISSION_MESSAGES } from '../hooks/usePermission';
import { useOffline } from '../hooks/useOffline';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AudioPlayer from '../components/ui/AudioPlayer';

// ─── All 34 Punjab + Pakistan farming districts ───────────────────────────────
const CITIES = [
  'lahore','faisalabad','multan','rawalpindi','gujranwala','sialkot',
  'bahawalpur','sargodha','jhang','rahim yar khan','sahiwal','okara',
  'dera ghazi khan','mianwali','khanewal','vehari','hafizabad',
  'sheikhupura','gujrat','kasur','chiniot','muzaffargarh','pakpattan',
  'attock','chakwal','jhelum','narowal','nankana sahib','toba tek singh',
  'bhakkar','layyah','mandi bahauddin','khushab'
];
const CITY_LABELS = {
  'lahore':'لاہور','faisalabad':'فیصل آباد','multan':'ملتان',
  'rawalpindi':'راولپنڈی','gujranwala':'گجرانوالہ','sialkot':'سیالکوٹ',
  'bahawalpur':'بہاولپور','sargodha':'سرگودھا','jhang':'جھنگ',
  'rahim yar khan':'رحیم یار خان','sahiwal':'ساہیوال','okara':'اوکاڑہ',
  'dera ghazi khan':'ڈیرہ غازی خان','mianwali':'میانوالی',
  'khanewal':'خانیوال','vehari':'وہاڑی','hafizabad':'حافظ آباد',
  'sheikhupura':'شیخوپورہ','gujrat':'گجرات','kasur':'قصور',
  'chiniot':'چنیوٹ','muzaffargarh':'مظفرگڑھ','pakpattan':'پاکپتن',
  'attock':'اٹک','chakwal':'چکوال','jhelum':'جہلم',
  'narowal':'نارووال','nankana sahib':'ننکانہ صاحب',
  'toba tek singh':'ٹوبہ ٹیک سنگھ','bhakkar':'بھکر',
  'layyah':'لیہ','mandi bahauddin':'منڈی بہاءالدین','khushab':'خوشاب'
};

// ─── Severe alert color map ───────────────────────────────────────────────────
const ALERT_STYLES = {
  heatwave: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  frost:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e3a8a' },
  rain:     { bg: '#f0f9ff', border: '#7dd3fc', color: '#0369a1' },
  wind:     { bg: '#f5f3ff', border: '#c4b5fd', color: '#5b21b6' },
};

// ─── Builds spoken Urdu summary of the week for AudioPlayer ──────────────────
function buildWeekSpeech(forecast, cityName) {
  if (!forecast || forecast.length === 0) return '';
  const city = cityName ? `${cityName} کے` : 'آپ کے علاقے کے';
  const lines = [`پورے ہفتے کا ${city} موسم:`];
  forecast.forEach(day => {
    lines.push(
      `${day.dayName}: زیادہ سے زیادہ درجہ حرارت ${day.maxTemp} ڈگری، کم سے کم ${day.minTemp} ڈگری۔` +
      (day.rainProb > 20 ? ` بارش کا امکان ${day.rainProb} فیصد۔` : ' بارش نہیں۔') +
      (day.farmActions?.[0] ? ` کسانوں کے لیے: ${day.farmActions[0]}۔` : '')
    );
  });
  return lines.join(' ');
}

// ─── Single day card ──────────────────────────────────────────────────────────
function ForecastDayCard({ day, isToday }) {
  return (
    <div style={{
      background: isToday
        ? 'linear-gradient(135deg, #1a3a16, #2e5a27)'
        : 'white',
      border: isToday ? '2px solid #4a7c40' : '1.5px solid #e5e7eb',
      borderRadius: 14,
      padding: '14px 12px',
      minWidth: 130,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      boxShadow: isToday ? '0 4px 16px rgba(46,90,39,.25)' : '0 1px 4px rgba(0,0,0,.06)',
      transition: 'all 0.2s'
    }}>
      {/* Day name */}
      <div style={{
        fontWeight: 800,
        fontSize: '.8rem',
        color: isToday ? '#a3e635' : '#6b7280',
        fontFamily: '"Noto Nastaliq Urdu", serif',
        direction: 'rtl',
        textAlign: 'right'
      }}>{day.dayName}</div>

      {/* Emoji + condition */}
      <div style={{ fontSize: '1.6rem', textAlign: 'center' }}>{day.emoji}</div>
      <div style={{
        fontSize: '.7rem', textAlign: 'center',
        color: isToday ? 'rgba(255,255,255,.8)' : '#6b7280',
        fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl'
      }}>{day.condition}</div>

      {/* Temp range */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '.95rem', color: isToday ? '#fbbf24' : '#dc2626' }}>
          {day.maxTemp}°
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.78rem', color: isToday ? 'rgba(255,255,255,.5)' : '#9ca3af' }}>
          / {day.minTemp}°
        </span>
      </div>

      {/* Rain probability */}
      {day.rainProb > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          fontSize: '.7rem', color: isToday ? '#a3e635' : '#264D24',
          fontFamily: 'Inter, sans-serif', fontWeight: 700
        }}>
          🌧️ {day.rainProb}%
        </div>
      )}

      {/* Severe alerts */}
      {day.alerts?.map(alert => (
        <div key={alert.type} style={{
          background: isToday ? 'rgba(0,0,0,.3)' : ALERT_STYLES[alert.type]?.bg,
          color: isToday ? 'white' : ALERT_STYLES[alert.type]?.color,
          border: `1px solid ${isToday ? 'rgba(255,255,255,.2)' : ALERT_STYLES[alert.type]?.border}`,
          borderRadius: 6, padding: '2px 6px',
          fontSize: '.6rem', fontWeight: 800, textAlign: 'center'
        }}>{alert.label}</div>
      ))}
    </div>
  );
}

// ─── Weekly farmer schedule table ─────────────────────────────────────────────
function WeeklySchedule({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: '1.5px solid #e5e7eb',
      overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.06)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a3a16, #2e5a27)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: '1.2rem' }}>📋</span>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '.9rem', fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' }}>
            کسان کیا کریں — ہفتہ وار شیڈول
          </div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '.7rem', fontFamily: 'Inter, sans-serif' }}>
            Weekly Farmer Action Schedule
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {forecast.map((day, i) => (
          <div key={day.date} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 16px',
            background: i === 0 ? '#f0fdf4' : i % 2 === 0 ? '#f9fafb' : 'white',
            borderBottom: i < forecast.length - 1 ? '1px solid #f3f4f6' : 'none'
          }}>
            {/* Day column */}
            <div style={{ minWidth: 60, flexShrink: 0, textAlign: 'center' }}>
              <div style={{
                fontWeight: 800, fontSize: '.85rem',
                color: i === 0 ? '#2e5a27' : '#374151',
                fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl'
              }}>{day.dayName}</div>
              <div style={{ fontSize: '.75rem', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
                {day.emoji} {day.maxTemp}°
              </div>
            </div>

            {/* Actions column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Severe alerts */}
              {day.alerts?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {day.alerts.map(alert => (
                    <span key={alert.type} style={{
                      background: ALERT_STYLES[alert.type]?.bg,
                      color: ALERT_STYLES[alert.type]?.color,
                      border: `1px solid ${ALERT_STYLES[alert.type]?.border}`,
                      borderRadius: 6, padding: '1px 7px',
                      fontSize: '.65rem', fontWeight: 800
                    }}>{alert.label}</span>
                  ))}
                </div>
              )}
              {/* Farm actions */}
              {day.farmActions?.map((action, j) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  fontSize: '.82rem', color: '#374151',
                  fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl',
                  lineHeight: 1.6
                }}>
                  <span style={{ color: '#2e5a27', flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span>{action}</span>
                </div>
              ))}
              {/* Rain & wind quick stats */}
              <div style={{
                display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2,
                fontSize: '.7rem', color: '#9ca3af', fontFamily: 'Inter, sans-serif'
              }}>
                {day.rainProb > 0 && <span>🌧️ بارش {day.rainProb}%</span>}
                <span>💨 ہوا {day.windSpeed} km/h</span>
                <span>💧 نمی {day.humidity}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WeatherPage() {
  const [weather, setWeather]           = useState(null);
  const [advice, setAdvice]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [error, setError]               = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { isOffline } = useOffline();
  const locPerm = usePermission('geolocation');
  const requestGen = useRef(0);

  // Auto-load last city on mount or when back online
  useEffect(() => {
    const lastCity = localStorage.getItem('dehati_last_city');
    if (lastCity && !isOffline && !weather) {
      handleCitySelect(lastCity);
    }
  }, [isOffline]); // eslint-disable-line

  const fetchWeatherAndAdvice = async (weatherData) => {
    setWeather(weatherData);
    setAdviceLoading(true);
    try {
      const prompt = `موسم: ${weatherData.condition}, درجہ حرارت: ${weatherData.temp}°C, نمی: ${weatherData.humidity}%, ہوا: ${weatherData.windSpeed} km/h\n\nآج کے موسم کے مطابق پنجاب کے کسانوں کے لیے 2-3 عملی مشورے دیں (آبپاشی، سپرے، دھوپ سے بچاؤ وغیرہ)`;
      const data = await askAI(prompt);
      setAdvice(data?.answer || null);
    } catch {
      setAdvice('AI مشورہ فی الحال دستیاب نہیں — موسمی کالم کے مطابق احتیاط کریں۔');
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
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 15000, maximumAge: 300000, enableHighAccuracy: false })
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
    const gen = ++requestGen.current;
    setSelectedCity(city); setLoading(true); setError('');
    localStorage.setItem('dehati_last_city', city);
    try {
      const data = await getWeatherByCity(city);
      if (gen !== requestGen.current) return;
      await fetchWeatherAndAdvice(data);
    } catch (err) {
      if (gen !== requestGen.current) return;
      setError(err.message || 'موسم نہیں ملا');
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const weekSpeech = weather ? buildWeekSpeech(weather.forecast, weather.cityName) : '';

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Hero Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A1E 0%, #264D24 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>🌤️</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>موسم کی معلومات</h2>
          <p style={{ opacity: .8, fontSize: '.82rem', margin: 0 }}>Open-Meteo • 7 دن کی پیشگوئی • مفت</p>
        </div>

        {/* ── City Selector ── */}
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

        {/* Permission modal */}
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
            {/* ── Current Weather Card ── */}
            <div className="weather-main">
              <div className="weather-emoji">{weather.emoji}</div>
              <div className="weather-temp">{weather.temp}°C</div>
              <div style={{ fontSize: '1.1rem', marginTop: '.3rem', fontWeight: 700 }}>{weather.condition}</div>
              {weather.cityName && (
                <div style={{ fontSize: '.8rem', opacity: .7, marginTop: '.2rem' }}>{weather.cityName}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
                {[
                  { label: 'نمی',      value: `${weather.humidity ?? 50}%` },
                  { label: 'جیسا لگے', value: `${weather.feelsLike ?? weather.temp ?? 25}°` },
                  { label: 'ہوا',      value: `${weather.windSpeed ?? 10} km/h` }
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: '.72rem', opacity: .75 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Trust Stamp */}
              <div style={{
                marginTop: '1rem', background: 'rgba(255,255,255,.15)',
                borderRadius: 8, padding: '6px 12px',
                fontSize: '.68rem', color: 'rgba(255,255,255,.85)',
                fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
              }}>
                ✓ Verified — Pakistan Meteorological & Open-Meteo Data
                {weather.updatedAt && <span>• آخری تازہ کاری: {formatTime(weather.updatedAt)}</span>}
                {weather.fallback && <span>• تخمینہ</span>}
              </div>
            </div>

            {/* ── 7-Day Forecast Strip ── */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div>
                {/* Header with audio reader */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '.75rem', flexWrap: 'wrap', gap: 8
                }}>
                  <div>
                    <div className="section-title" style={{ marginBottom: 0 }}>📅 7 دن کی پیشگوئی</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>7-Day Forecast</div>
                  </div>
                  {weekSpeech && (
                    <AudioPlayer
                      text={weekSpeech}
                      langKey="ur"
                      label="🔊 پورے ہفتے کی ہدایت سنیں"
                    />
                  )}
                </div>

                {/* Horizontal scroll card strip */}
                <div style={{
                  display: 'flex', gap: 10, overflowX: 'auto',
                  paddingBottom: 8, scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0,0,0,.1) transparent'
                }}>
                  {weather.forecast.map((day, i) => (
                    <ForecastDayCard key={day.date} day={day} isToday={i === 0} />
                  ))}
                </div>

                {/* Severe weather alerts summary */}
                {weather.forecast.some(d => d.alerts?.length > 0) && (
                  <div style={{
                    background: '#fffbeb', border: '1.5px solid #fbbf24',
                    borderRadius: 10, padding: '10px 14px', marginTop: '.5rem'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '.8rem', color: '#92400e', marginBottom: 6, direction: 'rtl' }}>
                      ⚠️ اس ہفتے کی موسمی انتباہات:
                    </div>
                    {weather.forecast.filter(d => d.alerts?.length > 0).map(day => (
                      <div key={day.date} style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        marginBottom: 4, flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '.75rem', fontWeight: 700, color: '#374151',
                          fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl', minWidth: 40
                        }}>{day.dayName}:</span>
                        {day.alerts.map(a => (
                          <span key={a.type} style={{
                            background: ALERT_STYLES[a.type]?.bg,
                            color: ALERT_STYLES[a.type]?.color,
                            border: `1px solid ${ALERT_STYLES[a.type]?.border}`,
                            borderRadius: 6, padding: '1px 8px',
                            fontSize: '.68rem', fontWeight: 800
                          }}>{a.label}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Weekly Farmer Action Schedule ── */}
            {weather.forecast && weather.forecast.length > 0 && (
              <WeeklySchedule forecast={weather.forecast} />
            )}

            {/* ── AI Advisory Card ── */}
            {adviceLoading && (
              <div className="loading-container"><div className="spinner" /><p>AI زرعی مشورہ تیار ہو رہا ہے...</p></div>
            )}

            {advice && (
              <div className="ai-response-card animate-fade-in-up">
                <div className="ai-response-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>🌾 آج کے موسم کے مطابق مشورہ</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AIDisclaimer small />
                    <AudioPlayer text={advice} langKey="ur" label="🔊 مشورہ سنیں" />
                  </div>
                </div>
                <MarkdownRenderer text={advice} />
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
