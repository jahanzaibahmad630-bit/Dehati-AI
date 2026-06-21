const rateLimit = require('express-rate-limit');

// Global: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'درخواست کی حد ختم ہو گئی — 15 منٹ بعد دوبارہ کوشش کریں'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

// AI endpoints: 30 calls per hour per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'AI کالز کی حد ختم ہو گئی — ایک گھنٹے بعد دوبارہ کوشش کریں',
    code: 'AI_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter, aiLimiter };
