// ICT HUB — installability service worker.
// Intentionally does NOT cache Firebase/Auth or app data.
// Network-only behaviour avoids stale login/session data.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Do not intercept requests. Browser uses the normal network path.
});
