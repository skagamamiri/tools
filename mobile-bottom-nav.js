/* ICT HUB mobile bottom navigation V5 */
(function(){
'use strict';
const isMobile=window.matchMedia('(max-width:768px)').matches;
const homePaths=new Set(['/tools','/tools/','/tools/index.html']);
function isHubHome(){return homePaths.has(window.location.pathname||'');}
function cleanupToolPage(){
  ['#ictMobileNavV1','#ictMobileNavV2','#ictMobileNavV3','#ictMobileNavV4','#ictMobileNavV5','.mobile-bottom-nav','#ictProfileSheetBg','#ictProfileSheetBgV3','#ictProfileSheetBgV4','#ictQrSheetBg','#ictQrSheetBgV3','#ictQrSheetBgV4','[id*="ictMobileNav"]'].forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.remove()));
  document.querySelectorAll('script[src*="mobile-bottom-nav"],script[src*="mobile-nav"],script[src*="bottom-nav"]').forEach(el=>{if(el!==document.currentScript)el.remove()});
  document.querySelectorAll('#ictMobileNavV3Style,#ictMobileNavV4Style,#ictMobileNavV5Style').forEach(el=>el.remove());
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
if(!isMobile||window.__ICT_HUB_MOBILE_NAV_V5__)return;
window.__ICT_HUB_MOBILE_NAV_V5__=true;
const $=(s,r=document)=>r.querySelector(s);
const el=(tag,cls,html='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.innerHTML=html;return x};
function addStyle(){if($('#ictMobileNavV5Style'))return;const s=document.createElement('style');s.id='ictMobileNavV5Style';s.textContent=`@media(max-width:768px){body{padding-bottom:68px!important}#ictMobileNavV5{position:fixed;left:0;right:0;bottom:0;height:54px;padding:3px 24px calc(3px + env(safe-area-inset-bottom));box-sizing:content-box;display:flex;justify-content:space-around;align-items:flex-start;background:rgba(255,255,255,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(148,163,184,.22);box-shadow:0 -7px 22px rgba(15,23,42,.09);z-index:99990}.dark #ictMobileNavV5{background:rgba(15,23,42,.98)}.ict-mn-btn-v5{position:relative;width:70px;height:50px;border:0;background:transparent!important;color:#94a3b8!important;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:2px}.ict-mn-btn-v5 i{font-size:18px}.ict-mn-btn-v5 span{font:800 9px Inter,system-ui,sans-serif}.ict-mn-btn-v5.active{color:#16a34a!important}.ict-mn-btn-v5.active:before{content:"";position:absolute;top:-3px;width:30px;height:2.5px;border-radius:99px;background:linear-gradient(90deg,#16a34a,#0891b2)}.ict-mn-qr-v5{width:58px;height:58px;margin-top:-18px;border-radius:50%!important;background:linear-gradient(135deg,#059669,#0891b2)!important;color:#fff!important;border:4px solid #fff!important;box-shadow:0 6px 18px rgba(5,150,105,.25)!important}.ict-sheet-v5{display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.52);align-items:flex-end;justify-content:center}.ict-sheet-v5.open{display:flex!important}.ict-sheet-card-v5{width:100%;box-sizing:border-box;background:#fff;border-radius:26px 26px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.2)}.dark .ict-sheet-card-v5{background:#0f172a;color:#fff}.ict-profile-action-v5{display:block;width:100%;margin:9px 0;padding:13px 14px;border:0;border-radius:13px;background:#f1f5f9;text-align:left;font:700 14px system-ui;color:#0f172a}.dark .ict-profile-action-v5{background:#1e293b;color:#fff}.ict-sheet-close-v5{background:#dcfce7!important;color:#166534!important;text-align:center!important}}`;document.head.appendChild(s)}
function closeSheets(){document.querySelectorAll('.ict-sheet-v5').forEach(x=>x.classList.remove('open'))}
function openSheet(id){closeSheets();$(id)?.classList.add('open')}
function triggerLogin(){for(const sel of ['#teacherLoginHeaderBtn','#teacherLoginBtn','[onclick*="openTeacherLoginModal"]']){const b=$(sel);if(b){b.click();closeSheets();return}}if(typeof window.openTeacherLoginModal==='function'){window.openTeacherLoginModal();closeSheets()}}
function triggerInstall(){if(typeof window.installICTHubApp==='function'){window.installICTHubApp();return}if(typeof window.installApp==='function'){window.installApp();return}$('#headerInstallAppBtn')?.click()}
function triggerTheme(mode){const b=mode==='dark'?$('#themeToggleBtn'):null;if(b)b.click();else{document.documentElement.classList.toggle('dark',mode==='dark');document.body.classList.toggle('dark',mode==='dark');try{localStorage.setItem('theme',mode)}catch(e){}}}
function build(){if(!isHubHome()||$('#ictMobileNavV5'))return;addStyle();
 const nav=el('nav');nav.id='ictMobileNavV5';nav.innerHTML='<button id="ictNavHomeV5" class="ict-mn-btn-v5 active"><i class="fa-solid fa-house"></i><span>Home</span></button><button id="ictNavQrV5" class="ict-mn-btn-v5 ict-mn-qr-v5"><i class="fa-solid fa-qrcode"></i></button><button id="ictNavProfileV5" class="ict-mn-btn-v5"><i class="fa-regular fa-user"></i><span>Profil</span></button>';document.body.appendChild(nav);
 const profile=el('div','ict-sheet-v5');profile.id='ictProfileSheetBgV5';profile.innerHTML='<section class="ict-sheet-card-v5"><h2 style="margin:0 0 14px">Profil & Tetapan</h2><button id="ictLoginV5" class="ict-profile-action-v5">🔐 Login dengan Google</button><button id="ictThemeLightV5" class="ict-profile-action-v5">☀️ Mod Cerah</button><button id="ictThemeDarkV5" class="ict-profile-action-v5">🌙 Mod Gelap</button><button id="ictInstallV5" class="ict-profile-action-v5">📲 Pasang Aplikasi</button><button id="ictCloseProfileV5" class="ict-profile-action-v5 ict-sheet-close-v5">Tutup</button></section>';document.body.appendChild(profile);
 const qr=el('div','ict-sheet-v5');qr.id='ictQrSheetBgV5';qr.innerHTML='<section class="ict-sheet-card-v5" style="text-align:center;max-width:420px"><h2>QR Scanner</h2><div style="font-size:72px;margin:12px">▦</div><p>QR Scanner dummy — fungsi scanner akan ditambah kemudian.</p><button id="ictCloseQrV5" class="ict-profile-action-v5 ict-sheet-close-v5">Tutup</button></section>';document.body.appendChild(qr);
 $('#ictNavHomeV5').onclick=()=>{closeSheets();window.location.href='./';};$('#ictNavQrV5').onclick=()=>openSheet('#ictQrSheetBgV5');$('#ictNavProfileV5').onclick=()=>openSheet('#ictProfileSheetBgV5');$('#ictLoginV5').onclick=triggerLogin;$('#ictInstallV5').onclick=triggerInstall;$('#ictThemeLightV5').onclick=()=>triggerTheme('light');$('#ictThemeDarkV5').onclick=()=>triggerTheme('dark');$('#ictCloseProfileV5').onclick=closeSheets;$('#ictCloseQrV5').onclick=closeSheets;
 profile.addEventListener('click',e=>{if(e.target===profile)closeSheets()});qr.addEventListener('click',e=>{if(e.target===qr)closeSheets()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
