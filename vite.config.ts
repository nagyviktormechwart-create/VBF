import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Telepíthető, offline működő (PWA) változat: hostolt címre (pl. Vercel) való feltöltéshez.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',            // új verziónál nem frissít magától, hogy ne szakítson meg egy mérésrögzítést
    includeAssets: ['icon-192.png', 'apple-touch-icon.png'],
    manifest: { name: 'VILL-NOVA', short_name: 'VILL-NOVA', description: 'Villamos biztonsági felülvizsgálati adatfelvevő', lang: 'hu',
      display: 'standalone', orientation: 'any', start_url: './', scope: './', background_color: '#1f2933', theme_color: '#1f2933',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, cleanupOutdatedCaches: true },
  })],
});
