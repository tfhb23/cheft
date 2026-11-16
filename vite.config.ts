import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { color } from './src/ui/tokens';

/** Farbe der Browser-Leiste und des Ladebilds kommt aus den Design-Tokens (1.17). */
const SHELL = color('shell');

export default defineConfig({
  // './' für GitHub Pages in einem Unterordner; auf einer eigenen Domain (Docker-Build) '/', damit Links wie /232 funktionieren.
  base: process.env.CHEFT_BASE ?? './',
  plugins: [
    { name: 'cheft-shell-color', transformIndexHtml: (html: string) => html.replace('%SHELL_COLOR%', SHELL) },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'favicon-96.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cheft',
        short_name: 'Cheft',
        description: 'Rommé und Cheft-Paare im Pixel-Look, allein gegen Bots oder mit Freunden.',
        lang: 'de',
        theme_color: SHELL,
        background_color: SHELL,
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,woff}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
