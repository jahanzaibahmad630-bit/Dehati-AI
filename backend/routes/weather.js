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
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation');
  url.searchParams.set('timezone', 'Asia/Karachi');
  url.searchParams.set('forecast_days', '1');

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`Open-Meteo API error: ${resp.status}`);

  const data = await resp.json();
  const c = data.current;
  const info = getWeatherInfo(c.weather_code);

  return {
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    precipitation: c.precipitation,
    condition: info.desc,
    emoji: info.emoji,
    weatherCode: c.weather_code,
    source: 'Open-Meteo',
    sourceUrl: 'https://open-meteo.com',
    updatedAt: new Date().toISOString()
  };
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

    const weather = await fetchWeather(parseFloat(lat), parseFloat(lon));
    if (city) {
      const key = city.toLowerCase().trim();
      weather.cityName = PUNJAB_CITIES[key]?.name || city;
    }
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
