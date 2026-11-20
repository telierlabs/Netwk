// Cylen Service Worker
// v4 -- cache dinaikkan dari v3 supaya semua cache lama (termasuk index.html dan CSS dengan palet warna lama)
// dihapus otomatis saat versi baru terpasang di perangkat.
//
// STRATEGI (tetap sama seperti v3):
// - HTML/document (index.html): NETWORK-FIRST, supaya perubahan di index.html (meta theme-color, script tema,
//   manifest, dll) tidak nyangkut di versi lama pada perangkat yang sudah memasang PWA.
// - Asset statis (gambar, font, dll): cache-first + update di background, biar tetap cepat/offline-friendly.
//
// Tambahan v4: permintaan selain GET (POST/PUT dll) tidak disentuh service worker sama sekali.

const CACHE_NAME = 'cylen-cache-v4';

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

  // Hanya GET yang boleh di-cache. POST/PUT/DELETE (misal ke API) dilewatkan apa adanya.
  if (request.method !== 'GET') return;

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
