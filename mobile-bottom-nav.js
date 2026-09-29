/* ICT HUB mobile bottom navigation V4 */
(function(){
'use strict';
const isMobile=window.matchMedia('(max-width:768px)').matches;
const homePaths=new Set(['/tools','/tools/','/tools/index.html']);
function isHubHome(){return homePaths.has(window.location.pathname||'');}
function cleanupToolPage(){
  ['#ictMobileNavV1','#ictMobileNavV2','#ictMobileNavV3','#ictMobileNavV4','.mobile-bottom-nav','#ictProfileSheetBg','#ictProfileSheetBgV3','#ictQrSheetBg','#ictQrSheetBgV3','[id*="ictMobileNav"]'].forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
  document.querySelectorAll('script[src*="mobile-bottom-nav"],script[src*="mobile-nav"],script[src*="bottom-nav"]').forEach(el=>{if(el!==document.currentScript)el.remove()});
  document.querySelectorAll('#ictMobileNavV3Style,#ictMobileNavV4Style').forEach(el=>el.remove());
  if(document.body){document.body.style.removeProperty('padding-bottom');document.body.classList.remove('has-mobile-bottom-nav')}
}
function routeGuard(){if(!isHubHome())cleanupToolPage();}
window.addEventListener('popstate',routeGuard);
window.addEventListener('hashchange',routeGuard);
setInterval(routeGuard,500);
if(!isHubHome()){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',routeGuard,{once:true});else routeGuard();
  if(document.documentElement)new MutationObserver(routeGuard).observe(document.documentElement,{childList:true,subtree:true});
  return;
}
if(!isMobile||window.__ICT_HUB_MOBILE_NAV_V4__)return;
window.__ICT_HUB_MOBILE_NAV_V4__=true;
const $=(s,r=document)=>r.querySelector(s);
const el=(tag,cls,html='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.innerHTML=html;return x};
function addStyle(){if($('#ictMobileNavV4Style'))return;const s=document.createElement('style');s.id='ictMobileNavV4Style';s.textContent=`@media(max-width:768px){body{padding-bottom:68px!important}#ictMobileNavV4{position:fixed;left:0;right:0;bottom:0;height:54px;padding:3px 24px calc(3px + env(safe-area-inset-bottom));box-sizing:content-box;display:flex;justify-content:space-around;align-items:flex-start;background:rgba(255,255,255,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(148,163,184,.22);box-shadow:0 -7px 22px rgba(15,23,42,.09);z-index:99990}.dark #ictMobileNavV4{background:rgba(15,23,42,.98)}.ict-mn-btn-v4{position:relative;width:70px;height:50px;border:0;background:transparent!important;color:#94a3b8!important;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:2px}.ict-mn-btn-v4 i{font-size:18px}.ict-mn-btn-v4 span{font:800 9px Inter,system-ui,sans-serif}.ict-mn-btn-v4.active{color:#16a34a!important}.ict-mn-btn-v4.active:before{content:"";position:absolute;top:-3px;width:30px;height:2.5px;border-radius:99px;background:linear-gradient(90deg,#16a34a,#0891b2)}.ict-mn-qr-v4{width:58px;height:58px;margin-top:-18px;border-radius:50%!important;background:linear-gradient(135deg,#059669,#0891b2)!important;color:#fff!important;border:4px solid #fff!important;box-shadow:0 6px 18px rgba(5,150,105,.25)!important}}`;document.head.appendChild(s)}
function closeSheets(){$('#ictProfileSheetBgV4')?.classList.remove('open');$('#ictQrSheetBgV4')?.classList.remove('open')}
function openSheet(id){closeSheets();$(id)?.classList.add('open')}
function triggerLogin(){for(const sel of ['#teacherLoginHeaderBtn','#teacherLoginBtn','[onclick*="openTeacherLoginModal"]']){const b=$(sel);if(b){b.click();return}}if(typeof window.openTeacherLoginModal==='function')window.openTeacherLoginModal()}
function triggerInstall(){if(typeof window.installICTHubApp==='function'){window.installICTHubApp();return}if(typeof window.installApp==='function'){window.installApp();return}$('#headerInstallAppBtn')?.click()}
function triggerTheme(mode){const b=mode==='dark'?$('#themeToggleBtn'):null;if(b)b.click();else{document.documentElement.classList.toggle('dark',mode==='dark');document.body.classList.toggle('dark',mode==='dark');try{localStorage.setItem('theme',mode)}catch(e){}}}
function build(){if(!isHubHome()||$('#ictMobileNavV4'))return;addStyle();const nav=el('nav');nav.id='ictMobileNavV4';nav.innerHTML='<button id="ictNavHomeV4" class="ict-mn-btn-v4 active"><i class="fa-solid fa-house"></i><span>Home</span></button><button id="ictNavQrV4" class="ict-mn-btn-v4 ict-mn-qr-v4"><i class="fa-solid fa-qrcode"></i></button><button id="ictNavProfileV4" class="ict-mn-btn-v4"><i class="fa-regular fa-user"></i><span>Profil</span></button>';document.body.appendChild(nav);const profile=el('div');profile.id='ictProfileSheetBgV4';profile.style.cssText='position:fixed;inset:0;display:none;align-items:flex-end;background:#0008;z-index:100000';profile.innerHTML='<section style="width:100%;background:#fff;border-radius:28px 28px 0 0;padding:22px"><h2>Profil & Tetapan</h2><button id="ictLoginV4">Login dengan Google</button><button id="ictThemeLightV4">☀️ Cerah</button><button id="ictThemeDarkV4">🌙 Gelap</button><button id="ictInstallV4">📲 Pasang Aplikasi</button><button id="ictCloseProfileV4">Tutup</button></section>';document.body.appendChild(profile);const qr=el('div');qr.id='ictQrSheetBgV4';qr.style.cssText='position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#0008;z-index:100000';qr.innerHTML='<section style="background:#fff;border-radius:28px;padding:30px;text-align:center"><h2>QR Scanner</h2><div style="font-size:80px">▦</div><p>QR Scanner dummy</p><button id="ictCloseQrV4">Tutup</button></section>';document.body.appendChild(qr);$('#ictNavHomeV4').onclick=()=>{closeSheets();window.location.href='./';};$('#ictNavQrV4').onclick=()=>openSheet('#ictQrSheetBgV4');$('#ictNavProfileV4').onclick=()=>openSheet('#ictProfileSheetBgV4');$('#ictLoginV4').onclick=triggerLogin;$('#ictInstallV4').onclick=triggerInstall;$('#ictThemeLightV4').onclick=()=>triggerTheme('light');$('#ictThemeDarkV4').onclick=()=>triggerTheme('dark');$('#ictCloseProfileV4').onclick=closeSheets;$('#ictCloseQrV4').onclick=closeSheets}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
