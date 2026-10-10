/* BTL Pad — service worker
   Alzare VERSIONE a ogni rilascio. Il valore e' letto anche dall'app
   per mostrarlo nella riga di stato. */
const VERSIONE = 'btl-pad-v21';
const RISORSE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/logo.png',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  /* set Worship: dodici pad, ~4 MB, cosi' il tappeto c'e' anche senza rete */
  '/pad/C.mp3','/pad/Cs.mp3','/pad/D.mp3','/pad/Ds.mp3','/pad/E.mp3','/pad/F.mp3',
  '/pad/Fs.mp3','/pad/G.mp3','/pad/Gs.mp3','/pad/A.mp3','/pad/As.mp3','/pad/B.mp3'
];
/* file che cambiano a ogni rilascio: prima la rete, poi la copia */
const VIVI = ['/', '/index.html', '/css/style.css', '/js/app.js', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSIONE)
      .then(c => c.addAll(RISORSE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const k = await caches.keys();
    await Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x)));
    await self.clients.claim();
    // avviso le pagine aperte: c'e' una versione nuova
    const pagine = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    pagine.forEach(p => p.postMessage({ tipo: 'nuova-versione', versione: VERSIONE }));
  })());
});

self.addEventListener('message', e => {
  if (e.data && e.data.tipo === 'quale-versione') {
    e.source && e.source.postMessage({ tipo: 'versione', versione: VERSIONE });
  }
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const percorso = url.pathname;
  const vivo = e.request.mode === 'navigate' || VIVI.includes(percorso);

  if (vivo) {
    // rete prima: cosi' ogni apertura con rete prende l'ultima versione.
    // Senza rete, la copia salvata.
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(VERSIONE).then(c => c.put(e.request, copia));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  // il resto (icone, logo): copia prima, rete se manca
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); }
      return res;
    }))
  );
});
