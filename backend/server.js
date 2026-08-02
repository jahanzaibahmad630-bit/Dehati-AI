require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const { apiLimiter } = require('./middleware/rateLimit');
const { initDB }     = require('./lib/db');

// ─── Process-level safety nets (prevents one bad request killing the process) ──
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception (non-fatal):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection (non-fatal):', reason?.message || reason);
});

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
  process.env.FRONTEND_ORIGIN,
  'https://dehati-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and whitelisted origins only
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Handle preflight (OPTIONS) for ALL routes before any auth/rate-limit middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Force UTF-8 on all JSON responses
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  next();
});

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Health check — public, no auth, no rate-limit
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status:    'ok',
    service:   'DehatiAI API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    env: {
      claude:    !!process.env.CLAUDE_API_KEY,
      postgres:  !!process.env.DATABASE_URL,
      supabase:  !!process.env.SUPABASE_URL,
      jwt:       !!process.env.JWT_SECRET
    },
    memory: {
      heapUsedMB:  +(mem.heapUsed  / 1048576).toFixed(1),
      heapTotalMB: +(mem.heapTotal / 1048576).toFixed(1),
      rssMB:       +(mem.rss       / 1048576).toFixed(1)
    }
  });
});

// Public emergency alerts (no auth needed)
app.get('/api/public/emergency-alerts', async (req, res) => {
  try {
    const db = require('./lib/db');
    const alerts = await db.getEmergencyAlerts({ activeOnly: true });
    res.json({ alerts });
  } catch (err) {
    res.json({ alerts: [] });
  }
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

const server = app.listen(PORT, async () => {
  const claudeReady   = !!process.env.CLAUDE_API_KEY;
  const supabaseReady = !!process.env.SUPABASE_URL;
  const jwtSet        = !!process.env.JWT_SECRET;
  const dbReady       = !!process.env.DATABASE_URL;
  console.log(`✅ DehatiAI API running on port ${PORT}`);
  console.log(`   Claude API : ${claudeReady   ? '✅ configured' : '⚠️  not set — AI disabled'}`);
  console.log(`   PostgreSQL : ${dbReady        ? '✅ configured' : '⚠️  not set — data lost on restart'}`);
  console.log(`   Supabase   : ${supabaseReady  ? '✅ configured' : '⚠️  not set'}`);
  console.log(`   JWT Secret : ${jwtSet         ? '✅ configured' : '⚠️  MISSING — using insecure dev fallback!'}`);
  // Init DB tables (safe — uses IF NOT EXISTS)
  try {
    await initDB();
  } catch (e) {
    console.error('⚠️  initDB failed (non-fatal):', e.message);
  }
});

// 120-second socket timeout — prevents Railway from killing cold-start requests
// SSE streaming endpoints override this via res.setTimeout(0)
server.timeout = 120000;
server.keepAliveTimeout = 65000; // must be > Railway's 60s LB keepalive

