import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Mesin PWA-nya

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Pastikan huruf I kapital sesuai nama file lu
        includeAssets: ['Icon-192.png', 'Icon-512.png'], 
        manifest: {
          short_name: 'Cylen',
          name: 'Cylen AI',
          description: 'Asisten AI Futuristik',
          icons: [
            {
              src: '/Icon-192.png', // Huruf I kapital
              type: 'image/png',
              sizes: '192x192'
            },
            {
              src: '/Icon-512.png', // Huruf I kapital
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable'
            }
          ],
          start_url: '/',
          display: 'standalone',
          theme_color: '#010101',
          background_color: '#010101'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      cssCodeSplit: false,
    },
  };
});
