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
        const tag='<script src="./mobile-bottom-nav.js?v=20260929-4"></script>';
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
      h=h.replace(/<script[^>]+mobile-bottom-nav(?:\.js)?[^>]*><\/script>/gi,'');
      h=h.replace(/<script[^>]+(?:mobile-bottom-nav|mobile-nav|bottom-nav)[^>]*><\/script>/gi,'');
      const guard=`<style id="ictHubToolNavGuard">
@media(max-width:768px){
#ictMobileNavV1,#ictMobileNavV2,#ictMobileNavV3,.mobile-bottom-nav,[id*="ictMobileNav"],#ictProfileSheetBg,#ictQrSheetBg{display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important}
body{padding-bottom:0!important}
}
</style>
<script id="ictHubToolNavCleanup">
(function(){
  function clean(){
    ['#ictMobileNavV1','#ictMobileNavV2','#ictMobileNavV3','.mobile-bottom-nav','#ictProfileSheetBg','#ictQrSheetBg'].forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){el.remove();});});
    document.querySelectorAll('script[src*="mobile-bottom-nav"],script[src*="mobile-nav"],script[src*="bottom-nav"]').forEach(function(el){el.remove();});
    if(document.body)document.body.style.removeProperty('padding-bottom');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});else clean();
  new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;
      if(!h.includes('ictHubToolNavGuard')){
        if(/<\/head>/i.test(h)) h=h.replace(/<\/head>/i,guard+'</head>');
        else h=guard+h;
      }
      const hd=new Headers(r.headers);hd.delete('content-length');
      hd.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
      return new Response(h,{status:r.status,statusText:r.statusText,headers:hd});
    })());
    return;
  }

  if(u.pathname.endsWith('/jadual-v4-data.js')){
    event.respondWith(fetch(req));
    return;
  }

  if(u.pathname.endsWith('/jadual.html')){
    event.respondWith((async()=>{
      const r=await fetch(req);
      const ct=r.headers.get('content-type')||'';
      if(!ct.includes('text/html'))return r;
      let h=await r.text();
      try{
        const vr=await fetch(new URL('./jadual-v4-data.js?v=20261002-v4',u).toString(),{cache:'no-store'});
        const vjs=await vr.text();
        const m=vjs.match(/JADUAL_V4_DATA_B64\s*=\s*["']([^"']+)["']/);
        if(m){
          const bin=atob(m[1].replace(/\s/g,''));
          const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
          const ds=new DecompressionStream('gzip');
          const stream=new Blob([bytes]).stream().pipeThrough(ds);
          const jsonText=await new Response(stream).text();
          const data=JSON.parse(jsonText);
          const inject=`\n/* JADUAL V4 injected before init() */\nif(!VERSION_DATA.some(v=>v.id==='v4')){VERSION_DATA.push({id:'v4',label:'Versi 4.0 — 27 September 2026',shortLabel:'V4 — 27/09/2026',data:${JSON.stringify(data)}});}\n`;
          h=h.replace(/\ninit\(\);/,inject+'\ninit();');
        }
      }catch(e){
        h=h.replace(/\ninit\(\);/,'\nconsole.warn("Jadual V4 injection failed",e);\ninit();');
      }
      const hd=new Headers(r.headers);hd.delete('content-length');
      hd.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
      return new Response(h,{status:r.status,statusText:r.statusText,headers:hd});
    })());
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
