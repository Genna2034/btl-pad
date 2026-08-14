/* BTL Pad — service worker
   Scarica tutto alla prima visita, poi l'app vive offline.
   Alzare VERSIONE a ogni rilascio per far scaricare i file nuovi. */
const VERSIONE = 'btl-pad-v6';
const RISORSE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/logo.png',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSIONE)
      .then(c => c.addAll(RISORSE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request)
        .then(res => {
          // metto da parte anche i file caricati dopo (es. nuove risorse)
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const copia = res.clone();
            caches.open(VERSIONE).then(c => c.put(e.request, copia));
          }
          return res;
        })
        .catch(() => caches.match('/index.html'));   // offline: torno all'app
    })
  );
});
