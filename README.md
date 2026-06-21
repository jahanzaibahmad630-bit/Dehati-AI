# DehatiAI — کسان کا ذہین ساتھی

AI-powered agricultural platform for farmers in Punjab, Pakistan.

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in GEMINI_API_KEY
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Stack
- **Frontend**: React + Vite + PWA (installable, offline-capable)
- **Backend**: Node.js + Express (secure AI proxy)
- **AI**: Google Gemini 2.0 Flash
- **Auth**: JWT + bcrypt (Supabase-ready)
- **Weather**: Open-Meteo (free, real data)

## Deployment
- Frontend → Vercel
- Backend → Railway

Set `VITE_API_URL` on Vercel to your Railway backend URL.
