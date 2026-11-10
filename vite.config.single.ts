import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({ base: './', plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { 'virtual:pwa-register': new URL('./src/pwa-stub.ts', import.meta.url).pathname } } });
