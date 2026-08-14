// Hub Tool ICT — service worker disabled for authentication reliability.
// The app is hosted on GitHub Pages and uses Firebase Authentication.
// Do not cache index.html or Firebase auth helper pages.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Always use the network. Firebase Authentication must never be served
// from a stale application shell/cache.
self.addEventListener('fetch', event => {
  // Deliberately do not intercept requests.
});
