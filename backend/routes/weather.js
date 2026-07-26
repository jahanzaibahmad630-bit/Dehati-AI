const express = require('express');
const { PUNJAB_CITIES } = require('../data/cities');

const router = express.Router();

const WEATHER_CODES = {
  0: { desc: 'صاف آسمان', emoji: '☀️' },
  1: { desc: 'زیادہ تر صاف', emoji: '🌤️' },
  2: { desc: 'جزوی ابر آلود', emoji: '⛅' },
  3: { desc: 'ابر آلود', emoji: '☁️' },
  45: { desc: 'دھند', emoji: '🌫️' },
  48: { desc: 'شدید دھند', emoji: '🌫️' },
  51: { desc: 'ہلکی بارش', emoji: '🌦️' },
  53: { desc: 'درمیانی بارش', emoji: '🌧️' },
  55: { desc: 'شدید بارش', emoji: '🌧️' },
  61: { desc: 'بارش', emoji: '🌧️' },
  63: { desc: 'درمیانی بارش', emoji: '🌧️' },
  65: { desc: 'شدید بارش', emoji: '🌧️' },
  71: { desc: 'برف', emoji: '🌨️' },
  73: { desc: 'برف باری', emoji: '❄️' },
  80: { desc: 'بوندا باندی', emoji: '🌦️' },
  81: { desc: 'بارش کے چھینٹے', emoji: '🌦️' },
  82: { desc: 'شدید بوندا باندی', emoji: '🌧️' },
  95: { desc: 'آندھی', emoji: '⛈️' },
  99: { desc: 'شدید آندھی اور اولے', emoji: '⛈️' }
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { desc: 'نامعلوم', emoji: '🌡️' };
}

async function fetchWeather(lat, lon) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation');
    url.searchParams.set('timezone', 'Asia/Karachi');
    url.searchParams.set('forecast_days', '1');

    // 8-second timeout to prevent hanging connections
    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000)
    });

    if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);

    const data = await resp.json();
    if (!data?.current) throw new Error('Invalid Open-Meteo response — missing current weather data');

    const c = data.current;
    const weatherCode = typeof c.weather_code === 'number' ? c.weather_code : 0;
    const info = getWeatherInfo(weatherCode);

    // Defensive number parsing — guaranteed non-null, non-NaN
    const temp          = typeof c.temperature_2m === 'number' && !isNaN(c.temperature_2m) ? Math.round(c.temperature_2m) : 28;
    const feelsLike     = typeof c.apparent_temperature === 'number' && !isNaN(c.apparent_temperature) ? Math.round(c.apparent_temperature) : temp;
    const humidity      = typeof c.relative_humidity_2m === 'number' && !isNaN(c.relative_humidity_2m) ? Math.round(c.relative_humidity_2m) : 55;
    const windSpeed     = typeof c.wind_speed_10m === 'number' && !isNaN(c.wind_speed_10m) ? Math.round(c.wind_speed_10m) : 12;
    const precipitation = typeof c.precipitation === 'number' && !isNaN(c.precipitation) ? c.precipitation : 0;

    return {
      temp,
      feelsLike,
      humidity,
      windSpeed,
      precipitation,
      condition: info.desc,
      emoji: info.emoji,
      weatherCode,
      source: 'Open-Meteo',
      sourceUrl: 'https://open-meteo.com',
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('Open-Meteo fetch failed, using seasonal fallback:', err.message);
    // Fallback seasonal weather for Punjab so app never crashes
    const month = new Date().getMonth() + 1;
    const isSummer = month >= 4 && month <= 9;
    const temp = isSummer ? 34 : 22;
    return {
      temp,
      feelsLike: temp + 2,
      humidity: 50,
      windSpeed: 10,
      precipitation: 0,
      condition: isSummer ? 'صاف اور گرم' : 'معتدل موسم',
      emoji: '🌤️',
      weatherCode: 1,
      source: 'Dehati-Estimate',
      updatedAt: new Date().toISOString(),
      fallback: true
    };
  }
}

// L6 fix: 10-minute in-memory cache keyed by "lat,lon" to prevent Open-Meteo rate limiting
const weatherCache = new Map();
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedWeather(key) {
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > WEATHER_CACHE_TTL) { weatherCache.delete(key); return null; }
  return entry.data;
}
function setCachedWeather(key, data) {
  // Keep cache size under control (max 100 entries)
  if (weatherCache.size >= 100) weatherCache.delete(weatherCache.keys().next().value);
  weatherCache.set(key, { data, ts: Date.now() });
}

// GET /api/weather?lat=&lon= OR ?city=
router.get('/', async (req, res) => {
  try {
    let { lat, lon, city } = req.query;

    if (city) {
      const key = city.toLowerCase().trim();
      const cityData = PUNJAB_CITIES[key];
      if (!cityData) {
        return res.status(404).json({
          error: `شہر "${city}" کا ڈیٹا نہیں ملا`,
          availableCities: Object.keys(PUNJAB_CITIES)
        });
      }
      lat = cityData.lat;
      lon = cityData.lon;
    }

    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat اور lon یا city پیرامیٹر ضروری ہے' });
    }

    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      return res.status(400).json({ error: 'lat اور lon مناسب نمبر ہونے چاہیں' });
    }

    const cacheKey = `${parsedLat.toFixed(2)},${parsedLon.toFixed(2)}`;
    const cached = getCachedWeather(cacheKey);
    if (cached) return res.json(cached);

    const weather = await fetchWeather(parsedLat, parsedLon);
    if (city) {
      const key = city.toLowerCase().trim();
      weather.cityName = PUNJAB_CITIES[key]?.name || city;
    }
    setCachedWeather(cacheKey, weather);
    res.json(weather);
  } catch (err) {
    console.error('Weather error:', err.message);
    res.status(500).json({ error: 'موسم کی معلومات نہیں مل سکیں — دوبارہ کوشش کریں' });
  }
});

// GET /api/weather/cities
router.get('/cities', (req, res) => {
  const cities = Object.entries(PUNJAB_CITIES).map(([key, val]) => ({
    key,
    nameUrdu: val.name,
    lat: val.lat,
    lon: val.lon
  }));
  res.json({ cities });
});

module.exports = router;
