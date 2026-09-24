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

const messaging=firebase.messaging();

function broadcast(type,data){
  return self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    list.forEach(c=>c.postMessage({source:"jadual-fcm-sw",type,data}));
  });
}

messaging.onBackgroundMessage(payload=>{
  const data=payload?.data||{};
  const note=payload?.notification||{};
  const title=data.title||note.title||"🔔 Jadual Waktu";
  const body=data.body||note.body||"Kelas anda bermula sekarang.";
  const tag=data.tag||"jadual-fcm";
  console.log("JADUAL FCM BACKGROUND",payload);
  broadcast("backgroundMessage",{title,body,tag,hasData:!!payload?.data,hasNotification:!!payload?.notification});
  return self.registration.showNotification(title,{
    body,tag,renotify:true,
    icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ctext y='.9em' font-size='100'%3E%F0%9F%93%85%3C/text%3E%3C/svg%3E"
  });
});

self.addEventListener("message",event=>{
  if(event.data?.type==="ping") broadcast("pong",{time:Date.now()});
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if("focus" in c)return c.focus();}
    return clients.openWindow("./");
  }));
});
