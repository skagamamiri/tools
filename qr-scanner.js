/*
 * ICT HUB — Pengimbas Kod QR Kehadiran Kelas
 * - Di halaman utama (index.html): butang "Imbas QR" di kad profil, di bawah gambar profil,
 *   sebaris Mod Gelap / Logout. Paparan mobile sahaja (skrin <= 768px).
 * - Hanya menerima kod ICT HUB (ICTHUB:KELAS:4A / ICTHUB:BILIK:<nama bilik>).
 *   Kod sah dihantar ke kehadiran.html untuk dipadankan dengan jadual dan direkod.
 * - Kamera dikawal terus (getUserMedia + <video playsinline muted>) supaya berfungsi di iPhone (Safari/Chrome iOS)
 *   dan Android. Penyahkod: BarcodeDetector (jika ada) atau jsQR.
 * - Jika kamera langsung tidak dapat dibuka, guru boleh guna "Ambil Gambar QR" (kamera telefon, bukan galeri).
 * - Halaman lain boleh guna: ICTQrScanner.open({ onCode: function (text) { ... } })
 */
(function () {
  'use strict';

  var JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  var BTN_ID = 'ictProfileQrBtn';
  var MODAL_ID = 'ictQrModal';
  var READER_ID = 'ictQrReader';
  var CODE_RE = /^\s*ICTHUB\s*:\s*(KELAS|BILIK)\s*:\s*.+$/i;
  var SCAN_INTERVAL = 180; // ms antara cubaan nyahkod

  var stream = null;
  var video = null;
  var canvas = null;
  var ctx = null;
  var scanning = false;
  var lastTry = 0;
  var rafId = 0;
  var busyDecode = false;
  var onCodeHandler = null;
  var jsqrPromise = null;
  var nativeDetector = null;

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isInApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok/i.test(ua);

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
    '#' + READER_ID + '{position:relative;width:100%;max-width:420px;margin:0 auto;border-radius:18px;overflow:hidden;background:#000;aspect-ratio:1/1}' +
    '#' + READER_ID + ' video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}' +
    '#' + READER_ID + ' .qr-frame{position:absolute;inset:14%;border:3px solid rgba(251,191,36,.95);border-radius:16px;' +
      'box-shadow:0 0 0 999px rgba(0,0,0,.35);pointer-events:none}' +
    '#' + MODAL_ID + ' .qr-status{text-align:center;font-size:14px;line-height:1.5;color:#cbd5e1;min-height:20px;max-width:420px;margin:0 auto}' +
    '#' + MODAL_ID + ' .qr-status.err{color:#fda4af}' +
    '#' + MODAL_ID + ' .qr-status.ok{color:#6ee7b7;font-weight:700}' +
    '#' + MODAL_ID + ' .qr-status small{display:block;margin-top:6px;color:#94a3b8;font-size:12px}' +
    '#' + MODAL_ID + ' .qr-hint{max-width:420px;margin:0 auto;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5}' +
    '#' + MODAL_ID + ' .qr-btn{display:none;align-items:center;justify-content:center;gap:8px;max-width:420px;width:100%;margin:0 auto;' +
      'min-height:46px;border-radius:12px;font:700 14px Inter,sans-serif;border:1px solid rgba(255,255,255,.18);' +
      'background:rgba(255,255,255,.08);color:#f8fafc;cursor:pointer}' +
    '#' + MODAL_ID + ' .qr-btn.primary{background:#fbbf24;border-color:#fbbf24;color:#0f172a}' +
    '#' + MODAL_ID + ' .qr-btn.show{display:inline-flex}' +
    '#' + MODAL_ID + ' input[type=file]{display:none}';

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
        '<div id="' + READER_ID + '"><div class="qr-frame"></div></div>' +
        '<div class="qr-status" data-qr="status"></div>' +
        '<button type="button" class="qr-btn" data-qr="again"><i class="fa-solid fa-rotate-right"></i>Cuba Kamera Semula</button>' +
        '<button type="button" class="qr-btn primary" data-qr="photo"><i class="fa-solid fa-camera"></i>Ambil Gambar QR</button>' +
        '<input type="file" accept="image/*" capture="environment" data-qr="input">' +
        '<p class="qr-hint">Halakan kamera ke kod QR yang ditampal di kelas atau bilik khas.</p>' +
      '</div>';
    document.body.appendChild(m);
    m.querySelector('[data-qr="close"]').addEventListener('click', closeModal);
    m.querySelector('[data-qr="again"]').addEventListener('click', function () {
      hideButtons();
      startCamera();
    });
    var input = m.querySelector('[data-qr="input"]');
    m.querySelector('[data-qr="photo"]').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.value = '';
      if (f) decodePhoto(f);
    });
    return m;
  }

  function el(name) {
    var m = document.getElementById(MODAL_ID);
    return m ? m.querySelector('[data-qr="' + name + '"]') : null;
  }

  function setStatus(msg, kind, detail) {
    var s = el('status');
    if (!s) return;
    s.textContent = msg || '';
    if (detail) {
      var d = document.createElement('small');
      d.textContent = detail;
      s.appendChild(d);
    }
    s.classList.toggle('err', kind === 'err');
    s.classList.toggle('ok', kind === 'ok');
  }

  function showButtons(again, photo) {
    var a = el('again'), p = el('photo');
    if (a) a.classList.toggle('show', !!again);
    if (p) p.classList.toggle('show', !!photo);
  }
  function hideButtons() { showButtons(false, false); }

  function openModal(options) {
    onCodeHandler = options && typeof options.onCode === 'function' ? options.onCode : null;
    var m = buildModal();
    m.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    hideButtons();
    setStatus('');
    startCamera();
  }

  function closeModal() {
    stopCamera();
    var m = document.getElementById(MODAL_ID);
    if (m) m.classList.remove('open');
    document.documentElement.style.overflow = '';
  }

  /* ---------- Penyahkod ---------- */
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve(window.jsQR);
    if (jsqrPromise) return jsqrPromise;
    jsqrPromise = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = JSQR_URL;
      sc.async = true;
      sc.onload = function () { window.jsQR ? resolve(window.jsQR) : reject(new Error('Pustaka QR tidak lengkap')); };
      sc.onerror = function () { jsqrPromise = null; reject(new Error('Gagal memuatkan pengimbas. Semak sambungan internet.')); };
      document.head.appendChild(sc);
    });
    return jsqrPromise;
  }

  function prepareDecoder() {
    // BarcodeDetector (Chrome Android) lebih pantas; iPhone guna jsQR.
    try {
      if ('BarcodeDetector' in window && window.BarcodeDetector.getSupportedFormats) {
        return window.BarcodeDetector.getSupportedFormats().then(function (f) {
          if (f && f.indexOf('qr_code') >= 0) { nativeDetector = new window.BarcodeDetector({ formats: ['qr_code'] }); return; }
          return loadJsQR();
        }).catch(function () { return loadJsQR(); });
      }
    } catch (e) {}
    return loadJsQR();
  }

  // Nyahkod satu sumber imej (video / imej) melalui kanvas. Pulangkan teks atau null.
  function decodeSource(src, sw, sh) {
    if (!sw || !sh) return Promise.resolve(null);
    if (nativeDetector) {
      return nativeDetector.detect(src).then(function (codes) {
        return codes && codes.length ? codes[0].rawValue : null;
      }).catch(function () { return decodeWithJsQR(src, sw, sh); });
    }
    return decodeWithJsQR(src, sw, sh);
  }

  function decodeWithJsQR(src, sw, sh) {
    return loadJsQR().then(function (jsQR) {
      if (!canvas) { canvas = document.createElement('canvas'); ctx = canvas.getContext('2d', { willReadFrequently: true }); }
      // Potong segi empat di tengah dan kecilkan (maks 720px) supaya laju di telefon.
      var side = Math.min(sw, sh);
      var sx = (sw - side) / 2, sy = (sh - side) / 2;
      var size = Math.min(720, side);
      canvas.width = size; canvas.height = size;
      ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
      var img = ctx.getImageData(0, 0, size, size);
      var r = jsQR(img.data, size, size, { inversionAttempts: 'attemptBoth' });
      if (r && r.data) return r.data;
      // Cuba seluruh imej (untuk gambar yang QR tidak di tengah).
      if (sw !== sh) {
        var scale = Math.min(1, 1000 / Math.max(sw, sh));
        var w = Math.round(sw * scale), h = Math.round(sh * scale);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
        var r2 = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
        if (r2 && r2.data) return r2.data;
      }
      return null;
    });
  }

  /* ---------- Kamera ---------- */
  function ensureVideo() {
    var box = document.getElementById(READER_ID);
    if (!video) {
      video = document.createElement('video');
      // Wajib untuk iPhone: main dalam halaman (bukan skrin penuh) dan tanpa bunyi.
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.muted = true;
      video.playsInline = true;
    }
    if (box && video.parentNode !== box) box.insertBefore(video, box.firstChild);
    return video;
  }

  function getStream() {
    var md = navigator.mediaDevices;
    var tries = [
      { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { audio: false, video: { facingMode: 'environment' } },
      { audio: false, video: true }
    ];
    var i = 0;
    function next(lastErr) {
      if (i >= tries.length) return Promise.reject(lastErr);
      var c = tries[i++];
      return md.getUserMedia(c).catch(function (e) {
        // Jangan cuba lagi jika pengguna menolak kebenaran.
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw e;
        return next(e);
      });
    }
    return next(null);
  }

  function cameraErrorMessage(err) {
    var name = (err && err.name) || '';
    var raw = (err && (err.message || String(err))) || '';
    if (name === 'NotAllowedError' || name === 'SecurityError' || /permission|denied|not allowed/i.test(raw)) {
      return {
        msg: 'Akses kamera ditolak.',
        detail: isIOS
          ? 'iPhone: tekan ikon "aA" di bar alamat → Tetapan Laman Web → Kamera → Benarkan. Atau Tetapan → Safari → Kamera → Benarkan. Kemudian tekan Cuba Kamera Semula.'
          : 'Benarkan kamera untuk laman ini dalam tetapan pelayar, kemudian tekan Cuba Kamera Semula.'
      };
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return { msg: 'Kamera tidak ditemui pada peranti ini.', detail: '' };
    if (name === 'NotReadableError' || name === 'AbortError') {
      return { msg: 'Kamera sedang digunakan oleh aplikasi lain.', detail: 'Tutup aplikasi kamera / panggilan video lain, kemudian cuba semula.' };
    }
    return { msg: 'Kamera tidak dapat dimulakan.', detail: (name ? name + ': ' : '') + raw };
  }

  function startCamera() {
    if (scanning) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Kamera tidak tersedia dalam pelayar ini.', 'err',
        isInApp || isIOS ? 'Buka ICT HUB dalam Safari atau Chrome (bukan dalam aplikasi WhatsApp/Facebook/Instagram), atau guna Ambil Gambar QR.' : 'Guna Ambil Gambar QR.');
      showButtons(false, true);
      return;
    }
    setStatus('Memulakan kamera...');
    var v = ensureVideo();
    Promise.all([getStream(), prepareDecoder()]).then(function (res) {
      stream = res[0];
      v.srcObject = stream;
      var p = v.play();
      return (p && p.then ? p : Promise.resolve()).catch(function () { /* iOS: autoplay muted biasanya dibenarkan */ });
    }).then(function () {
      scanning = true;
      setStatus('Mengimbas...');
      loop();
    }).catch(function (err) {
      stopCamera();
      var m = cameraErrorMessage(err);
      setStatus(m.msg, 'err', m.detail);
      showButtons(true, true);
    });
  }

  function loop() {
    if (!scanning) return;
    rafId = requestAnimationFrame(loop);
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (busyDecode || now - lastTry < SCAN_INTERVAL) return;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    lastTry = now;
    busyDecode = true;
    decodeSource(video, video.videoWidth, video.videoHeight).then(function (text) {
      busyDecode = false;
      if (text && scanning) onDecoded(text);
    }).catch(function () { busyDecode = false; });
  }

  function stopCamera() {
    scanning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (stream) {
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    }
    stream = null;
    if (video) { try { video.pause(); } catch (e) {} video.srcObject = null; }
  }

  /* ---------- Gambar (sandaran jika kamera langsung gagal) ---------- */
  function decodePhoto(file) {
    setStatus('Membaca gambar...');
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      decodeSource(img, img.naturalWidth, img.naturalHeight).then(function (text) {
        URL.revokeObjectURL(url);
        if (text) onDecoded(text, true);
        else { setStatus('Kod QR tidak dikesan dalam gambar. Cuba ambil gambar lebih dekat dan jelas.', 'err'); showButtons(true, true); }
      }).catch(function (e) {
        URL.revokeObjectURL(url);
        setStatus(e && e.message ? e.message : 'Gagal membaca gambar.', 'err');
        showButtons(true, true);
      });
    };
    img.onerror = function () { URL.revokeObjectURL(url); setStatus('Gambar tidak dapat dibuka.', 'err'); showButtons(true, true); };
    img.src = url;
  }

  function onDecoded(text, fromPhoto) {
    if (!fromPhoto && !scanning) return;
    stopCamera();
    if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} }

    if (!CODE_RE.test(text)) {
      setStatus('Kod QR ini bukan kod kelas atau bilik khas ICT HUB.', 'err');
      showButtons(true, !fromPhoto ? false : true);
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
      var m = document.getElementById(MODAL_ID);
      if (document.hidden) { stopCamera(); return; }
      if (m && m.classList.contains('open') && !scanning) { hideButtons(); startCamera(); }
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
