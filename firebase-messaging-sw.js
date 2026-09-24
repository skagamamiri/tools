importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnE",
  authDomain:"skamis-hubtool.firebaseapp.com",
  projectId:"skamis-hubtool",
  storageBucket:"skamis-hubtool.firebasestorage.app",
  messagingSenderId:"236769370780",
  appId:"1:236769370780:web:9dfa07d772a721ecfe0359"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload?.data?.title || payload?.notification?.title || "🔔 Jadual Waktu";
  const body = payload?.data?.body || payload?.notification?.body || "Kelas anda bermula sekarang.";
  const tag = payload?.data?.tag || "jadual-fcm";
  self.registration.showNotification(title, {
    body, tag, renotify:true,
    icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ctext y='.9em' font-size='100'%3E%F0%9F%93%85%3C/text%3E%3C/svg%3E",
    data:{url:payload?.data?.url || "./"}
  });
});

self.addEventListener("message", event => {
  const d=event.data||{};
  if(d.type === "JADUAL_LOCAL_TEST") {
    event.waitUntil(self.registration.showNotification(
      d.title || "🔔 Jadual Waktu — Ujian",
      {body:d.body || "Service Worker berjaya.", tag:d.tag || "jadual-local-test", renotify:true, data:{url:"./"}}
    ));
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url=event.notification?.data?.url || "./";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){ if("focus" in c){ try{return c.focus();}catch(e){} } }
    return clients.openWindow(url);
  }));
});
