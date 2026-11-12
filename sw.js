/**
 * Service Worker PWA - Apotek ONS Farma Enterprise v10.0
 * Aturan Emas /gas-pwa-github:
 * - Path aset selalu relatif (./)
 * - Jangan pernah cache endpoint Google Apps Script (script.google.com / script.googleusercontent.com)
 * - Selalu sajikan UI instan dari cache untuk pengalaman bebas lag (<50ms)
 */

const CACHE_NAME = 'ons-farma-pwa-v17.16.0';
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
  './icons/apotek-ons-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
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
        const networkFetch = fetch(event.request).then((resp) => {
          if (resp && resp.status === 200 && url.startsWith(self.location.origin)) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
