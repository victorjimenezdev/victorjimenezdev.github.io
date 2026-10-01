const CACHE = 'victor-portfolio-v7';
const FEED_HOST = 'dev.to';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name.startsWith('victor-portfolio-') && name !== CACHE).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

async function freshDocument(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      await cache.put(request, response.clone());
      return response;
    }
    return (await cache.match(request)) || response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin &&
      ['/images/case/', '/images/projects/'].some((path) => url.pathname.includes(path))) {
    event.respondWith(Promise.resolve(new Response('', { status: 410 })));
    return;
  }

  if (url.origin === self.location.origin &&
      ['/src/', '/node_modules/', '/@'].some((path) => url.pathname.includes(path))) return;

  /* Navigations always go to the network first, otherwise a deploy would stop
     reaching anyone holding a cached shell. */
  if (request.mode === 'navigate') return;

  if (url.origin === self.location.origin && url.pathname.toLowerCase().endsWith('.pdf')) {
    event.respondWith(freshDocument(request));
    return;
  }

  if (url.hostname === FEED_HOST) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
