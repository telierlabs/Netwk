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
        includeAssets: ['android-chrome-192x192.png', 'android-chrome-512x512.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          // Langsung aktif & ambil alih tab yang terbuka, biar HP nggak nyangkut di bundle lama
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        manifest: {
          short_name: 'Cylen',
          name: 'Cylen AI',
          description: 'Asisten AI Futuristik',
          icons: [
            {
              src: '/android-chrome-192x192.png',
              type: 'image/png',
              sizes: '192x192'
            },
            {
              src: '/android-chrome-512x512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable'
            }
          ],
          start_url: '/',
          display: 'standalone',
          theme_color: '#000000',
          background_color: '#000000'
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
    // Buang console.log / console.debug di versi produksi (console.error tetap ada)
    esbuild: {
      pure: ['console.log', 'console.debug'],
    },
    build: {
      // false = kode sumber asli TIDAK bisa diunduh orang dari cylenai.com.
      // (sourcemap: true bikin siapa pun bisa buka file .map dan baca seluruh kodemu,
      // dan di HP nggak bikin tulisan error jadi lebih jelas.)
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-pdf': ['jspdf'],
            'vendor-docx': ['docx'],
            'vendor-xlsx': ['xlsx'],
            'vendor-pptx': ['pptxgenjs'],
          }
        }
      }
    },
  };
});
