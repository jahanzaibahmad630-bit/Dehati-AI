import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'DehatiAI — کسان کا ذہین ساتھی',
        short_name: 'DehatiAI',
        description: 'پنجاب کے کسانوں کا AI مددگار — فصل، موسم، مارکیٹ اور سرکاری اسکیمیں',
        theme_color: '#2F4A1E',
        background_color: '#FBF3E1',
        lang: 'ur',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['agriculture', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 }
            }
          }
        ],
        navigateFallback: 'index.html'
      }
    })
  ],
  server: {
    port: 5173
  }
})
