require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const { apiLimiter } = require('./middleware/rateLimit');
const { initDB }     = require('./lib/db');

const authRoutes   = require('./routes/auth');
const aiRoutes     = require('./routes/ai');
const weatherRoutes = require('./routes/weather');
const adminRoutes  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// Trust Railway's reverse proxy (fixes express-rate-limit X-Forwarded-For)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS: strict allowlist — no wildcard *.vercel.app / *.railway.app ─────────
const ALLOWED_ORIGINS = new Set([
  process.env.FRONTEND_ORIGIN,              // e.g. https://dehati-ai.vercel.app (set in Railway)
  'https://dehati-ai.vercel.app',           // hardcoded production fallback
  'https://www.dehati-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and whitelisted origins only
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Health check — public, no auth
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DehatiAI API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth',    authRoutes);
app.use('/api/ai',      aiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/admin',   adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'راستہ نہیں ملا' });
});

// Global error handler — never leak stack traces to client
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'سرور میں مسئلہ ہوا — دوبارہ کوشش کریں' });
});

app.listen(PORT, async () => {
  // SECURITY: do NOT log admin email or credentials at startup
  const claudeReady    = !!process.env.CLAUDE_API_KEY;
  const supabaseReady  = !!process.env.SUPABASE_URL;
  const jwtConfigured  = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32;
  const dbReady        = !!process.env.DATABASE_URL;
  console.log(`✅ DehatiAI API running on port ${PORT}`);
  console.log(`   Claude API : ${claudeReady   ? '✅ configured' : '⚠️  not set — AI disabled'}`);
  console.log(`   PostgreSQL : ${dbReady        ? '✅ configured' : '⚠️  not set — data lost on restart'}`);
  console.log(`   Supabase   : ${supabaseReady  ? '✅ configured' : '⚠️  not set'}`);
  console.log(`   JWT Secret : ${jwtConfigured  ? '✅ configured' : '⚠️  using dev fallback'}`);
  // Init DB tables (safe to call multiple times — uses IF NOT EXISTS)
  await initDB();
});

