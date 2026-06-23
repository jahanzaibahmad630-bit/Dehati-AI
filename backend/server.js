require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const weatherRoutes = require('./routes/weather');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway's reverse proxy (fixes express-rate-limit X-Forwarded-For warning)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DehatiAI API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/weather', weatherRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'راستہ نہیں ملا' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'سرور میں مسئلہ ہوا — دوبارہ کوشش کریں' });
});

app.listen(PORT, () => {
  console.log(`✅ DehatiAI API running on port ${PORT}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅ configured' : '⚠️  not set (AI features disabled)'}`);
  console.log(`   Supabase:   ${process.env.SUPABASE_URL ? '✅ configured' : '⚠️  not set (dev mode)'}`);
});
