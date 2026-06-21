# DehatiAI Backend Setup

## Quick Start

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
npm install
npm run dev
```

## Environment Variables

See `.env.example` for all required variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | For AI features | Anthropic Claude API key |
| `SUPABASE_URL` | For auth persistence | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | For auth persistence | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | For auth persistence | Supabase service role key |
| `JWT_SECRET` | Yes (change in prod) | Min 32-char random string |
| `FRONTEND_ORIGIN` | For CORS | Your frontend URL |
| `PORT` | No (default 3001) | Server port |

> **Dev Mode**: Without Supabase keys, the server runs in dev mode — auth uses mock users and no data is persisted.

---

## Supabase Database Setup

Run this SQL in your Supabase project SQL Editor (**Database → SQL Editor → New Query**):

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  district TEXT,
  land_size NUMERIC,
  password_hash TEXT NOT NULL,
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- AI usage tracking (for rate limiting per user)
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  call_count INTEGER DEFAULT 1,
  UNIQUE(user_id, date)
);

-- Row Level Security (enable for production)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/auth/register` | None | Register farmer |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/guest` | None | Guest access token |
| POST | `/api/ai/ask` | JWT | AI farming Q&A |
| POST | `/api/ai/disease` | JWT | Crop disease detection (vision) |
| POST | `/api/ai/chat` | JWT | Conversational chatbot |
| POST | `/api/ai/animal` | JWT | Animal health advisor |
| POST | `/api/ai/fertilizer` | JWT | Fertilizer recommendation |
| GET | `/api/weather` | None | Current weather by lat/lon or city |
| GET | `/api/weather/cities` | None | List of supported Punjab cities |

### Rate Limits
- **Global**: 200 requests / 15 minutes per IP
- **AI endpoints**: 30 requests / hour per IP

---

## Request Examples

### Register
```json
POST /api/auth/register
{
  "name": "محمد علی",
  "phone": "03001234567",
  "district": "لاہور",
  "landSize": 5,
  "password": "mypassword"
}
```

### AI Ask
```json
POST /api/ai/ask
Authorization: Bearer <token>
{
  "question": "گندم میں پانی کب دینا چاہیے؟"
}
```

### Weather by City
```
GET /api/weather?city=lahore
GET /api/weather?lat=31.5204&lon=74.3587
```

### Disease Detection
```json
POST /api/ai/disease
Authorization: Bearer <token>
{
  "imageBase64": "<base64 encoded image>",
  "cropName": "گندم",
  "mimeType": "image/jpeg"
}
```

---

## Deployment (Railway)

1. Create account at [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub**
3. Set all environment variables from `.env.example`
4. Railway auto-detects Node.js and runs `npm start`
5. Note your Railway URL and set it as `FRONTEND_ORIGIN` → `VITE_API_URL` in the frontend

## Deployment (Render)

1. Create account at [render.com](https://render.com)
2. **New → Web Service → Connect GitHub repo**
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in the Render dashboard

---

## Project Structure

```
backend/
├── server.js              # Express app entry point
├── package.json
├── .env.example           # Environment variable template
├── lib/
│   └── supabase.js        # Supabase client (with dev-mode fallback)
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── rateLimit.js       # Rate limiting
├── routes/
│   ├── auth.js            # /api/auth/*
│   ├── ai.js              # /api/ai/*
│   └── weather.js         # /api/weather/*
└── data/
    └── cities.js          # Punjab cities coordinates
```
