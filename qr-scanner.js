/*
 * ICT HUB — Pengimbas Kod QR Kehadiran Kelas
 * - Di halaman utama (index.html): butang "Imbas QR" di kad profil, di bawah gambar profil,
 *   sebaris Mod Gelap / Logout. Paparan mobile sahaja (skrin <= 768px).
 * - Hanya menerima kod ICT HUB (ICTHUB:KELAS:4A / ICTHUB:BILIK:<nama bilik>).
 *   Kod sah dihantar ke kehadiran.html untuk dipadankan dengan jadual dan direkod.
 * - Kamera sahaja (tiada pilihan muat naik gambar) supaya guru perlu berada di kelas.
 * - Halaman lain boleh guna: ICTQrScanner.open({ onCode: function (text) { ... } })
 */
(function () {
  'use strict';

  var LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
  var BTN_ID = 'ictProfileQrBtn';
  var MODAL_ID = 'ictQrModal';
  var READER_ID = 'ictQrReader';
  var CODE_RE = /^\s*ICTHUB\s*:\s*(KELAS|BILIK)\s*:\s*.+$/i;

  var libPromise = null;
  var scanner = null;
  var scanning = false;
  var onCodeHandler = null;

  /* ---------- Gaya ---------- */
  var css = '' +
    '#' + BTN_ID + '{display:none}' +
    '@media(max-width:768px){' +
      '#' + BTN_ID + '{display:inline-flex!important;margin-right:auto!important;' +
        'color:#0f172a!important;background:#fbbf24!important;border:1px solid rgba(255,255,255,.35)!important}' +
      '#' + BTN_ID + ' i{font-size:14px!important}' +
    '}' +
    '@media(max-width:340px){#' + BTN_ID + ' span{display:none}}' +
    '#' + MODAL_ID + '{position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;' +
      'background:#0b1220;color:#f8fafc;font-family:Inter,system-ui,sans-serif}' +
    '#' + MODAL_ID + '.open{display:flex}' +
    '#' + MODAL_ID + ' .qr-top{display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 16px 12px;' +
      'background:linear-gradient(135deg,#0f766e,#134e4a)}' +
    '#' + MODAL_ID + ' .qr-top h3{margin:0;font:800 18px Outfit,Inter,sans-serif}' +
    '#' + MODAL_ID + ' .qr-top small{display:block;font:500 12px Inter,sans-serif;opacity:.85}' +
    '#' + MODAL_ID + ' .qr-close{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.3);' +
      'background:rgba(15,23,42,.25);color:#fff;font-size:18px;cursor:pointer}' +
    '#' + MODAL_ID + ' .qr-body{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px}' +
    '#' + READER_ID + '{width:100%;max-width:420px;margin:0 auto;border-radius:18px;overflow:hidden;background:#000;min-height:260px}' +
    '#' + READER_ID + ' video{width:100%!important;height:auto!important;display:block;object-fit:cover}' +
    '#' + MODAL_ID + ' .qr-status{text-align:center;font-size:14px;line-height:1.45;color:#cbd5e1;min-height:20px;max-width:420px;margin:0 auto}' +
    '#' + MODAL_ID + ' .qr-status.err{color:#fda4af}' +
    '#' + MODAL_ID + ' .qr-status.ok{color:#6ee7b7;font-weight:700}' +
    '#' + MODAL_ID + ' .qr-hint{max-width:420px;margin:0 auto;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5}' +
    '#' + MODAL_ID + ' .qr-btn{display:none;align-items:center;justify-content:center;gap:8px;max-width:420px;width:100%;margin:0 auto;' +
      'min-height:44px;border-radius:12px;font:700 14px Inter,sans-serif;border:1px solid rgba(255,255,255,.18);' +
      'background:rgba(255,255,255,.08);color:#f8fafc;cursor:pointer}' +
    '#' + MODAL_ID + ' .qr-btn.show{display:inline-flex}';

  function injectStyle() {
    if (document.getElementById('ictQrStyle')) return;
    var s = document.createElement('style');
    s.id = 'ictQrStyle';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Butang di kad profil (index.html) ---------- */
  function ensureButton() {
    var actions = document.querySelector('#welcomeProfileContent .ict-profile-actions');
    if (!actions || document.getElementById(BTN_ID)) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.className = 'ict-profile-header-btn';
    btn.title = 'Imbas kod QR kelas / bilik khas';
    btn.innerHTML = '<i class="fa-solid fa-qrcode"></i><span>Imbas QR</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  /* ---------- Modal ---------- */
  function buildModal() {
    var m = document.getElementById(MODAL_ID);
    if (m) return m;
    m = document.createElement('div');
    m.id = MODAL_ID;
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'Imbas Kod QR Kelas');
    m.innerHTML =
      '<div class="qr-top">' +
        '<div style="flex:1"><h3><i class="fa-solid fa-qrcode"></i> Imbas Kod QR Kelas</h3><small>Rekod kehadiran guru di kelas / bilik khas</small></div>' +
        '<button type="button" class="qr-close" data-qr="close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="qr-body">' +
        '<div id="' + READER_ID + '"></div>' +
        '<div class="qr-status" data-qr="status"></div>' +
        '<button type="button" class="qr-btn" data-qr="again"><i class="fa-solid fa-rotate-right"></i>Imbas Semula</button>' +
        '<p class="qr-hint">Halakan kamera ke kod QR yang ditampal di kelas atau bilik khas.</p>' +
      '</div>';
    document.body.appendChild(m);
    m.querySelector('[data-qr="close"]').addEventListener('click', closeModal);
    m.querySelector('[data-qr="again"]').addEventListener('click', function () {
      this.classList.remove('show');
      startCamera();
    });
    return m;
  }

  function el(name) {
    var m = document.getElementById(MODAL_ID);
    return m ? m.querySelector('[data-qr="' + name + '"]') : null;
  }

  function setStatus(msg, kind) {
    var s = el('status');
    if (!s) return;
    s.textContent = msg || '';
    s.classList.toggle('err', kind === 'err');
    s.classList.toggle('ok', kind === 'ok');
  }

  function showAgain() { var b = el('again'); if (b) b.classList.add('show'); }

  function openModal(options) {
    onCodeHandler = options && typeof options.onCode === 'function' ? options.onCode : null;
    var m = buildModal();
    m.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    el('again').classList.remove('show');
    setStatus('');
    startCamera();
  }

  function closeModal() {
    stopCamera();
    var m = document.getElementById(MODAL_ID);
    if (m) m.classList.remove('open');
    document.documentElement.style.overflow = '';
  }

  /* ---------- Pustaka ---------- */
  function getLibClass() {
    return window.Html5Qrcode ||
      (window.__Html5QrcodeLibrary__ && window.__Html5QrcodeLibrary__.Html5Qrcode) || null;
  }

  function loadLib() {
    if (getLibClass()) return Promise.resolve(getLibClass());
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = LIB_URL;
      sc.async = true;
      sc.onload = function () {
        var C = getLibClass();
        C ? resolve(C) : reject(new Error('Pustaka QR tidak lengkap'));
      };
      sc.onerror = function () { libPromise = null; reject(new Error('Gagal memuatkan pengimbas. Semak sambungan internet.')); };
      document.head.appendChild(sc);
    });
    return libPromise;
  }

  /* ---------- Kamera ---------- */
  function startCamera() {
    if (scanning) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Kamera tidak tersedia di pelayar ini.', 'err');
      return;
    }
    setStatus('Memulakan kamera...');
    loadLib().then(function (Lib) {
      if (!scanner) scanner = new Lib(READER_ID, { verbose: false });
      scanning = true;
      return scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: function (w, h) {
            var size = Math.floor(Math.min(w, h) * 0.72);
            return { width: size, height: size };
          }
        },
        onDecoded,
        function () { /* tiada QR dalam bingkai — abaikan */ }
      ).then(function () {
        setStatus('Halakan kamera ke kod QR kelas / bilik');
      });
    }).catch(function (err) {
      scanning = false;
      var name = err && (err.name || String(err));
      var msg = /NotAllowed|Permission/i.test(name)
        ? 'Akses kamera ditolak. Benarkan kamera untuk laman ini dalam tetapan pelayar.'
        : /NotFound|Overconstrained/i.test(name)
          ? 'Tiada kamera ditemui pada peranti ini.'
          : (err && err.message) ? err.message : 'Kamera tidak dapat dimulakan.';
      setStatus(msg, 'err');
      showAgain();
    });
  }

  function stopCamera() {
    if (!scanner || !scanning) return Promise.resolve();
    scanning = false;
    return scanner.stop().catch(function () {}).then(function () {
      try { scanner.clear(); } catch (e) {}
    });
  }

  function onDecoded(text) {
    if (!scanning) return;
    stopCamera();
    if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} }

    if (!CODE_RE.test(text)) {
      setStatus('Kod QR ini bukan kod kelas atau bilik khas ICT HUB.', 'err');
      showAgain();
      return;
    }
    if (onCodeHandler) {
      closeModal();
      onCodeHandler(String(text).trim());
      return;
    }
    // Lalai (halaman utama): teruskan ke halaman Kehadiran Kelas.
    setStatus('Kod dikesan. Membuka Kehadiran Kelas...', 'ok');
    window.location.href = 'kehadiran.html?kod=' + encodeURIComponent(String(text).trim());
  }

  /* ---------- Mula ---------- */
  function init() {
    injectStyle();
    ensureButton();
    // renderWelcomeProfile() menulis semula kad profil (login/logout/tukar tema),
    // jadi pasang semula butang setiap kali kandungan berubah.
    var target = document.getElementById('welcomeProfileContent');
    if (target) new MutationObserver(ensureButton).observe(target, { childList: true, subtree: true });
    document.addEventListener('keydown', function (e) {
      var m = document.getElementById(MODAL_ID);
      if (e.key === 'Escape' && m && m.classList.contains('open')) closeModal();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopCamera();
    });
    // Pulang ke halaman melalui butang Back (bfcache): pastikan modal tertutup.
    window.addEventListener('pageshow', function () {
      var m = document.getElementById(MODAL_ID);
      if (m && m.classList.contains('open') && !scanning) closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ICTQrScanner = { open: openModal, close: closeModal };
})();
