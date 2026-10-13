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
});

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyAPz0zv7RuEHHrmVyO8ECLHv-Hn3dGDZnK3',authDomain:'skamis-hubtool.firebaseapp.com',projectId:'skamis-hubtool',storageBucket:'skamis-hubtool.firebasestorage.app',messagingSenderId:'236769370780',appId:'1:236769370780:web:9dfa07d772a721ecfe0359'});
const messaging=firebase.messaging();
function broadcast(type,data){return self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list.forEach(c=>c.postMessage({source:'jadual-fcm-sw',type,data})))}
// ---------- Notifikasi jadual: format kemas ----------
const NOTIF_ICON='./logo-sk-agama-miri.png';   // logo sekolah (ikon besar)
const NOTIF_BADGE='./notif-badge.png';         // loceng putih di bar status Android
const NOTIF_VIBRATE=[300,150,300,150,600];
// Susun semula "5C • MT\n🕐 11:30" kepada tajuk berserta masa dan teks yang jelas.
function formatJadualNotif(title,body,d){
  const text=String(body||'');
  const time=d.start||d.masa||((text.match(/\b(\d{1,2}:\d{2})\b/)||[])[1])||'';
  const first=(text.split('\n')[0]||'').replace(/🕐|🕑|🕒|⏰/g,'').trim();
  const parts=first.split(/\s*[•·|]\s*/).filter(Boolean).filter(x=>!/^\d{1,2}:\d{2}/.test(x));
  const kelas=d.class||d.kelas||(parts.length>=2?parts[0]:'');
  const subjek=d.subject||d.subjek||(parts.length>=2?parts.slice(1).join(' · '):'');
  const isKelas=/kelas|bermula|class/i.test(title||'')||(kelas&&subjek);
  if(!isKelas||(!kelas&&!subjek)) return {title:title||'🔔 Jadual Waktu',body:text||'Kelas anda bermula sekarang.'};
  const t=String(title||'🔔 Kelas Bermula').replace(/\s*sekarang\s*/i,'').trim();
  return {
    title: time && !t.includes(time) ? `${t} · ${time}` : t,
    body: [kelas?`🏫 ${kelas}`:'',subjek?`📘 ${subjek}`:''].filter(Boolean).join('     ')+'\nSila ke kelas sekarang.'
  };
}
function showJadualNotif(rawTitle,rawBody,d,tag){
  const f=formatJadualNotif(rawTitle,rawBody,d||{});
  return self.registration.showNotification(f.title,{
    body:f.body,tag:tag||'jadual-fcm',renotify:true,silent:false,vibrate:NOTIF_VIBRATE,
    requireInteraction:false,icon:NOTIF_ICON,badge:NOTIF_BADGE,timestamp:Date.now(),
    actions:[{action:'open',title:'📅 Buka Jadual'},{action:'close',title:'Tutup'}],
    data:{url:'./jadual.html'}
  });
}
messaging.onBackgroundMessage(payload=>{const d=payload?.data||{};const n=payload?.notification||{};const title=d.title||n.title||'🔔 Jadual Waktu';const body=d.body||n.body||'Kelas anda bermula sekarang.';const tag=d.tag||'jadual-fcm';broadcast('backgroundMessage',{title,body,tag,hasData:!!payload?.data,hasNotification:!!payload?.notification});return showJadualNotif(title,body,d,tag)});
self.addEventListener('message',e=>{if(e.data?.type==='ping')broadcast('pong',{time:Date.now()})});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  if(e.action==='close')return;
  const target=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){ if(c.url.split('?')[0]===target && 'focus' in c) return c.focus(); }
    for(const c of list){ if('navigate' in c && 'focus' in c) return c.navigate(target).then(w=>(w||c).focus()); }
    return clients.openWindow(target);
  }));
});
