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

// Urdu weekday names
const URDU_WEEKDAYS = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { desc: 'نامعلوم', emoji: '🌡️' };
}

function safeNum(val, fallback) {
  return typeof val === 'number' && !isNaN(val) ? val : fallback;
}

/**
 * Determine severe weather alerts for a day based on thresholds
 */
function getSevereAlerts(maxTemp, minTemp, windSpeed, rainProb) {
  const alerts = [];
  if (maxTemp > 40)  alerts.push({ type: 'heatwave', label: '🔥 شدید گرمی', color: '#dc2626', bg: '#fef2f2' });
  if (minTemp <= 4)  alerts.push({ type: 'frost',    label: '🧊 کورا / شدید ٹھنڈ', color: '#0284c7', bg: '#e0f2fe' });
  if (rainProb > 60) alerts.push({ type: 'rain',     label: '🌧️ بھاری بارش', color: '#1d4ed8', bg: '#eff6ff' });
  if (windSpeed > 20) alerts.push({ type: 'wind',   label: '💨 تیز ہوا',    color: '#6d28d9', bg: '#f5f3ff' });
  return alerts;
}

/**
 * Generate a farm action recommendation for a day based on weather conditions
 */
function getFarmAction(maxTemp, minTemp, windSpeed, rainProb, weatherCode) {
  const actions = [];

  // Irrigation advice
  if (rainProb > 60) {
    actions.push('آبپاشی بند کریں — بارش ہوگی');
  } else if (maxTemp > 38) {
    actions.push('صبح سویرے یا شام کو آبپاشی کریں');
  } else {
    actions.push('معمول کے مطابق آبپاشی کریں');
  }

  // Spray advice
  if (windSpeed > 20) {
    actions.push('سپرے مت کریں — ہوا تیز ہے');
  } else if (rainProb > 50) {
    actions.push('کیمیائی سپرے ملتوی کریں');
  } else if (maxTemp < 35 && windSpeed < 15) {
    actions.push('سپرے کے لیے موزوں موسم');
  }

  // Fertilizer advice
  if (rainProb > 40) {
    actions.push('کھاد ڈالنے سے گریز کریں');
  } else if (maxTemp > 40) {
    actions.push('دوپہر کو کھیت میں کام نہ کریں');
  }

  return actions.slice(0, 2); // Max 2 actions per day for brevity
}

async function fetchWeather(lat, lon) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    // Current weather
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation');
    // 7-day daily forecast — all fields needed for farm actions
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_probability_max,precipitation_sum');
    url.searchParams.set('timezone', 'Asia/Karachi');
    url.searchParams.set('forecast_days', '7');

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000)
    });

    if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);

    const data = await resp.json();
    if (!data?.current) throw new Error('Invalid Open-Meteo response — missing current weather data');

    const c = data.current;
    const weatherCode = safeNum(c.weather_code, 1);
    const info = getWeatherInfo(weatherCode);

    // Current weather object
    const current = {
      temp:         Math.round(safeNum(c.temperature_2m, 28)),
      feelsLike:    Math.round(safeNum(c.apparent_temperature, 30)),
      humidity:     Math.round(safeNum(c.relative_humidity_2m, 55)),
      windSpeed:    Math.round(safeNum(c.wind_speed_10m, 12)),
      precipitation: safeNum(c.precipitation, 0),
      condition:    info.desc,
      emoji:        info.emoji,
      weatherCode,
      source:       'Open-Meteo',
      sourceUrl:    'https://open-meteo.com',
      updatedAt:    new Date().toISOString()
    };

    // 7-day daily forecast
    let forecast = [];
    if (data.daily?.time) {
      const d = data.daily;
      forecast = d.time.map((dateStr, i) => {
        const maxTemp  = Math.round(safeNum(d.temperature_2m_max?.[i], 30));
        const minTemp  = Math.round(safeNum(d.temperature_2m_min?.[i], 20));
        const humidity = Math.round(safeNum(d.relative_humidity_2m_max?.[i], 55));
        const wind     = Math.round(safeNum(d.wind_speed_10m_max?.[i], 10));
        const rainProb = Math.round(safeNum(d.precipitation_probability_max?.[i], 0));
        const rainSum  = safeNum(d.precipitation_sum?.[i], 0).toFixed(1);
        const code     = safeNum(d.weather_code?.[i], 1);
        const wInfo    = getWeatherInfo(code);
        const date     = new Date(dateStr);
        const dayName  = URDU_WEEKDAYS[date.getDay()];
        const isToday  = i === 0;

        return {
          date:     dateStr,
          dayName:  isToday ? 'آج' : dayName,
          maxTemp,
          minTemp,
          humidity,
          windSpeed: wind,
          rainProb,
          rainSum,
          weatherCode: code,
          condition:   wInfo.desc,
          emoji:       wInfo.emoji,
          alerts:      getSevereAlerts(maxTemp, minTemp, wind, rainProb),
          farmActions: getFarmAction(maxTemp, minTemp, wind, rainProb, code)
        };
      });
    }

    return { ...current, forecast };
  } catch (err) {
    console.warn('Open-Meteo fetch failed, using seasonal fallback:', err.message);
    const month = new Date().getMonth() + 1;
    const isSummer = month >= 4 && month <= 9;
    const temp = isSummer ? 34 : 22;

    // Generate synthetic 7-day fallback forecast
    const fallbackForecast = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = i === 0 ? 'آج' : URDU_WEEKDAYS[date.getDay()];
      return {
        date:        date.toISOString().slice(0, 10),
        dayName,
        maxTemp:     temp + Math.floor(Math.random() * 3),
        minTemp:     temp - 8,
        humidity:    50,
        windSpeed:   10,
        rainProb:    0,
        rainSum:     '0.0',
        weatherCode: 1,
        condition:   isSummer ? 'صاف اور گرم' : 'معتدل موسم',
        emoji:       '🌤️',
        alerts:      [],
        farmActions: ['معمول کے مطابق آبپاشی کریں', 'کھیت کا معائنہ کریں']
      };
    });

    return {
      temp, feelsLike: temp + 2, humidity: 50, windSpeed: 10, precipitation: 0,
      condition: isSummer ? 'صاف اور گرم' : 'معتدل موسم',
      emoji: '🌤️', weatherCode: 1,
      source: 'Dehati-Estimate', updatedAt: new Date().toISOString(),
      fallback: true,
      forecast: fallbackForecast
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
