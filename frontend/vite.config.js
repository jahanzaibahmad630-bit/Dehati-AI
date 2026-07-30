import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      includeAssets: [
        'favicon.svg',
        'offline.html',
        'icons/*.png',
        'icons/*.svg'
      ],

      manifest: {
        name: 'DehatiAI — کسان کا ذہین ساتھی',
        short_name: 'DehatiAI',
        description: 'پنجاب کے کسانوں کا AI مددگار — فصل، موسم، مارکیٹ اور سرکاری اسکیمیں',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        lang: 'ur',
        dir: 'rtl',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/?source=pwa',
        scope: '/',
        id: 'dehati-ai-v1',
        categories: ['agriculture', 'productivity', 'education'],
        prefer_related_applications: false,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'AI مدد',
            short_name: 'چیٹ',
            description: 'DehatiAI سے سوال کریں',
            url: '/chat?source=shortcut',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'موسم',
            short_name: 'موسم',
            description: 'آج کا موسم دیکھیں',
            url: '/weather?source=shortcut',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },

      workbox: {
        // Precache all built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],

        // CRITICAL: Take control immediately when new SW is installed
        // Without this, users get blank screens when a new build deploys
        // because the old SW keeps serving stale JS/CSS bundles
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,

        // ── CRITICAL FIX ─────────────────────────────────────────────────────
        // For a React SPA, navigateFallback MUST be 'index.html' so the SW
        // serves the app shell for all client-side routes (/, /chat, /weather…).
        // Setting it to 'offline.html' caused the offline page to show even
        // when the user WAS online (SW couldn't find a cached route match).
        navigateFallback: 'index.html',

        // Never intercept API calls, admin routes, or the reset page
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/, /^\/clear/],

        runtimeCaching: [
          // ── Weather API (Open-Meteo) — stale-while-revalidate, 1 hour ──────
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Market prices — stale-while-revalidate, 5 min ────────────────
          {
            urlPattern: ({ url }) => url.pathname.includes('/api/admin/prices/public'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'prices-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Google Fonts — cache forever ─────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── All other API calls — network first (no SPA fallback) ─────────
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/') &&
              !url.pathname.includes('/api/admin/prices/public'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 20,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      devOptions: {
        enabled: false
      }
    })
  ],

  server: {
    port: 5173
  }
})
