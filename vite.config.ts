import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// On GitHub Pages a project site is served from https://<user>.github.io/<repo>/
// so the build must use that sub-path as its base. Override with VITE_BASE when
// deploying to a custom domain or a different repo name.
const base = process.env.VITE_BASE ?? '/relationship-crm/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us own the service worker (src/sw.ts) so we can
      // handle Web Push while still getting Workbox precaching for free.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Reconnect — Relationship CRM',
        short_name: 'Reconnect',
        description: 'Your personal networking system. It tells you who to reconnect with.',
        theme_color: '#0a0a0a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        categories: ['productivity', 'lifestyle', 'social'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        // Lets you test the SW + push flow with `npm run dev`.
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
});
