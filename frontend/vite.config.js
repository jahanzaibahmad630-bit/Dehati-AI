import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Include all static assets in the precache
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
        theme_color: '#2F4A1E',
        background_color: '#FBF3E1',
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
        // Precache all JS/CSS/HTML/fonts/images
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],

        // Offline fallback: if navigation fails (no internet), show /offline.html
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/],

        runtimeCaching: [
          // ── Weather API (Open-Meteo) — cache 1 hour ─────────────────────────
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Market prices public endpoint — cache 5 min ──────────────────────
          {
            urlPattern: ({ url }) => url.pathname.includes('/api/admin/prices/public'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'prices-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Google Fonts (if used) — cache forever ──────────────────────────
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
          // ── App API calls — network first, fallback to cache ─────────────────
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/') &&
              !url.pathname.includes('/api/admin/prices/public'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },

      // Dev mode: enable SW in development too (for testing)
      devOptions: {
        enabled: false  // set to true temporarily if you want to test SW locally
      }
    })
  ],

  server: {
    port: 5173
  }
})
