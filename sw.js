/* L'appli s'ouvre depuis le téléphone, sans attendre le réseau.
   Une nouvelle version ne remplace l'ancienne que si elle est téléchargée en entier. */
const VERSION = 'aa6189379ff9', APP = 'appli-' + VERSION, DATA = 'donnees-v1';
const FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(APP + '-prep');
  await Promise.all(FILES.map(async f => {
    const r = await fetch(new Request(f, { cache: 'reload' }));
    if (!r.ok) throw new Error(f);
    await c.put(f, r);
  }));
  const fin = await caches.open(APP);
  for (const k of await c.keys()) await fin.put(k, await c.match(k));
  await caches.delete(APP + '-prep');
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('appli-') && k !== APP) await caches.delete(k);
  await self.clients.claim();
})()));
const stocke = u => /openfreemap\.org|fonts\.(googleapis|gstatic)\.com/.test(u.hostname) || (/wikimedia\.org$/.test(u.hostname) && !u.pathname.includes('/w/api.php'));
self.addEventListener('fetch', e => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET') return;
  if (q.mode === 'navigate' || (u.origin === location.origin)) {
    e.respondWith((async () => {
      const c = await caches.open(APP);
      return (await c.match(q.mode === 'navigate' ? './' : q, { ignoreSearch: true })) || fetch(q);
    })());
  } else if (stocke(u)) {
    e.respondWith((async () => {
      const c = await caches.open(DATA), h = await c.match(q);
      if (h) return h;
      const r = await fetch(q);
      if (r.ok || r.type === 'opaque') c.put(q, r.clone()).catch(() => {});
      return r;
    })());
  }
});
