/**
 * Central API configuration.
 * Priority:
 *  1. VITE_API_URL env var (set in Vercel project settings or .env.production)
 *  2. Auto-detect: localhost → dev server, anything else → production Railway URL
 *
 * This file ensures the app always connects to the correct backend,
 * even if Vercel env vars aren't configured.
 */

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost
    ? 'http://localhost:3001'
    : 'https://dehati-ai-production.up.railway.app');

export default API_URL;
