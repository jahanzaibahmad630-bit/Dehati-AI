const rateLimit = require('express-rate-limit');

// Global: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'درخواست کی حد ختم ہو گئی — 15 منٹ بعد دوبارہ کوشش کریں' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

// AI endpoints: 30 calls per hour per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'آپ کے روزانہ AI سوالات کی حد پوری ہو گئی ہے۔ براہ کرم کچھ دیر بعد کوشش کریں۔',
    code: 'AI_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const diseaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: {
    error: 'تصویر تجزیہ کی حد پوری ہو گئی — ایک گھنٹے بعد دوبارہ کوشش کریں',
    code: 'DISEASE_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin login: strict brute-force protection — 10 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // only count failed attempts
});

module.exports = { apiLimiter, aiLimiter, adminLoginLimiter, diseaseLimiter };
