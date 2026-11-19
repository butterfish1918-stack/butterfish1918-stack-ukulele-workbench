/* Ukulele Workbench offline shell. Keep cache deletion scoped to THIS app:
   other tools on the same GitHub Pages origin must never be touched. */
const CACHE_PREFIX = 'uke-workbench-';
const CACHE = `${CACHE_PREFIX}v1.6.0-preview`;
const SCOPE = new URL(self.registration.scope);
const SHELL = new URL('./index.html', SCOPE).href;
const ASSETS = [
 './', './index.html', './styles.css', './src/app.js', './src/song-library.js', './src/library-seed.js', './src/music.js',
 './src/score.js', './src/score-view.js', './src/technique-lessons.js',
 './src/history.js', './src/progression.js', './src/rhythm-lessons.js',
 './src/reading-lessons.js', './src/musicxml.js', './src/engraving.js',
 './src/tuner-dsp.js', './src/storage-safety.js', './src/device-qa.js',
 './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
 './manifest.webmanifest', './library/catalog.json', './library/songs/first-melody-study.json', './library/songs/primary-chord-changes.json'
];

self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS);
  // Do not activate a worker whose complete offline shell could not be cached.
  await self.skipWaiting();
 })());
});

self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
   .map(k => caches.delete(k)));
  await self.clients.claim();
 })());
});

self.addEventListener('fetch', event => {
 const request = event.request;
 if (request.method !== 'GET') return;
 const url = new URL(request.url);
 const scopePath = SCOPE.pathname.endsWith('/') ? SCOPE.pathname : SCOPE.pathname + '/';
 if (url.origin !== SCOPE.origin || !url.pathname.startsWith(scopePath)) return;
 event.respondWith((async () => {
  const cached = await caches.match(request, {ignoreSearch: true});
  if (cached) return cached;
  try {
   const response = await fetch(request);
   // Cache app-owned static assets, not arbitrary dynamic URLs or queries.
   const isStatic = /\.(?:html|css|js|svg|png|webmanifest)$/i.test(url.pathname);
   if (response.ok && response.type !== 'opaque' && isStatic) {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
   }
   return response;
  } catch (error) {
   if (request.mode === 'navigate') {
    const fallback = await caches.match(SHELL);
    if (fallback) return fallback;
   }
   throw error;
  }
 })());
});
