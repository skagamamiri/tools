// ============================================================
// ICT HUB + JADUAL WAKTU + FIREBASE CLOUD MESSAGING
// Service Worker utama untuk /tools/
// ============================================================

// ------------------------------------------------------------
// ICT HUB INSTALLABILITY
// ------------------------------------------------------------
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// ------------------------------------------------------------
// JADUAL VERSI 4.0 MODULE INJECTION
// Tidak mengubah sistem FCM. Hanya menambah modul data selepas
// halaman jadual selesai dimuat supaya VERSION_DATA sedia ada
// boleh menambah pilihan V4 tanpa menggantikan baseline.
// ------------------------------------------------------------
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!url.pathname.endsWith("/jadual.html")) return;

  event.respondWith((async () => {
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    const html = await response.text();
    if (html.includes("jadual-v4-data.js")) return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    const injected = html.replace(
      /<\/body>/i,
      '<script src="./jadual-v4-data.js?v=20260927"></script></body>'
    );

    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })());
});

// ------------------------------------------------------------
// FIREBASE CLOUD MESSAGING
// ------------------------------------------------------------
importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnE",
  authDomain: "skamis-hubtool.firebaseapp.com",
  projectId: "skamis-hubtool",
  storageBucket: "skamis-hubtool.firebasestorage.app",
  messagingSenderId: "236769370780",
  appId: "1:236769370780:web:9dfa07d772a721ecfe0359"
});

const messaging = firebase.messaging();

// ------------------------------------------------------------
// Hantar mesej kepada halaman yang sedang terbuka
// ------------------------------------------------------------
function broadcast(type, data) {
  return self.clients
    .matchAll({
      type: "window",
      includeUncontrolled: true
    })
    .then(list => {
      list.forEach(client => {
        client.postMessage({
          source: "jadual-fcm-sw",
          type,
          data
        });
      });
    });
}

// ------------------------------------------------------------
// FCM BACKGROUND MESSAGE
// ------------------------------------------------------------
messaging.onBackgroundMessage(payload => {

  const data = payload?.data || {};
  const note = payload?.notification || {};

  const title =
    data.title ||
    note.title ||
    "🔔 Jadual Waktu";

  const body =
    data.body ||
    note.body ||
    "Kelas anda bermula sekarang.";

  const tag =
    data.tag ||
    "jadual-fcm";

  console.log(
    "JADUAL FCM BACKGROUND",
    payload
  );

  broadcast("backgroundMessage", {
    title,
    body,
    tag,
    hasData: !!payload?.data,
    hasNotification: !!payload?.notification
  });

  return self.registration.showNotification(
    title,
    {
      body,
      tag,
      renotify: true,

      icon:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ctext y='.9em' font-size='100'%3E%F0%9F%93%85%3C/text%3E%3C/svg%3E"
    }
  );
});

// ------------------------------------------------------------
// TEST PING
// ------------------------------------------------------------
self.addEventListener("message", event => {

  if (event.data?.type === "ping") {

    broadcast("pong", {
      time: Date.now()
    });

  }

});

// ------------------------------------------------------------
// KLIK NOTIFICATION
// ------------------------------------------------------------
self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(

    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(list => {

        for (const client of list) {

          if ("focus" in client) {
            return client.focus();
          }

        }

        return clients.openWindow("./");

      })

  );

});
