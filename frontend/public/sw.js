const CACHE_NAME = 'chipmate-pwa-v1.0.27';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ChipMate PWA] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API requests, WebSocket connections, version checks, or the service worker itself
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.includes('version.json') ||
    url.pathname.includes('/version') ||
    url.pathname.endsWith('sw.js') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Intercept any legacy requests for the old splash video and point to the new versioned video
  if (url.pathname === '/splash_video.mp4') {
    const targetUrl = new URL('/splash_video_v2.mp4?v=1.0.22', event.request.url);
    event.respondWith(
      fetch(targetUrl.toString(), {
        headers: event.request.headers,
        credentials: event.request.credentials
      })
    );
    return;
  }

  // Bypass Service Worker Cache for video files to allow native Range (206) requests and avoid stale video locks
  if (url.pathname.endsWith('.mp4') || event.request.headers.has('range')) {
    return;
  }

  // Network-first for navigation, stale-while-revalidate for static assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

