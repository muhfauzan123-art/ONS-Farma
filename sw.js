/**
 * Service Worker PWA - Apotek ONS Farma Enterprise v10.0
 * Aturan Emas /gas-pwa-github:
 * - Path aset selalu relatif (./)
 * - Jangan pernah cache endpoint Google Apps Script (script.google.com / script.googleusercontent.com)
 * - Selalu sajikan UI instan dari cache untuk pengalaman bebas lag (<50ms)
 */

const CACHE_NAME = 'ons-farma-pwa-v10.1.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/demo-engine.js',
  './js/api-turbo.js',
  './js/store.js',
  './js/views-auth-dash-pos.js',
  './js/views-inventory-procurement.js',
  './js/views-clinical-finance-admin.js',
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

  // Network-first untuk HTML shell & config.js agar setiap revisi langsung tampil
  if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/config.js')) {
    event.respondWith(
      fetch(event.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((resp) => {
        if (resp && resp.status === 200 && url.startsWith(self.location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
