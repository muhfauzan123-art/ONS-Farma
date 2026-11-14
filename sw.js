/**
 * Service Worker PWA - Apotek ONS Farma Enterprise v18.9.0
 * Aturan Emas /gas-pwa-github:
 * - Path aset selalu relatif (./)
 * - Jangan pernah cache endpoint Google Apps Script (script.google.com / script.googleusercontent.com)
 * - Selalu sajikan UI instan dari cache untuk pengalaman bebas lag (<50ms)
 */

const CACHE_NAME = 'ons-farma-pwa-v18.10.3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/demo-engine.js',
  './js/api-turbo.js',
  './js/struk-engine.js',
  './js/store.js',
  './js/invoice-scanner.js',
  './js/barcode-scanner.js',
  './js/views-auth-dash-pos.js',
  './js/views-procurement-pro.js',
  './js/views-inventory-procurement.js',
  './js/views-clinical-finance-admin.js',
  './js/views-pemeriksaan.js',
  './js/views-omnichannel-crm.js',
  './vendor/ons-code128.js',
  './vendor/ons-xlsx-export.js',
  './vendor/ons-xlsx-lite.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/ons-farma-app-icon.png',
  './icons/apotek-ons-logo.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // CRITICAL FIX (Audit #6): Gunakan allSettled agar aset opsional/flat folder yang belum ada tidak membatalkan instalasi PWA!
      return Promise.allSettled(
        CORE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Aset dilewati:', asset, err && err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Bypass mutlak untuk API dinamis Google Apps Script & eksternal
  if (
    event.request.method !== 'GET' ||
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com') ||
    url.includes('api.fonnte.com') ||
    url.includes('satusehat')
  ) {
    return;
  }

  // Tailwind CDN Cache (Audit #12): Cache runtime CDN tailwind agar tampilan offline tetap rapi
  if (url.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((resp) => {
            if (resp && (resp.status === 200 || resp.type === 'opaque')) {
              cache.put(event.request, resp.clone());
            }
            return resp;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // HTML Navigasi: Network-First ber-batas waktu (1800ms) agar update langsung aktif namun bebas macet di sinyal lambat
  if (url.startsWith(self.location.origin) && event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        const netPromise = fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        });
        const timeoutFallback = new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('sw-nav-timeout')), 1800);
        });
        return Promise.race([netPromise, timeoutFallback]).catch(() =>
          cache.match(event.request).then((m) => m || cache.match('./index.html')).then((m) => m || netPromise)
        );
      })
    );
    return;
  }

  // Aset Statis (.js, .css, ikon, manifest): Stale-While-Revalidate instan (<5ms) + refresh diam-diam di latar belakang
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const cleanUrl = url.split('?')[0];
        const matchPromise = cached ? Promise.resolve(cached) : cache.match(cleanUrl);
        return matchPromise.then((matched) => {
          const networkFetch = fetch(event.request).then((resp) => {
            if (resp && resp.status === 200 && url.startsWith(self.location.origin)) {
              cache.put(event.request, resp.clone());
            }
            return resp;
          }).catch(() => matched);
          return matched || networkFetch;
        });
      })
    )
  );
});
