importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnE",authDomain:"skamis-hubtool.firebaseapp.com",projectId:"skamis-hubtool",storageBucket:"skamis-hubtool.firebasestorage.app",messagingSenderId:"236769370780",appId:"1:236769370780:web:9dfa07d772a721ecfe0359"});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
 const title=payload?.notification?.title||"🔔 Jadual Waktu";
 const body=payload?.notification?.body||"Kelas anda bermula sekarang.";
 self.registration.showNotification(title,{body,tag:payload?.data?.tag||"jadual-fcm",renotify:true});
});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(a=>{for(const c of a)if("focus"in c)return c.focus();return clients.openWindow("./");}));});
