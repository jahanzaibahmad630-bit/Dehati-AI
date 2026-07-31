import { API_URL } from '../config';

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

export async function detectDisease(imageBase64, cropName, mimeType = 'image/jpeg', diseaseKey = null) {
  const res = await fetch(`${API_URL}/api/ai/disease`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ imageBase64, cropName, mimeType, diseaseKey })
  });
  return handleResponse(res);
}

export async function getDiseaseCatalog() {
  const res = await fetch(`${API_URL}/api/ai/disease-catalog`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}

export async function chatWithAI(messages, language = 'ur') {
  const lastUserMsg = Array.isArray(messages)
    ? messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
    : (typeof messages === 'string' ? messages : '');
  const res = await fetch(`${API_URL}/api/ai/ask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ question: lastUserMsg, language })
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

export async function askFertilizer(crop, soilType, cropAge) {
  const res = await fetch(`${API_URL}/api/ai/fertilizer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ crop, soilType, cropAge })
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
// Uses canvas-based resize as primary (no extra memory from web worker)
// Falls back to browser-image-compression for complex formats
export async function compressImage(file, maxSizeMB = 0.4) {
  // Step 1: Canvas-based resize — works on ALL phones, no memory spike
  try {
    const compressed = await canvasResize(file, 800, 0.82);
    // If already small enough, use canvas result directly
    if (compressed.size <= maxSizeMB * 1024 * 1024) return compressed;
  } catch (_) {
    // canvas failed — fall through to library
  }

  // Step 2: Library fallback (disabled web worker to prevent low-memory crash)
  const imageCompression = (await import('browser-image-compression')).default;
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 800,
    useWebWorker: false,   // <-- CRITICAL: prevents "low memory" crash on cheap Android
    fileType: 'image/jpeg',
    initialQuality: 0.82
  });
}

// Canvas-based resize: safest on low-RAM devices
function canvasResize(file, maxDim, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Scale down if needed
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else                { width  = Math.round((width  * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          resolve(new File([blob], 'compressed.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };

    img.src = url;
  });
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
