import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // './' für GitHub Pages in einem Unterordner; auf einer eigenen Domain (Docker-Build) '/', damit Links wie /232 funktionieren.
  base: process.env.CHEFT_BASE ?? './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Cheft',
        short_name: 'Cheft',
        description: 'Rommé und Cheft-Paare im Pixel-Look, allein gegen Bots oder mit Freunden.',
        lang: 'de',
        theme_color: '#2e1d16',
        background_color: '#2e1d16',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2,woff}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
