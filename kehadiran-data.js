/*
 * ICT HUB — Data & logik bersama untuk Kehadiran Kelas (imbasan kod QR).
 * Digunakan oleh kehadiran.html, qr-kelas.html dan qr-scanner.js.
 *
 * Jadual kelas TIDAK disalin ke sini: ia dibaca terus daripada jadual.html
 * (VERSION_DATA + DEFAULT_VERSION_ID), jadi apabila jadual dikemas kini di
 * jadual.html, sistem kehadiran ikut versi yang sama secara automatik.
 *
 * Format kod QR:  ICTHUB:KELAS:4A   atau   ICTHUB:BILIK:Makmal Komputer
 */
(function (global) {
  'use strict';

  // Senarai bilik khas. Salinan yang sama ada dalam tempahan.html dan aktiviti.html (ROOMS) — kekalkan selari.
  var ROOMS = [
    'Dewan Ibnu Khaldun',
    'Makmal Komputer',
    'Bengkel RBT',
    'Bilik Muzik',
    'Bilik Mesyuarat'
  ];

  // Lokasi tambahan untuk imbasan kehadiran sahaja (tidak boleh ditempah di tempahan.html).
  var EXTRA_LOCATIONS = [
    'Padang',
    'Makmal Sains',
    'Surau Istiqomah'
  ];

  // Semua lokasi yang mempunyai kod QR (ICTHUB:BILIK:<nama>).
  var SCAN_ROOMS = ROOMS.concat(EXTRA_LOCATIONS);

  var PREFIX = 'ICTHUB';
  var EARLY_MIN = 15;   // boleh imbas sehingga 15 minit sebelum slot bermula
  var DAY_NAMES = ['AHAD', 'ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT', 'SABTU'];

  function makeCode(type, value) { return PREFIX + ':' + type + ':' + value; }

  function parseCode(text) {
    var m = /^\s*ICTHUB\s*:\s*(KELAS|BILIK)\s*:\s*(.+?)\s*$/i.exec(String(text || ''));
    if (!m) return null;
    var type = m[1].toUpperCase();
    var value = m[2];
    if (type === 'KELAS') value = value.toUpperCase().replace(/\s+/g, '');
    if (type === 'BILIK') {
      var room = SCAN_ROOMS.find(function (r) { return r.toLowerCase() === value.toLowerCase(); });
      if (!room) return null;
      value = room;
    } else if (!/^[1-6][A-Z]$/.test(value)) {
      return null;
    }
    return { type: type, value: value, code: makeCode(type, value) };
  }

  /* ---------- Masa ---------- */
  function mins(t) { var p = String(t).split(':').map(Number); return p[0] * 60 + p[1]; }
  function hhmm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nowInfo(d) {
    d = d || new Date();
    return { date: dateKey(d), day: DAY_NAMES[d.getDay()], mins: d.getHours() * 60 + d.getMinutes(), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
  }

  /* ---------- Jadual (dibaca daripada jadual.html) ---------- */
  var ttPromise = null;
  function loadTimetable() {
    if (ttPromise) return ttPromise;
    ttPromise = fetch('./jadual.html', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (src) {
        var a = src.indexOf('const VERSION_DATA');
        var start = src.indexOf('[', a);
        var end = src.indexOf('\n];', start);
        if (a < 0 || start < 0 || end < 0) throw new Error('Format jadual.html tidak dikenali');
        /* eslint-disable-next-line no-new-func */
        var versions = new Function('return ' + src.slice(start, end + 2))();
        var idMatch = /const\s+DEFAULT_VERSION_ID\s*=\s*["']([^"']+)["']/.exec(src);
        var v = (idMatch && versions.find(function (x) { return x.id === idMatch[1]; })) || versions[versions.length - 1];
        return { versionId: v.id, label: v.label, data: v.data };
      })
      .catch(function (e) { ttPromise = null; throw new Error('Gagal membaca jadual: ' + e.message); });
    return ttPromise;
  }

  // Huruf kecil, buang aksen dan tanda baca ("Mohd." -> "mohd"), satukan ruang.
  function normalizeName(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Perkataan yang tidak membezakan nama (penghubung nama & label akaun seperti "KPM-Guru").
  var NAME_STOP = { bin: 1, binti: 1, bt: 1, bte: 1, anak: 1, ak: 1, a: 1, l: 1, p: 1, kpm: 1, guru: 1, cikgu: 1, cg: 1, ustaz: 1, ustazah: 1 };
  function nameWords(s) {
    return normalizeName(s).split(' ').filter(function (w) { return w && !NAME_STOP[w]; });
  }

  /*
   * Padanan nama akaun ICT HUB dengan nama dalam jadual.
   * 1) Tepat selepas dinormalkan.
   * 2) Semua perkataan penting nama jadual ada dalam nama akaun (atau sebaliknya), sekurang-kurangnya 2 perkataan.
   *    Jika beberapa guru sepadan, pilih yang paling banyak perkataan sepadan.
   * Contoh: "MOHD SABRI BIN MURA KPM-Guru" = "Mohd. Sabri bin Mura".
   */
  function findTeacher(data, name) {
    var target = normalizeName(name);
    if (!target) return null;
    var list = data.teachers;
    var exact = list.find(function (x) { return normalizeName(x.name) === target; });
    if (exact) return exact;
    var mine = nameWords(name);
    var mineSet = {};
    mine.forEach(function (w) { mineSet[w] = 1; });
    var best = null, bestScore = 0;
    list.forEach(function (x) {
      var theirs = nameWords(x.name);
      if (theirs.length < 2 || mine.length < 2) return;
      var theirSet = {};
      theirs.forEach(function (w) { theirSet[w] = 1; });
      var allTheirsInMine = theirs.every(function (w) { return mineSet[w]; });
      var allMineInTheirs = mine.every(function (w) { return theirSet[w]; });
      if (!allTheirsInMine && !allMineInTheirs) return;
      var score = Math.min(theirs.length, mine.length);
      if (score > bestScore) { best = x; bestScore = score; }
    });
    return best;
  }

  // Gabungkan slot berturutan (kelas & subjek sama) menjadi satu blok.
  function mergeBlocks(entries) {
    var sorted = entries.slice().sort(function (a, b) { return mins(a.start) - mins(b.start); });
    var out = [];
    sorted.forEach(function (e) {
      var last = out[out.length - 1];
      var key = (e.class || '') + '|' + (e.subject || '') + '|' + (e.teacher || '');
      if (last && last._key === key && last.end === e.start) { last.end = e.end; return; }
      out.push({ _key: key, day: e.day, start: e.start, end: e.end, subject: e.subject, class: e.class, teacher: e.teacher });
    });
    return out.map(function (b) { delete b._key; return b; });
  }

  function teacherBlocks(teacher, day) {
    if (!teacher) return [];
    return mergeBlocks(teacher.entries.filter(function (e) { return e.day === day; }));
  }

  function classBlocks(data, code, day) {
    var c = data.classes.find(function (x) { return x.code === code; });
    if (!c) return [];
    return mergeBlocks(c.entries.filter(function (e) { return e.day === day; }))
      .map(function (b) { b.class = code; return b; });
  }

  function inWindow(block, nowMins) {
    return nowMins >= mins(block.start) - EARLY_MIN && nowMins < mins(block.end);
  }

  // Status lewat tidak digunakan: imbasan dalam tetingkap slot = HADIR.
  function statusFor() { return { status: 'HADIR', lewatMinit: 0 }; }

  /*
   * Tentukan apa yang patut direkod untuk imbasan ini.
   * opts: { data, teacher (objek jadual atau null), parsed, now (nowInfo), bookings (tempahan bilik guru hari ini) }
   * Pulangan: { matched:boolean, slot:{start,end,subject,class}|null, status, sumber, kelasSekarang }
   */
  function evaluateScan(opts) {
    var now = opts.now, parsed = opts.parsed, teacher = opts.teacher;
    var myBlocks = teacherBlocks(teacher, now.day);

    if (parsed.type === 'KELAS') {
      var mine = myBlocks.find(function (b) { return b.class === parsed.value && inWindow(b, now.mins); });
      if (mine) {
        var s = statusFor(mine.start, now.mins);
        return { matched: true, slot: mine, status: s.status, lewatMinit: s.lewatMinit, sumber: 'JADUAL' };
      }
      // Tiada slot guru — tunjuk siapa sepatutnya berada di kelas ini sekarang (untuk guru ganti).
      var cls = classBlocks(opts.data, parsed.value, now.day).find(function (b) { return inWindow(b, now.mins); }) || null;
      return { matched: false, slot: null, status: 'LUAR_JADUAL', lewatMinit: 0, sumber: 'LUAR_JADUAL', kelasSekarang: cls };
    }

    // BILIK KHAS: utamakan tempahan bilik guru, kemudian slot jadual semasa (mana-mana kelas).
    var bk = (opts.bookings || []).find(function (b) {
      return b.room === parsed.value && now.mins >= mins(b.startTime) - EARLY_MIN && now.mins < mins(b.endTime);
    });
    var cur = myBlocks.find(function (b) { return inWindow(b, now.mins); }) || null;
    if (bk) {
      var s2 = statusFor(bk.startTime, now.mins);
      return {
        matched: true,
        slot: { start: bk.startTime, end: bk.endTime, subject: cur ? cur.subject : (bk.purpose || ''), class: cur ? cur.class : (bk.groupName || '') },
        status: s2.status, lewatMinit: s2.lewatMinit, sumber: 'TEMPAHAN'
      };
    }
    if (cur) {
      var s3 = statusFor(cur.start, now.mins);
      return { matched: true, slot: cur, status: s3.status, lewatMinit: s3.lewatMinit, sumber: 'JADUAL' };
    }
    return { matched: false, slot: null, status: 'LUAR_JADUAL', lewatMinit: 0, sumber: 'LUAR_JADUAL' };
  }

  function codeLabel(parsed, data) {
    if (!parsed) return '';
    if (parsed.type === 'BILIK') return parsed.value;
    var c = data && data.classes.find(function (x) { return x.code === parsed.value; });
    return 'Kelas ' + parsed.value + (c && c.name ? ' ' + c.name : '');
  }

  global.KehadiranData = {
    ROOMS: ROOMS, EXTRA_LOCATIONS: EXTRA_LOCATIONS, SCAN_ROOMS: SCAN_ROOMS, EARLY_MIN: EARLY_MIN,
    makeCode: makeCode, parseCode: parseCode, codeLabel: codeLabel,
    mins: mins, hhmm: hhmm, dateKey: dateKey, nowInfo: nowInfo,
    loadTimetable: loadTimetable, findTeacher: findTeacher, normalizeName: normalizeName,
    teacherBlocks: teacherBlocks, classBlocks: classBlocks, evaluateScan: evaluateScan
  };
})(window);
