/* My English Buddy service worker: makes the app and all lessons work offline.
 *
 * - On install it downloads every file listed in precache.json (written by `npm run build`) plus all
 *   lesson data listed in data/manifest.json, so every screen works offline after the first visit.
 * - Afterwards: pages use "network first, cache as backup"; everything else uses "cache first".
 * - Increase CACHE_VERSION when you change this file.
 */
const CACHE_VERSION = 'v3';
const CACHE = 'my-english-buddy-' + CACHE_VERSION;

async function listFiles() {
  const files = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon.svg', 'data/manifest.json'];
  try {
    const pre = await (await fetch('precache.json', { cache: 'no-cache' })).json();
    files.push(...pre.files);
  } catch (e) { /* precache.json is missing in development builds: runtime caching still works */ }
  try {
    const m = await (await fetch('data/manifest.json', { cache: 'no-cache' })).json();
    for (const c of [...m.vocabCategories, ...m.sentenceCategories]) files.push('data/' + c.file);
    files.push('data/grammar.json', 'data/roleplays.json', 'data/expressions.json', 'data/db.json');
  } catch (e) { /* data is cached when first used instead */ }
  return [...new Set(files)];
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const files = await listFiles();
    // one by one: a single failed file must not stop the whole install
    await Promise.all(files.map((f) => cache.add(f).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('my-english-buddy-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(() => undefined);
        return fresh;
      } catch (e) {
        return (await caches.match(req)) || (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone()).catch(() => undefined);
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});
