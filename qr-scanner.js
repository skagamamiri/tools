/*
 * ICT HUB — Pengimbas Kod QR (paparan mobile sahaja)
 * Menambah butang "Imbas QR" di kad profil (baris Mod Gelap / Logout),
 * di sebelah kiri bawah gambar profil. Butang hanya dipaparkan pada skrin <= 768px.
 * Pustaka html5-qrcode dimuatkan hanya apabila butang ditekan.
 */
(function () {
  'use strict';

  var LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
  var BTN_ID = 'ictProfileQrBtn';
  var MODAL_ID = 'ictQrModal';
  var READER_ID = 'ictQrReader';

  var libPromise = null;
  var scanner = null;
  var scanning = false;
  var lastResult = '';

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
    '#' + MODAL_ID + ' .qr-top h3{flex:1;margin:0;font:800 18px Outfit,Inter,sans-serif}' +
    '#' + MODAL_ID + ' .qr-top small{display:block;font:500 12px Inter,sans-serif;opacity:.8}' +
    '#' + MODAL_ID + ' .qr-close{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.3);' +
      'background:rgba(15,23,42,.25);color:#fff;font-size:18px}' +
    '#' + MODAL_ID + ' .qr-body{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px}' +
    '#' + READER_ID + '{width:100%;max-width:420px;margin:0 auto;border-radius:18px;overflow:hidden;background:#000;min-height:260px}' +
    '#' + READER_ID + ' video{width:100%!important;height:auto!important;display:block;object-fit:cover}' +
    '#' + MODAL_ID + ' .qr-status{text-align:center;font-size:13px;color:#cbd5e1;min-height:18px}' +
    '#' + MODAL_ID + ' .qr-status.err{color:#fda4af}' +
    '#' + MODAL_ID + ' .qr-result{display:none;max-width:420px;width:100%;margin:0 auto;padding:14px;border-radius:16px;' +
      'background:#111c2e;border:1px solid #1e3a5f}' +
    '#' + MODAL_ID + ' .qr-result.show{display:block}' +
    '#' + MODAL_ID + ' .qr-result small{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5eead4;margin-bottom:6px}' +
    '#' + MODAL_ID + ' .qr-result-text{font-size:14px;line-height:1.45;word-break:break-word;white-space:pre-wrap;color:#f1f5f9}' +
    '#' + MODAL_ID + ' .qr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
    '#' + MODAL_ID + ' .qr-btn{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;' +
      'min-height:42px;padding:10px 14px;border-radius:12px;font:700 13px Inter,sans-serif;border:1px solid rgba(255,255,255,.18);' +
      'background:rgba(255,255,255,.08);color:#f8fafc;cursor:pointer}' +
    '#' + MODAL_ID + ' .qr-btn.primary{background:#10b981;border-color:#10b981;color:#fff}' +
    '#' + MODAL_ID + ' .qr-btn:active{transform:scale(.97)}' +
    '#' + MODAL_ID + ' .qr-foot{max-width:420px;width:100%;margin:0 auto;display:flex;gap:8px}' +
    '#' + MODAL_ID + ' input[type=file]{display:none}';

  function injectStyle() {
    if (document.getElementById('ictQrStyle')) return;
    var s = document.createElement('style');
    s.id = 'ictQrStyle';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Butang di kad profil ---------- */
  function ensureButton() {
    var actions = document.querySelector('#welcomeProfileContent .ict-profile-actions');
    if (!actions || document.getElementById(BTN_ID)) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BTN_ID;
    btn.className = 'ict-profile-header-btn';
    btn.title = 'Imbas kod QR';
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
    m.setAttribute('aria-label', 'Imbas Kod QR');
    m.innerHTML =
      '<div class="qr-top">' +
        '<div style="flex:1"><h3><i class="fa-solid fa-qrcode"></i> Imbas Kod QR</h3><small>Halakan kamera ke kod QR</small></div>' +
        '<button type="button" class="qr-close" data-qr="close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="qr-body">' +
        '<div id="' + READER_ID + '"></div>' +
        '<div class="qr-status" data-qr="status"></div>' +
        '<div class="qr-result" data-qr="result">' +
          '<small>Hasil imbasan</small>' +
          '<div class="qr-result-text" data-qr="text"></div>' +
          '<div class="qr-actions">' +
            '<button type="button" class="qr-btn primary" data-qr="open"><i class="fa-solid fa-arrow-up-right-from-square"></i>Buka Pautan</button>' +
            '<button type="button" class="qr-btn" data-qr="copy"><i class="fa-regular fa-copy"></i>Salin</button>' +
            '<button type="button" class="qr-btn" data-qr="again"><i class="fa-solid fa-rotate-right"></i>Imbas Semula</button>' +
          '</div>' +
        '</div>' +
        '<div class="qr-foot">' +
          '<button type="button" class="qr-btn" data-qr="file"><i class="fa-regular fa-image"></i>Pilih Gambar QR</button>' +
          '<input type="file" accept="image/*" data-qr="input">' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);

    m.querySelector('[data-qr="close"]').addEventListener('click', closeModal);
    m.querySelector('[data-qr="again"]').addEventListener('click', function () { hideResult(); startCamera(); });
    m.querySelector('[data-qr="copy"]').addEventListener('click', copyResult);
    m.querySelector('[data-qr="open"]').addEventListener('click', openResult);
    var input = m.querySelector('[data-qr="input"]');
    m.querySelector('[data-qr="file"]').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.value = '';
      if (f) scanImageFile(f);
    });
    return m;
  }

  function el(name) {
    var m = document.getElementById(MODAL_ID);
    return m ? m.querySelector('[data-qr="' + name + '"]') : null;
  }

  function setStatus(msg, isErr) {
    var s = el('status');
    if (!s) return;
    s.textContent = msg || '';
    s.classList.toggle('err', !!isErr);
  }

  function openModal() {
    var m = buildModal();
    m.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    hideResult();
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
      sc.onerror = function () { libPromise = null; reject(new Error('Gagal memuatkan pustaka QR')); };
      document.head.appendChild(sc);
    });
    return libPromise;
  }

  function getScanner(Lib) {
    if (!scanner) scanner = new Lib(READER_ID, { verbose: false });
    return scanner;
  }

  /* ---------- Kamera ---------- */
  function startCamera() {
    if (scanning) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Kamera tidak tersedia di pelayar ini. Gunakan "Pilih Gambar QR".', true);
      return;
    }
    setStatus('Memulakan kamera...');
    loadLib().then(function (Lib) {
      var s = getScanner(Lib);
      scanning = true;
      return s.start(
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
        setStatus('Halakan kamera ke kod QR');
      });
    }).catch(function (err) {
      scanning = false;
      var name = err && (err.name || String(err));
      var msg = /NotAllowed|Permission/i.test(name)
        ? 'Akses kamera ditolak. Benarkan kamera dalam tetapan pelayar, atau gunakan "Pilih Gambar QR".'
        : /NotFound|Overconstrained/i.test(name)
          ? 'Tiada kamera ditemui. Gunakan "Pilih Gambar QR".'
          : (err && err.message) ? err.message : 'Kamera tidak dapat dimulakan.';
      setStatus(msg, true);
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
    showResult(text);
  }

  function scanImageFile(file) {
    setStatus('Membaca gambar...');
    stopCamera().then(loadLib).then(function (Lib) {
      return getScanner(Lib).scanFile(file, false);
    }).then(function (text) {
      showResult(text);
    }).catch(function () {
      setStatus('Tiada kod QR dikesan dalam gambar ini.', true);
    });
  }

  /* ---------- Hasil ---------- */
  function safeUrl(text) {
    try {
      var u = new URL(String(text).trim());
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u : null;
    } catch (e) { return null; }
  }

  function showResult(text) {
    lastResult = String(text || '');
    el('text').textContent = lastResult;
    el('open').style.display = safeUrl(lastResult) ? '' : 'none';
    el('result').classList.add('show');
    setStatus('Kod QR berjaya diimbas');
  }

  function hideResult() {
    lastResult = '';
    var r = el('result');
    if (r) r.classList.remove('show');
    setStatus('');
  }

  function openResult() {
    var u = safeUrl(lastResult);
    if (!u) return;
    if (u.origin === window.location.origin) {
      closeModal();
      window.location.href = u.href;
    } else {
      window.open(u.href, '_blank', 'noopener');
    }
  }

  function copyResult() {
    var done = function () { setStatus('Disalin ke papan klip'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastResult).then(done, fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = lastResult;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { setStatus('Gagal menyalin', true); }
      ta.remove();
    }
  }

  /* ---------- Mula ---------- */
  function init() {
    injectStyle();
    ensureButton();
    // renderWelcomeProfile() menulis semula kad profil (login/logout/tukar tema),
    // jadi pasang semula butang setiap kali kandungan berubah.
    var target = document.getElementById('welcomeProfileContent') || document.body;
    new MutationObserver(ensureButton).observe(target, { childList: true, subtree: true });
    document.addEventListener('keydown', function (e) {
      var m = document.getElementById(MODAL_ID);
      if (e.key === 'Escape' && m && m.classList.contains('open')) closeModal();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopCamera();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ICTQrScanner = { open: openModal, close: closeModal };
})();
