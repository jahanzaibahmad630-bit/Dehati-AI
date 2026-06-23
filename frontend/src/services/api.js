const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('dehati_token');
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'درخواست ناکام');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

// === AI API ===
export async function askAI(question) {
  const res = await fetch(`${API_URL}/api/ai/ask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ question })
  });
  return handleResponse(res);
}

export async function detectDisease(imageBase64, cropName, mimeType = 'image/jpeg') {
  const res = await fetch(`${API_URL}/api/ai/disease`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ imageBase64, cropName, mimeType })
  });
  return handleResponse(res);
}

export async function chatWithAI(messages, language = 'ur') {
  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ messages, language })
  });
  return handleResponse(res);
}

export async function askAnimalHealth(animalType, symptoms, question) {
  const res = await fetch(`${API_URL}/api/ai/animal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ animalType, symptoms, question })
  });
  return handleResponse(res);
}

export async function askFertilizer(crop, soilType, stage) {
  const res = await fetch(`${API_URL}/api/ai/fertilizer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ crop, soilType, stage })
  });
  return handleResponse(res);
}

// === Weather API ===
export async function getWeatherByCoords(lat, lon) {
  const res = await fetch(`${API_URL}/api/weather?lat=${lat}&lon=${lon}`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}

export async function getWeatherByCity(city) {
  const res = await fetch(`${API_URL}/api/weather?city=${encodeURIComponent(city)}`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}

export async function getCities() {
  const res = await fetch(`${API_URL}/api/weather/cities`);
  return handleResponse(res);
}

// === Market API ===
export async function getMarketPrices() {
  const res = await fetch(`${API_URL}/api/market`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}

// === Auth API ===
export async function register({ name, phone, password, district, landSize }) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password, district, landSize })
  });
  return handleResponse(res);
}

export async function login({ phone, password }) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  return handleResponse(res);
}

export async function guestLogin() {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(res);
}

// === Image compression helper ===
export async function compressImage(file, maxSizeMB = 0.8) {
  const imageCompression = (await import('browser-image-compression')).default;
  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };
  return imageCompression(file, options);
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Remove data URL prefix: "data:image/jpeg;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
