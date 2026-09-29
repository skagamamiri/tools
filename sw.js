// ICT HUB + JADUAL + FCM service worker
// Mobile navigation is injected ONLY on the ICT HUB home page.
self.addEventListener('install',e=>e.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);

  const isHubHome=(u.pathname==='/tools' || u.pathname==='/tools/' || u.pathname.endsWith('/tools/index.html'));
  if(req.mode==='navigate' && isHubHome){
    event.respondWith((async()=>{
      const r=await fetch(req);
      const ct=r.headers.get('content-type')||'';
      if(!ct.includes('text/html'))return r;
      let h=await r.text();
      if(!h.includes('mobile-bottom-nav.js')){
        const tag='<script src="./mobile-bottom-nav.js?v=20260929-2"></script>';
        h=h.replace(/<\/head>/i,tag+'</head>');
      }
      const hd=new Headers(r.headers);hd.delete('content-length');
      return new Response(h,{status:r.status,statusText:r.statusText,headers:hd});
    })());
    return;
  }

  if(req.mode==='navigate' && u.pathname.startsWith('/tools/') && !u.pathname.endsWith('/tools/index.html')){
    event.respondWith((async()=>{
      const r=await fetch(req);
      const ct=r.headers.get('content-type')||'';
      if(!ct.includes('text/html'))return r;
      let h=await r.text();
      h=h.replace(/<script[^>]+mobile-bottom-nav\.js[^>]*><\/script>/gi,'');
      const guard='<style id="ictHubToolNavGuard">#ictMobileNavV1,#ictMobileNavV2,#ictMobileNavV3,.mobile-bottom-nav,[id*="ictMobileNav"],#ictProfileSheetBg,#ictQrSheetBg{display:none!important}body{padding-bottom:0!important}</style>';
      if(!h.includes('ictHubToolNavGuard'))h=h.replace(/<\/head>/i,guard+'</head>');
      const hd=new Headers(r.headers);hd.delete('content-length');
      return new Response(h,{status:r.status,statusText:r.statusText,headers:hd});
    })());
    return;
  }

  if(u.pathname.endsWith('/jadual-v4-data.js')){
    event.respondWith((async()=>{const r=await fetch(req);const ct=r.headers.get('content-type')||'';if(!ct.includes('javascript')&&!ct.includes('text'))return r;const js=await r.text();const fixed=js.replace('const bytes = Uint8Array.from(atob(DATA_B64), c=>c.charCodeAt(0));','const normalizedB64 = String(DATA_B64).replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/=]/g, ""); const paddedB64 = normalizedB64 + "=".repeat((4 - normalizedB64.length % 4) % 4); const bytes = Uint8Array.from(atob(paddedB64), c=>c.charCodeAt(0));');const hd=new Headers(r.headers);hd.delete('content-length');return new Response(fixed,{status:r.status,statusText:r.statusText,headers:hd});})());
    return;
  }

  if(u.pathname.endsWith('/jadual.html')){
    event.respondWith((async()=>{const r=await fetch(req);const ct=r.headers.get('content-type')||'';if(!ct.includes('text/html'))return r;const h=await r.text();if(h.includes('jadual-v4-data.js'))return new Response(h,{status:r.status,statusText:r.statusText,headers:r.headers});const out=h.replace(/<\/body>/i,'<script src="./jadual-v4-data.js?v=20260927"></script></body>');const hd=new Headers(r.headers);hd.delete('content-length');return new Response(out,{status:r.status,statusText:r.statusText,headers:hd});})());
    return;
  }
});

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnK3',authDomain:'skamis-hubtool.firebaseapp.com',projectId:'skamis-hubtool',storageBucket:'skamis-hubtool.firebasestorage.app',messagingSenderId:'236769370780',appId:'1:236769370780:web:9dfa07d772a721ecfe0359'});
const messaging=firebase.messaging();
function broadcast(type,data){return self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list.forEach(c=>c.postMessage({source:'jadual-fcm-sw',type,data})))}
messaging.onBackgroundMessage(payload=>{const d=payload?.data||{};const n=payload?.notification||{};const title=d.title||n.title||'🔔 Jadual Waktu';const body=d.body||n.body||'Kelas anda bermula sekarang.';const tag=d.tag||'jadual-fcm';broadcast('backgroundMessage',{title,body,tag,hasData:!!payload?.data,hasNotification:!!payload?.notification});return self.registration.showNotification(title,{body,tag,renotify:true,icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ctext y='.9em' font-size='100'%3E%F0%9F%93%85%3C/text%3E%3C/svg%3E"})});
self.addEventListener('message',e=>{if(e.data?.type==='ping')broadcast('pong',{time:Date.now()})});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list)if('focus'in c)return c.focus();return clients.openWindow('./')}))});
