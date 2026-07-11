// Cylen Service Worker
// v3 -- STRATEGI DIGANTI: network-first khusus buat HTML/document (index.html).
// Alasan: kalau strategi cache-first dipakai buat index.html, begitu ada
// perubahan di index.html (misal fix meta theme-color, manifest, dll),
// device yang udah install PWA bakal terus keukeuh pake index.html versi
// LAMA dari cache -- persis kasus "strip krem" yang nyangkut di PWA
// walau di tab browser biasa udah bersih.
//
// Asset statis (gambar, font, dll) tetap boleh cache-first biar tetap cepat/offline-friendly.

const CACHE_NAME = 'cylen-cache-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // hapus SEMUA cache versi lama, apapun namanya, biar gak ada
          // sisa index.html/manifest.json basi yang nyangkut
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // ── HTML / navigasi (index.html) — NETWORK FIRST ──
  // Selalu coba ambil dari server dulu. Kalau offline baru fallback ke cache.
  // Ini mencegah PWA "nyangkut" di versi index.html lama selamanya.
  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── Asset lain (JS/CSS/gambar/font) — CACHE FIRST, update cache di background ──
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
