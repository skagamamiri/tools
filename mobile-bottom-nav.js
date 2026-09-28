/* ICT HUB mobile bottom navigation V1
   Loaded by sw.js on the main ICT HUB page only.
   Desktop is untouched. Existing tool launch/category/auth logic is reused.
*/
(function(){
  'use strict';
  if (window.__ICT_HUB_MOBILE_NAV_V1__) return;
  window.__ICT_HUB_MOBILE_NAV_V1__ = true;

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
  if (!isMobile()) return;

  const $ = (s, r=document) => r.querySelector(s);
  const el = (tag, cls, html='') => {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    x.innerHTML = html;
    return x;
  };

  function addStyle(){
    if ($('#ictMobileNavV1Style')) return;
    const s = document.createElement('style');
    s.id = 'ictMobileNavV1Style';
    s.textContent = `
      @media(max-width:768px){
        body{padding-bottom:92px!important}
        body>.mobile-bottom-nav{display:none!important}
        #headerInstallAppBtn,#teacherAuthContainer,#themeToggleBtn{display:none!important}
        #ictMobileNavV1{position:fixed;left:0;right:0;bottom:0;height:76px;padding:7px 24px calc(7px + env(safe-area-inset-bottom));box-sizing:content-box;display:flex;justify-content:space-around;align-items:flex-start;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid rgba(148,163,184,.22);box-shadow:0 -10px 30px rgba(15,23,42,.10);z-index:99990}
        .dark #ictMobileNavV1{background:rgba(15,23,42,.97);border-top-color:rgba(148,163,184,.16)}
        .ict-mn-btn{position:relative;width:76px;height:60px;border:0;background:transparent!important;box-shadow:none!important;color:#94a3b8!important;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .ict-mn-btn i{font-size:21px;line-height:1}.ict-mn-btn span{font:800 10px Inter,system-ui,sans-serif}.ict-mn-btn.active{color:#16a34a!important}.ict-mn-btn.active:before{content:"";position:absolute;top:-7px;width:36px;height:3px;border-radius:99px;background:linear-gradient(90deg,#16a34a,#0891b2)}
        .ict-mn-qr{width:64px;height:64px;margin-top:-23px;border-radius:50%!important;background:linear-gradient(135deg,#059669,#0891b2)!important;color:#fff!important;border:5px solid #fff!important;box-shadow:0 8px 24px rgba(5,150,105,.28)!important}.dark .ict-mn-qr{border-color:#0f172a!important}
        #ictProfileSheetBg,#ictQrSheetBg{position:fixed;inset:0;display:none;align-items:flex-end;justify-content:center;background:rgba(2,8,23,.55);backdrop-filter:blur(4px);z-index:100000;padding:0}
        #ictProfileSheetBg.open,#ictQrSheetBg.open{display:flex}
        .ict-sheet-v1{width:100%;max-height:82vh;overflow:auto;background:#fff;color:#0f172a;border-radius:28px 28px 0 0;padding:12px 18px 30px;box-sizing:border-box;box-shadow:0 -20px 60px rgba(2,8,23,.25);font-family:Inter,system-ui,sans-serif}.dark .ict-sheet-v1{background:#0f172a;color:#f8fafc}
        .ict-handle-v1{width:44px;height:5px;border-radius:99px;background:#cbd5e1;margin:0 auto 18px}.ict-sheet-title-v1{font:800 23px Outfit,Inter,sans-serif}.ict-sheet-sub-v1{font-size:12px;color:#64748b;margin:5px 0 18px}.dark .ict-sheet-sub-v1{color:#94a3b8}
        .ict-profile-row-v1{width:100%;display:flex;align-items:center;gap:12px;border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:13px;margin:0 0 10px;box-sizing:border-box;text-align:left}.dark .ict-profile-row-v1{background:#1e293b;border-color:#334155;color:#f8fafc}
        .ict-row-icon-v1{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:grid;place-items:center;background:#f0fdf4;color:#059669}.ict-row-google-v1{background:#fff1f2;color:#ea4335}.ict-row-blue-v1{background:#eff6ff;color:#0284c7}
        .ict-row-main-v1{flex:1;min-width:0}.ict-row-main-v1 b{display:block;font-size:14px}.ict-row-main-v1 small{display:block;font-size:11px;color:#64748b;margin-top:3px}.dark .ict-row-main-v1 small{color:#94a3b8}
        .ict-theme-v1{display:flex;gap:3px;padding:4px;border-radius:99px;background:#f1f5f9}.dark .ict-theme-v1{background:#334155}.ict-theme-v1 button{width:34px;height:30px;border:0;border-radius:99px;background:transparent;color:#64748b}.ict-theme-v1 button.on{background:#fff;color:#059669;box-shadow:0 2px 7px #0001}
        .ict-close-v1{border:0;background:#f1f5f9;color:#334155;border-radius:12px;padding:10px 16px;font-weight:800;margin-top:8px}.dark .ict-close-v1{background:#334155;color:#e2e8f0}
        .ict-qr-frame-v1{width:210px;height:210px;margin:18px auto;border:4px solid #059669;border-radius:24px;display:grid;place-items:center;background:#ecfdf5;color:#059669}.ict-qr-frame-v1 i{font-size:72px}
        .ict-note-v1{text-align:center;font-size:12px;line-height:1.5;color:#64748b}.dark .ict-note-v1{color:#94a3b8}
      }
    `;
    document.head.appendChild(s);
  }

  function closeSheets(){
    $('#ictProfileSheetBg')?.classList.remove('open');
    $('#ictQrSheetBg')?.classList.remove('open');
  }
  function openSheet(id){ closeSheets(); $(id)?.classList.add('open'); }

  function triggerLogin(){
    const candidates=['#teacherLoginHeaderBtn','#teacherLoginBtn','[onclick*="openTeacherLoginModal"]'];
    for(const sel of candidates){ const b=$(sel); if(b){ b.click(); return; } }
    if(typeof window.openTeacherLoginModal==='function') window.openTeacherLoginModal();
  }
  function triggerInstall(){
    if(typeof window.installICTHubApp==='function'){ window.installICTHubApp(); return; }
    if(typeof window.installApp==='function'){ window.installApp(); return; }
    const b=$('#headerInstallAppBtn'); if(b) b.click();
  }
  function triggerTheme(mode){
    const b = mode==='dark' ? $('#themeToggleBtn') : null;
    if(b){ b.click(); return; }
    document.documentElement.classList.toggle('dark', mode==='dark');
    document.body.classList.toggle('dark', mode==='dark');
    try{localStorage.setItem('theme',mode);localStorage.setItem('ict_hub_theme',mode)}catch(e){}
  }
  function refreshThemeButtons(){
    const dark=document.documentElement.classList.contains('dark')||document.body.classList.contains('dark');
    $('#ictThemeLightV1')?.classList.toggle('on',!dark);
    $('#ictThemeDarkV1')?.classList.toggle('on',dark);
  }

  function build(){
    if($('#ictMobileNavV1')) return;
    addStyle();
    const nav=el('nav',''); nav.id='ictMobileNavV1'; nav.setAttribute('aria-label','Navigasi ICT HUB');
    nav.innerHTML=`
      <button id="ictNavHomeV1" class="ict-mn-btn active" type="button"><i class="fa-solid fa-house"></i><span>Home</span></button>
      <button id="ictNavQrV1" class="ict-mn-btn ict-mn-qr" type="button"><i class="fa-solid fa-qrcode"></i><span>QR</span></button>
      <button id="ictNavProfileV1" class="ict-mn-btn" type="button"><i class="fa-regular fa-user"></i><span>Profil</span></button>`;
    document.body.appendChild(nav);

    const profileBg=el('div',''); profileBg.id='ictProfileSheetBg';
    profileBg.innerHTML=`<section class="ict-sheet-v1"><div class="ict-handle-v1"></div><div class="ict-sheet-title-v1">Profil & Tetapan</div><div class="ict-sheet-sub-v1">Akaun dan tetapan ICT HUB</div>
      <button id="ictLoginV1" class="ict-profile-row-v1" type="button"><div class="ict-row-icon-v1 ict-row-google-v1"><i class="fa-brands fa-google"></i></div><div class="ict-row-main-v1"><b>Login dengan Google</b><small>Log masuk untuk menggunakan ciri guru</small></div><i class="fa-solid fa-chevron-right"></i></button>
      <div class="ict-profile-row-v1"><div class="ict-row-icon-v1"><i class="fa-solid fa-circle-half-stroke"></i></div><div class="ict-row-main-v1"><b>Mod Paparan</b><small>Tukar antara mod cerah dan gelap</small></div><div class="ict-theme-v1"><button id="ictThemeLightV1" type="button"><i class="fa-solid fa-sun"></i></button><button id="ictThemeDarkV1" type="button"><i class="fa-solid fa-moon"></i></button></div></div>
      <button id="ictInstallV1" class="ict-profile-row-v1" type="button"><div class="ict-row-icon-v1 ict-row-blue-v1"><i class="fa-solid fa-download"></i></div><div class="ict-row-main-v1"><b>Pasang Aplikasi</b><small>Pasang ICT HUB pada telefon</small></div><i class="fa-solid fa-chevron-right"></i></button>
      <button id="ictCloseProfileV1" class="ict-close-v1" type="button">Tutup</button></section>`;
    document.body.appendChild(profileBg);

    const qrBg=el('div',''); qrBg.id='ictQrSheetBg';
    qrBg.innerHTML=`<section class="ict-sheet-v1" style="align-self:center;width:min(390px,92%);border-radius:28px"><div class="ict-sheet-title-v1" style="text-align:center">QR Scanner</div><div class="ict-qr-frame-v1"><i class="fa-solid fa-qrcode"></i></div><div class="ict-note-v1">Fungsi scanner sebenar akan disambungkan kemudian. Buat masa ini ini ialah paparan dummy untuk QR Scanner.</div><div style="text-align:center"><button id="ictCloseQrV1" class="ict-close-v1" type="button">Tutup</button></div></section>`;
    document.body.appendChild(qrBg);

    $('#ictNavHomeV1').onclick=()=>{closeSheets();$('#ictNavHomeV1').classList.add('active');$('#ictNavProfileV1').classList.remove('active');window.scrollTo({top:0,behavior:'smooth'});if(typeof window.setCategory==='function')window.setCategory('ALL');};
    $('#ictNavQrV1').onclick=()=>{openSheet('#ictQrSheetBg');$('#ictNavHomeV1').classList.remove('active');$('#ictNavProfileV1').classList.remove('active');};
    $('#ictNavProfileV1').onclick=()=>{openSheet('#ictProfileSheetBg');$('#ictNavHomeV1').classList.remove('active');$('#ictNavProfileV1').classList.add('active');refreshThemeButtons();};
    $('#ictLoginV1').onclick=triggerLogin;
    $('#ictInstallV1').onclick=triggerInstall;
    $('#ictThemeLightV1').onclick=()=>{triggerTheme('light');setTimeout(refreshThemeButtons,80)};
    $('#ictThemeDarkV1').onclick=()=>{triggerTheme('dark');setTimeout(refreshThemeButtons,80)};
    $('#ictCloseProfileV1').onclick=closeSheets;
    $('#ictCloseQrV1').onclick=closeSheets;
    profileBg.onclick=e=>{if(e.target===profileBg)closeSheets()};
    qrBg.onclick=e=>{if(e.target===qrBg)closeSheets()};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build,{once:true}); else build();
})();
