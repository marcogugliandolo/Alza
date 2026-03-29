self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Minimal fetch handler to satisfy PWA installability requirements
  // In a real offline-first app, this would use caches.
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('You are offline.');
    })
  );
});
