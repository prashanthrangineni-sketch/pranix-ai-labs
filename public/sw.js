// Pranix PWA service worker — Command Centre Phase 0 installability fix.
// Deliberately minimal: NO caching (avoids stale-dashboard risk on a live
// operations cockpit). Its presence + fetch handler is what unlocks the
// install prompt / WebAPK path on Chrome, Edge and Android.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pure network passthrough — required fetch handler, zero caching.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
