/* Ukulele Workbench offline shell. Keep cache deletion scoped to THIS app:
   other tools on the same GitHub Pages origin must never be touched. */
const CACHE_PREFIX = 'uke-workbench-';
const CACHE = `${CACHE_PREFIX}v1.11.5-compressed-musicxml`;
const SCOPE = new URL(self.registration.scope);
const SHELL = new URL('./index.html', SCOPE).href;
const LIBRARY_PATH = new URL('./library/', SCOPE).pathname;
const ASSETS = [
 './', './index.html', './styles.css', './src/app.js', './src/song-library.js', './src/library-seed.js', './src/music.js',
 './src/score.js', './src/score-view.js', './src/guitar-adaptation.js', './src/arrangement-modes.js', './src/instrument-samples.js', './src/song-instrumentation.js', './src/repertoire-migration.js', './src/song-practice.js', './src/song-playback.js', './src/song-lyrics.js', './src/score-verification.js', './src/technique-lessons.js',
 './src/history.js', './src/progression.js', './src/rhythm-lessons.js',
 './src/reading-lessons.js', './src/musicxml.js', './src/musicxml-container.js', './src/engraving.js',
 './src/tuner-dsp.js', './src/storage-safety.js', './src/device-qa.js',
 './src/practice-engine.js', './src/guitar-polyphony.js', './src/instrument-voices.js',
 './src/advanced-theory.js', './src/learning-path.js', './src/song-organizer.js',
 './src/polyphonic-score.js', './src/musicxml-multipart.js', './src/musicxml-repeat.js', './src/polyphonic-layout.js', './src/polyphonic-engraving.js', './src/ensemble-playback.js', './src/source-instruments.js',
 './src/microphone-feedback.js', './src/instrument-settings.js', './src/chordpro.js',
 './src/mobile-qa.js', './src/encrypted-backup.js',
 './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
 './manifest.webmanifest', './library/catalog.json', './library/songs/first-melody-study.json', './library/songs/primary-chord-changes.json',
 './library/songs/isolation.json',
 './library/songs/love-will-tear-us-apart.json',
 './library/songs/the-passenger.json',
 './library/songs/passover.json',
 './library/songs/spellbound.json',
 './library/songs/a-forest.json',
 './library/songs/life-on-mars.json',
 './library/songs/blackbird.json',
 './library/songs/space-oddity.json',
 './library/songs/while-my-guitar-gently-weeps.json',
 './library/songs/wish-you-were-here.json',
 './library/songs/scarborough-fair.json',
 './library/songs/babe-im-gonna-leave-you.json',
 './library/songs/everybody-wants-to-rule-the-world.json',
 './library/songs/california-dreamin.json',
 './library/songs/scarborough-fair-traditional-1882.json'
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
 // Song catalogs must be network-first so a live Sync Library sees new revisions.
 // A validated cached copy remains available when the device is offline.
 if (url.pathname.startsWith(LIBRARY_PATH) && url.pathname.endsWith('.json')) {
  event.respondWith((async () => {
   const libraryCache = await caches.open(CACHE);
   try {
    const response = await fetch(request, {cache: 'no-store'});
    if (response.ok && response.type !== 'opaque') {
     const copy = response.clone();
     event.waitUntil(libraryCache.put(request, copy));
    }
    return response;
   } catch (error) {
    const offlineCopy = await libraryCache.match(request, {ignoreSearch: true});
    if (offlineCopy) return offlineCopy;
    throw error;
   }
  })());
  return;
 }
 event.respondWith((async () => {
  const cached = await caches.match(request, {ignoreSearch: true});
  if (cached) return cached;
  try {
   const response = await fetch(request);
   // Cache app-owned static assets, not arbitrary dynamic URLs or queries.
   const isStatic = /\.(?:html|css|js|svg|png|flac|m4a|mp3|webmanifest)$/i.test(url.pathname);
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
