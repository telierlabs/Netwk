import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['Icon-192.png', 'Icon-512.png'], 
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
        },
        manifest: {
          short_name: 'Cylen',
          name: 'Cylen AI',
          description: 'Asisten AI Futuristik',
          icons: [
            {
              src: '/Icon-192.png',
              type: 'image/png',
              sizes: '192x192'
            },
            {
              src: '/Icon-512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable'
            }
          ],
          start_url: '/',
          display: 'standalone',
          // FIX: Sinkronkan dengan background light mode agar OS tidak menggambar garis
          theme_color: '#ffffff',
          background_color: '#ffffff'
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
