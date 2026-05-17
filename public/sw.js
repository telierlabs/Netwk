const CACHE_NAME = 'cylen-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Langsung tembak jaringan tanpa nge-cache biar gak ganggu update Vercel
  event.respondWith(fetch(event.request));
});
