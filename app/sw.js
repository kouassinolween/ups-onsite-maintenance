// Service worker : fonctionnement hors ligne.
// Stratégie : "stale-while-revalidate" pour l'application et les packs (même origine).
const VERSION = 'v0.1.0';
const CACHE = `ups-app-${VERSION}`;
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/main.js', './js/catalog.js', './js/decoder.js',
  '../packs/93pm/alarms.json', '../packs/93pm/parts.json',
  '../packs/93ps/alarms.monoblock.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ups-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached ?? (await network) ?? new Response('Hors ligne et non mis en cache', { status: 503 });
  })());
});
