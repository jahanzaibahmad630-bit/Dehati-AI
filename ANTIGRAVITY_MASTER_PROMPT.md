# ⚡ DehatiAI — Master Antigravity CLI Zero-to-Hero Execution Blueprint

> **Target Engine**: Google Antigravity CLI (`agy`) / Antigravity IDE  
> **Starting Point**: Empty Directory (`0` files)  
> **Guaranteed Outcome**: 100% Production-Ready, Zero-Bug Clone of DehatiAI (Frontend PWA + Express Backend + Postgres DB + Anthropic Vision AI + Admin Dashboard).

---

## 📋 COPY & PASTE THIS ENTIRE PROMPT INTO ANTIGRAVITY (`agy`):

```text
Act as an Elite Principal Software Architect and Lead Antigravity Engineer.

Build the entire "DehatiAI" platform from absolute scratch in an empty directory. Every file must be created with 100% COMPLETE, PRODUCTION-READY CODE. Do not leave any placeholders, incomplete functions, or TODO comments.

================================================================================
1. ARCHITECTURE & ZERO-BUG CONTRACTS
================================================================================
Directory Structure:
./backend/  (Node.js v20+ + Express + Railway PostgreSQL Pool + Supabase Fallback)
./frontend/ (Vite + React 19 + PWA + Noto Nastaliq Urdu Fonts + Glassmorphism UI)

EMBEDDED BUG FIXES (MUST IMPLEMENT):
1. LLM Model: Use 'claude-3-5-sonnet-20241022' for all Anthropic calls.
2. Weather Resiliency: Use AbortSignal.timeout(8000), defensive number parsing (Math.round with NaN fallbacks), and a seasonal Punjab fallback for network dropouts.
3. Questions Logging: Ensure /ask, /fertilizer, and /animal endpoints explicitly call db.saveChatLog().catch(() => {}) so all farmer questions appear in the Admin Questions tab.
4. L1 Cache LRU Eviction: In backend/lib/aiCache.js, re-insert keys on L1 hits to maintain true LRU order.
5. SSE Stream Safety: In backend/routes/ai.js, execute clearInterval(heartbeat) inside a try...finally block.
6. Production Security Guard: In backend/server.js, execute process.exit(1) if NODE_ENV === 'production' and JWT_SECRET is unset.
7. Base64URL JWT Decoder: In frontend/src/context/AuthContext.jsx, use a safe Base64URL decoder instead of raw atob().
8. Pure UTF-8 Urdu: All Mandi prices, seasons (خریف/ربیع), and UI text must be clean UTF-8 strings without Mojibake.

================================================================================
2. STEP-BY-STEP FILE GENERATION PLAN
================================================================================

--------------------------------------------------------------------------------
STEP 2.1 — BACKEND FILE GENERATION
--------------------------------------------------------------------------------

Write `./backend/package.json`:
```json
{
  "name": "dehati-ai-backend",
  "version": "1.0.0",
  "description": "DehatiAI Secure Production API Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.3",
    "@supabase/supabase-js": "^2.45.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.22.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Write `./backend/server.js`:
- Load dotenv (`require('dotenv').config()`).
- Helmet with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
- Express JSON limit: `15mb`.
- Trust Proxy: `app.set('trust proxy', 1)`.
- CORS Whitelist: `process.env.FRONTEND_ORIGIN`, `http://localhost:5173`, `http://localhost:4173`, `https://dehati-ai.vercel.app`.
- Apply `apiLimiter` globally.
- Health Check: `GET /api/health` returning status ok, timestamp, service name.
- Mount Routes: `/api/auth`, `/api/ai`, `/api/weather`, `/api/admin`.
- Production Exit Guard: If `process.env.NODE_ENV === 'production'` and `!process.env.JWT_SECRET`, log error and exit 1.
- Global 500 Error Handler returning Urdu error message.

Write `./backend/data/cities.js`:
- Export `PUNJAB_CITIES` object mapping 30+ Punjab cities (lahore, faisalabad, multan, rawalpindi, gujranwala, sialkot, bahawalpur, sargodha, sheikhupura, jhang, rahim yar khan, gujrat, kasur, okara, sahiwal, dera ghazi khan, mianwali, chiniot, hafizabad, muzaffargarh, vehari, khanewal, pakpattan, attock, chakwal, jhelum, narowal, nankana sahib, toba tek singh, wah cantt) with `lat`, `lon`, and `name` (Urdu).

Write `./backend/lib/db.js`:
- PostgreSQL Pool initialization using `process.env.DATABASE_URL`.
- Supabase fallback helper using `process.env.SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`.
- Auto DDL Tables Initialization:
  1. `users` (id SERIAL PRIMARY KEY, name TEXT, phone TEXT UNIQUE, district TEXT, land_size NUMERIC, password_hash TEXT, created_at TIMESTAMP DEFAULT NOW())
  2. `chat_logs` (id SERIAL PRIMARY KEY, user_id TEXT, question TEXT, answer TEXT, tool_name TEXT, tokens_used INT, created_at TIMESTAMP DEFAULT NOW())
  3. `mandi_prices` (crop_key TEXT PRIMARY KEY, crop_name_ur TEXT, price NUMERIC, unit TEXT, category TEXT, source_note TEXT, updated_at TIMESTAMP DEFAULT NOW())
  4. `ai_cache` (key TEXT PRIMARY KEY, value TEXT, language TEXT DEFAULT 'ur', expires_at TIMESTAMP)
  5. `admin_audit_logs` (id SERIAL PRIMARY KEY, admin_id TEXT, action_type TEXT, details JSONB, ip_address TEXT, created_at TIMESTAMP DEFAULT NOW())
  6. `ai_usage_stats` (id SERIAL PRIMARY KEY, endpoint TEXT, tokens_in INT, tokens_out INT, cache_tokens INT, estimated_cost_usd NUMERIC, created_at TIMESTAMP DEFAULT NOW())
  7. `emergency_alerts` (id SERIAL PRIMARY KEY, title TEXT, message TEXT, severity TEXT, target_districts JSONB, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())
  8. `announcements` (id SERIAL PRIMARY KEY, title TEXT, content TEXT, category TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW())
  9. `schemes` (id SERIAL PRIMARY KEY, title TEXT, department TEXT, description TEXT, eligibility TEXT, apply_url TEXT, created_at TIMESTAMP DEFAULT NOW())
- Complete methods: `createUser`, `findUserByPhone`, `saveChatLog`, `getChatLogs`, `getPricesDB`, `updatePriceDB`, `logAuditAction`, `getAuditLogs`, `logAIUsage`, `getAIUsageStats`, `getEmergencyAlerts`, `createEmergencyAlert`, `toggleEmergencyAlert`, `setCacheInDB`, `getCacheFromDB`, `flushCacheDB`, `getCacheStats`, `exportDBBackup`, `purgeChatLogs`.

Write `./backend/lib/aiCache.js`:
- L1 Memory (`Map`) + L2 PostgreSQL (`ai_cache` table).
- Key normalization: `normalizeKey(text, lang)`. Strip punctuation `[؟?!.,،;:\-]`, prefix `ur:`, lowercase.
- True LRU behavior: On L1 hit, re-insert key to move to back of insertion order. TTL: 7 days.
- Methods: `get`, `set`, `flush`, `stats`.

Write `./backend/middleware/auth.js`:
- `signToken(user)`: Sign JWT using `JWT_SECRET` with 30-day expiry.
- `authenticateToken`: Validate Bearer token. On failure, return 401/403 with Urdu error.
- `optionalAuth`: Attach user to req if token valid, proceed regardless.

Write `./backend/middleware/rateLimit.js`:
- `apiLimiter`: 200 req/15min.
- `aiLimiter`: 30 AI calls/hr per IP.

Write `./backend/routes/auth.js`:
- `/register`: Clean phone, validate length, hash password with bcryptjs (12 rounds), insert into `users`, return token + user.
- `/login`: Clean phone, fetch user, compare bcrypt hash, sign token, return token + user.
- `/guest`: Create guest user session payload, sign token, return token + user.

Write `./backend/routes/ai.js`:
- Anthropic SDK setup with `CLAUDE_API_KEY`, model `claude-3-5-sonnet-20241022`.
- Keyword Guard: `isAgricultureRelated(text)` scanning `AGRI_KEYWORDS_UR` & `EN`. If false, return Urdu agricultural scope message.
- `/ask`: Check Keyword Guard → Check L1/L2 cache (On HIT: return cached answer & log chat asynchronously) → On MISS: Call Anthropic with `FARMING_SYSTEM` and `cache_control: { type: 'ephemeral' }` → Save to cache → Log usage → Log chat log → Return `{ answer }`.
- `/disease`: Accepts imageBase64, cropName. Calls Claude Vision AI. Enforces structured output (`بیماری`, `وجہ`, `علاج`, `بچاؤ`) emphasizing Pakistan-registered sprays (Topsin-M, Urea, DAP). Parses JSON and returns fields.
- `/chat/stream`: SSE streaming endpoint with 15s heartbeat interval. Token streaming with `stream.on('text')`. Encloses `clearInterval(heartbeat)` in `finally` block before ending response with `data: [DONE]\n\n`.
- `/animal` & `/fertilizer`: Specialized advisory routes logging entries with `[جانور]` and `[کھاد]` prefixes.

Write `./backend/routes/weather.js`:
- `fetchWeather(lat, lon)` using `AbortSignal.timeout(8000)`.
- Defensive number parsing for temp, feelsLike, humidity, windSpeed, precipitation.
- Network Catch: Fallback to seasonal Punjab climate estimates on Open-Meteo failure.
- 10-minute in-memory cache keyed by lat/lon.
- Routes: `GET /` (by coords or city) and `GET /cities`.

Write `./backend/routes/admin.js`:
- Admin routes: `/login`, `/stats`, `/users`, `/prices`, `/prices/public`, `/audit-logs`, `/alerts`, `/alerts/public`, `/announcements`, `/announcements/public`, `/schemes`, `/schemes/public`, `/backup`, `/purge-logs`, `/ai-stats`, `/cache-stats`, `/flush-cache`.

--------------------------------------------------------------------------------
STEP 2.2 — FRONTEND FILE GENERATION
--------------------------------------------------------------------------------

Write `./frontend/package.json`:
Dependencies: `@fontsource/inter`, `@fontsource/noto-nastaliq-urdu`, `browser-image-compression`, `react@^19.2.6`, `react-dom@^19.2.6`, `react-router-dom@^7.18.0`, `vite-plugin-pwa@^1.3.0`. DevDependencies: `vite@^8.0.12`, `@vitejs/plugin-react`.

Write `./frontend/index.html` & `./frontend/src/index.css`:
- Import `@fontsource/noto-nastaliq-urdu` and `@fontsource/inter`.
- RTL body support (`direction: rtl`).
- Glassmorphic dark CSS variables (`--bg-dark: #0f172a`, `--card-bg: #1e293b`, `--emerald: #10b981`, `--gold: #f59e0b`, `--cyan: #06b6d4`).

Write `./frontend/src/services/api.js`:
- Centered API client targeting `import.meta.env.VITE_API_URL || 'http://localhost:3001'`.
- Implement `askAI`, `analyzeDisease`, `sendChatMessage`, `askAnimalDoctor`, `getFertilizerAdvice`, `getWeatherByCoords`, `getWeatherByCity`, `getPunjabCities`, `authAPI`.

Write `./frontend/src/context/AuthContext.jsx`:
- Auth Provider supplying `user`, `token`, `login`, `register`, `loginAsGuest`, `logout`.
- Uses a safe Base64URL decoder helper to parse JWT payload without breaking on `atob()`.

Write `./frontend/src/hooks/usePermission.js`:
- Geolocation/Camera pre-prompt modal hook using `callbacksRef` to avoid global window pollution.

Write `./frontend/src/hooks/useOffline.js`:
- Tracks online/offline status via window event listeners.

Write `./frontend/src/components/EmergencyAlertBanner.jsx`:
- Farmer-facing banner polling `/api/public/emergency-alerts` every 60s. Shows red/amber alert if active for user's district.

Write `./frontend/src/components/tools/`:
- `MarketPrices.jsx`: Mandi prices grid + crop filter + per 40kg (من) unit.
- `AnimalDoctor.jsx`: Livestock health advisory form.
- `FertilizerRecommender.jsx`: Soil & Crop fertilizer calculator.
- `ProfitEstimator.jsx`: Financial yield & profit forecast calculator.
- `SeedRateCalculator.jsx`: Seed rate per Acre/Kanal.
- `HarvestCountdown.jsx`: Maturity timer per crop.
- `CropRotationAdvisor.jsx`: Agronomic crop rotation sequence tool.

Write `./frontend/src/pages/`:
- `HomePage.jsx`: Quick actions, live weather pill, tips, emergency banner.
- `CropsPage.jsx`: Q&A voice assistant + Disease scanner photo upload.
- `WeatherPage.jsx`: City selector + geolocation + AI advisory cards.
- `ChatPage.jsx`: Real-time SSE streaming assistant chat + Voice recognition (`ur-PK` / `pa-PK`) + Audio TTS playback.
- `PriceAlertPage.jsx`: Commodity price alert manager.
- `SchemesPage.jsx`: Government agricultural subsidy portal.
- `MorePage.jsx`: Hub for all 6 mathematical farming calculators.
- `AdminPanel.jsx`: 9-Tab Admin Dashboard (Overview KPIs, Users, Prices, AI Costs, Audit Logs, Emergency Alerts, Announcements, Schemes, DB Backup).

================================================================================
3. AUTOMATED VERIFICATION & BUILD COMMANDS
================================================================================
After generating all files:
1. Run `npm install` inside `/backend` and `/frontend`.
2. Run `node --check backend/server.js` to confirm backend syntax.
3. Run `npm run build` inside `/frontend` to verify Vite bundle build.
```
