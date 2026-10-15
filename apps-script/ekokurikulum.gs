/**
 * ICT HUB — Sistem e-Kokurikulum (backend untuk ekokurikulum.html)
 *
 * Data disimpan dalam Google Sheet e-Kokurikulum:
 *   MURID       senarai murid & unit (lihat "FORMAT TAB MURID" di bawah)
 *   UNIT        JENIS UNIT | UNIT   (senarai pilihan unit; dicipta & diisi oleh setup())
 *   KEHADIRAN   rekod Daftar Hadir (satu baris = satu perjumpaan satu unit)
 *   LAPORAN     rekod Laporan Aktiviti Mingguan
 *   PENCAPAIAN  rekod Pencapaian murid
 * Gambar disimpan dalam Drive: E-KOKURIKULUM / <UNIT> / ...
 *
 * FORMAT TAB MURID (pilih satu, skrip mengesan sendiri melalui tajuk lajur di baris 1):
 *   A) Satu baris seorang murid (format biasa KPM):
 *      NAMA | KELAS | KELAB/PERSATUAN | BADAN BERUNIFORM | SUKAN/PERMAINAN | RUMAH SUKAN
 *   B) Satu baris satu keahlian:
 *      NAMA | KELAS | JENIS UNIT | UNIT
 *   Tajuk lajur tidak perlu tepat — kata kunci NAMA, KELAS, KELAB/PERSATUAN, BERUNIFORM,
 *   SUKAN/PERMAINAN, RUMAH, JENIS, UNIT sudah memadai.
 *
 * CARA PASANG (sekali sahaja, guna akaun yang memiliki Sheet e-Kokurikulum):
 *  1. Buka Sheet → Extensions → Apps Script → tampal kod ini (ganti semua) → Save.
 *  2. Pilih fungsi setup → Run → benarkan akses. Tab UNIT/KEHADIRAN/LAPORAN/PENCAPAIAN dicipta
 *     (tab MURID dicipta kosong jika belum ada — isi senarai murid di situ).
 *  3. Deploy → New deployment → Web app
 *       Execute as: Me      Who has access: Anyone
 *     → Deploy → salin "Web app URL" (/exec) → masukkan ke EKOKU_URL dalam ekokurikulum.html.
 *  4. Uji: buka URL /exec dalam pelayar — mesti keluar {"ok":true,...}.
 *
 * Keselamatan: setiap permintaan POST mesti membawa Firebase ID token guru ICT HUB (sama seperti
 * teach-in-drive.gs). Token disahkan dengan membaca teachers/<email> melalui Firestore REST.
 */

const SHEET_ID = '1S8OosOi6sv4ihSWumL6cEJ5e8LIBRaeNMoqJeOF-6zU';
const PROJECT_ID = 'skamis-hubtool';
const DRIVE_FOLDER_ID = '';                 // pilihan: ID folder Drive sedia ada untuk gambar
const DRIVE_FOLDER_NAME = 'E-KOKURIKULUM';
const MAX_IMG_BYTES = 4 * 1024 * 1024;

const JENIS = ['KELAB & PERSATUAN', 'BADAN BERUNIFORM', 'SUKAN & PERMAINAN', 'RUMAH SUKAN'];
const DEFAULT_UNITS = {
  'KELAB & PERSATUAN': ['BAHASA INGGERIS', 'NILAM & TVPSS', 'STEM', 'ALAM SEKITAR', 'RUKUN NEGARA', 'BAHASA MELAYU', 'BAHASA ARAB'],
  'BADAN BERUNIFORM': ['PENGAKAP', 'TUNAS KADET REMAJA SEKOLAH', 'BULAN SABIT MERAH', 'PUTERI ISLAM'],
  'SUKAN & PERMAINAN': ['BOLA SEPAK/FUTSAL', 'BOLA BALING', 'BOLA JARING', 'CATUR', 'BADMINTON'],
  'RUMAH SUKAN': ['MERAH', 'BIRU', 'KUNING', 'HIJAU']
};

const HEAD = {
  KEHADIRAN: ['ID', 'DIREKOD', 'EMAIL', 'NAMA GURU', 'JENIS UNIT', 'UNIT', 'PERJUMPAAN', 'TARIKH', 'MASA MULA', 'MASA TAMAT',
    'JUMLAH MURID', 'BIL HADIR', 'BIL TIDAK HADIR', 'MURID HADIR', 'MURID TIDAK HADIR', 'CATATAN'],
  LAPORAN: ['ID', 'DIREKOD', 'EMAIL', 'NAMA GURU', 'JENIS UNIT', 'UNIT', 'PERJUMPAAN', 'TARIKH', 'TAJUK', 'AKTIVITI',
    'SIVIK', 'PIKEBM', 'RUMUSAN', 'GURU PEMBIMBING', 'KEMAHIRAN BERFIKIR', 'KATA KERJA KBAT',
    'ULASAN 1', 'ULASAN 2', 'ULASAN 3', 'ULASAN 4',
    'LAPORAN MURID', 'GAMBAR 1', 'GAMBAR 2', 'GAMBAR 3', 'GAMBAR 4',
    'NAMA DISEDIAKAN', 'TT DISEDIAKAN', 'NAMA DISEMAK', 'TT DISEMAK'],
  PENCAPAIAN: ['ID', 'DIREKOD', 'EMAIL', 'NAMA GURU', 'JENIS UNIT', 'UNIT', 'TARIKH', 'PERTANDINGAN', 'PERINGKAT',
    'PENCAPAIAN', 'KATEGORI', 'PENYERTAAN', 'MURID', 'TEMPAT', 'PENGANJUR', 'GURU PENGIRING', 'CATATAN', 'GAMBAR']
};
const IMG_FIELDS = ['LAPORAN MURID', 'GAMBAR 1', 'GAMBAR 2', 'GAMBAR 3', 'GAMBAR 4'];

/* ============================== ENTRY ============================== */

function doGet() {
  return json_({ ok: true, service: 'ICT HUB e-Kokurikulum' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verifyTeacher_(req.idToken);
    const a = String(req.action || '');
    if (a === 'init') return json_(Object.assign({ ok: true, user: user }, init_()));
    if (a === 'list') return json_({ ok: true, rows: list_(req.type, req.unit) });
    if (a === 'saveHadir') return json_(withLock_(() => saveHadir_(req.data || {}, user, !!req.overwrite)));
    if (a === 'saveLaporan') return json_(withLock_(() => saveLaporan_(req.data || {}, user, !!req.overwrite)));
    if (a === 'savePencapaian') return json_(withLock_(() => savePencapaian_(req.data || {}, user)));
    if (a === 'images') return json_({ ok: true, images: images_(req.ids || []) });
    if (a === 'delete') return json_(withLock_(() => delete_(req.type, req.id, user)));
    throw new Error('Tindakan tidak dikenali.');
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ============================== SETUP ============================== */

function setup() {
  const ss = ss_();
  Object.keys(HEAD).forEach(n => sheet_(n));
  const u = ss.getSheetByName('UNIT') || ss.insertSheet('UNIT');
  if (u.getLastRow() < 2) {
    const rows = [['JENIS UNIT', 'UNIT']];
    JENIS.forEach(j => DEFAULT_UNITS[j].forEach(x => rows.push([j, x])));
    u.clear();
    u.getRange(1, 1, rows.length, 2).setValues(rows);
    u.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#d9f2e6');
    u.setFrozenRows(1);
  }
  if (!findMuridSheet_()) {
    const m = ss.insertSheet('MURID');
    m.getRange(1, 1, 1, 6).setValues([['NAMA', 'KELAS', 'KELAB/PERSATUAN', 'BADAN BERUNIFORM', 'SUKAN/PERMAINAN', 'RUMAH SUKAN']])
      .setFontWeight('bold').setBackground('#d9f2e6');
    m.setFrozenRows(1);
  }
  rootFolder_();
}

/* ============================== READ ============================== */

function init_() {
  return { units: units_(), murid: murid_() };
}

function units_() {
  const sh = ss_().getSheetByName('UNIT');
  const out = {};
  JENIS.forEach(j => out[j] = []);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(r => {
      const j = normJenis_(r[0]); const u = up_(r[1]);
      if (!j || !u) return;
      if (!out[j]) out[j] = [];
      if (out[j].indexOf(u) < 0) out[j].push(u);
    });
  } else {
    JENIS.forEach(j => out[j] = DEFAULT_UNITS[j].slice());
  }
  return out;
}

function findMuridSheet_() {
  const ss = ss_();
  const named = ss.getSheetByName('MURID');
  if (named) return named;
  // Cari tab lain yang ada lajur NAMA + KELAS (contoh: Sheet1 sedia ada).
  const skip = ['UNIT', 'KEHADIRAN', 'LAPORAN', 'PENCAPAIAN'];
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    if (skip.indexOf(s.getName().toUpperCase()) >= 0 || s.getLastRow() < 1) continue;
    const h = headerRow_(s);
    if (h.row >= 0) return s;
  }
  return null;
}

// Cari baris tajuk dalam 10 baris pertama (ada NAMA dan sekurang-kurangnya satu lajur unit/kelas).
function headerRow_(sh) {
  const n = Math.min(10, sh.getLastRow());
  const w = sh.getLastColumn();
  if (!n || !w) return { row: -1 };
  const vals = sh.getRange(1, 1, n, w).getDisplayValues();
  for (let r = 0; r < vals.length; r++) {
    const hs = vals[r].map(up_);
    if (hs.some(h => /NAMA/.test(h)) && hs.some(h => /KELAS|UNIT|KELAB|BERUNIFORM|SUKAN|RUMAH/.test(h))) {
      return { row: r, heads: hs };
    }
  }
  return { row: -1 };
}

function murid_() {
  const sh = findMuridSheet_();
  if (!sh || sh.getLastRow() < 2) return [];
  const h = headerRow_(sh);
  if (h.row < 0) return [];
  const H = h.heads;
  const idx = re => H.findIndex(x => re.test(x));
  const iNama = idx(/NAMA/);
  const iKelas = idx(/KELAS/);
  const iJenis = idx(/JENIS/);
  const iUnit = H.findIndex(x => /^UNIT\b|^NAMA UNIT/.test(x));
  const cols = {
    'KELAB & PERSATUAN': idx(/KELAB|PERSATUAN/),
    'BADAN BERUNIFORM': idx(/BERUNIFORM|UNIFORM/),
    'SUKAN & PERMAINAN': H.findIndex(x => /SUKAN|PERMAINAN/.test(x) && !/RUMAH/.test(x)),
    'RUMAH SUKAN': idx(/RUMAH/)
  };
  const data = sh.getRange(h.row + 2, 1, sh.getLastRow() - h.row - 1, sh.getLastColumn()).getDisplayValues();
  const map = {};
  const out = [];
  data.forEach(r => {
    const nama = up_(r[iNama]);
    if (!nama) return;
    const kelas = iKelas >= 0 ? up_(r[iKelas]) : '';
    const key = nama + '|' + kelas;
    let m = map[key];
    if (!m) { m = map[key] = { nama: nama, kelas: kelas, unit: {} }; out.push(m); }
    if (iJenis >= 0 && iUnit >= 0) {
      const j = normJenis_(r[iJenis]); const u = up_(r[iUnit]);
      if (j && u) m.unit[j] = u;
    } else {
      Object.keys(cols).forEach(j => { if (cols[j] >= 0 && up_(r[cols[j]])) m.unit[j] = up_(r[cols[j]]); });
    }
  });
  return out;
}

function list_(type, unit) {
  type = up_(type);
  if (!HEAD[type]) throw new Error('Jenis rekod tidak sah.');
  const sh = sheet_(type);
  if (sh.getLastRow() < 2) return [];
  const heads = HEAD[type];
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length).getDisplayValues();
  unit = up_(unit);
  return vals
    .map(r => { const o = {}; heads.forEach((k, i) => o[k] = r[i]); return o; })
    .filter(o => o.ID && (!unit || o.UNIT === unit))
    .reverse();
}

function images_(ids) {
  const out = {};
  ids.slice(0, 8).forEach(id => {
    id = String(id || '').trim();
    if (!/^[\w-]{10,}$/.test(id)) return;
    try {
      const blob = DriveApp.getFileById(id).getBlob();
      out[id] = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (e) { out[id] = ''; }
  });
  return out;
}

/* ============================== WRITE ============================== */

function saveHadir_(d, user, overwrite) {
  const unit = up_(need_(d.unit, 'Unit'));
  const jenis = need_(normJenis_(d.jenis), 'Jenis unit');
  const per = need_(String(parseInt(d.perjumpaan, 10) || ''), 'Perjumpaan');
  const tarikh = need_(d.tarikh, 'Tarikh');
  const hadir = Array.isArray(d.hadir) ? d.hadir : [];
  const tidak = Array.isArray(d.tidakHadir) ? d.tidakHadir : [];
  const sh = sheet_('KEHADIRAN');
  const ex = findRow_(sh, 'KEHADIRAN', r => r.UNIT === unit && String(r.PERJUMPAAN) === per);
  if (ex && !overwrite) return { ok: false, exists: true, error: 'Perjumpaan ke-' + per + ' untuk ' + unit + ' sudah direkod.' };
  const row = {
    ID: ex ? ex.ID : newId_('H'), DIREKOD: now_(), EMAIL: user.email, 'NAMA GURU': clip_(d.namaGuru || user.name, 120),
    'JENIS UNIT': jenis, UNIT: unit, PERJUMPAAN: per, TARIKH: tarikh,
    'MASA MULA': clip_(d.masaMula, 5), 'MASA TAMAT': clip_(d.masaTamat, 5),
    'JUMLAH MURID': hadir.length + tidak.length, 'BIL HADIR': hadir.length, 'BIL TIDAK HADIR': tidak.length,
    'MURID HADIR': hadir.map(s => clip_(s, 120)).join('\n'), 'MURID TIDAK HADIR': tidak.map(s => clip_(s, 120)).join('\n'),
    CATATAN: clip_(d.catatan, 500)
  };
  writeRow_(sh, 'KEHADIRAN', row, ex && ex._row);
  return { ok: true, id: row.ID, replaced: !!ex };
}

function saveLaporan_(d, user, overwrite) {
  const unit = up_(need_(d.unit, 'Unit'));
  const jenis = need_(normJenis_(d.jenis), 'Jenis unit');
  const per = need_(String(parseInt(d.perjumpaan, 10) || ''), 'Perjumpaan');
  ['tarikh', 'tajuk', 'aktiviti', 'sivik', 'pikebm', 'rumusan', 'kb', 'kbat', 'ulasan1'].forEach(k => need_(d[k], k.toUpperCase()));
  const sh = sheet_('LAPORAN');
  const ex = findRow_(sh, 'LAPORAN', r => r.UNIT === unit && String(r.PERJUMPAAN) === per);
  if (ex && !overwrite) return { ok: false, exists: true, error: 'Laporan perjumpaan ke-' + per + ' untuk ' + unit + ' sudah ada.' };

  const imgs = d.images || {};
  const keep = d.keepImages || {};         // id gambar lama yang dikekalkan semasa ganti
  const folder = childFolder_(rootFolder_(), clean_(unit));
  const imgIds = {};
  IMG_FIELDS.forEach((f, i) => {
    const key = ['laporanMurid', 'g1', 'g2', 'g3', 'g4'][i];
    if (imgs[key]) imgIds[f] = saveImage_(folder, imgs[key], clean_('P' + per + ' ' + d.tarikh + ' ' + f));
    else if (ex && keep[key]) imgIds[f] = ex[f] || '';
    else imgIds[f] = '';
  });
  if (!imgIds['GAMBAR 1']) throw new Error('Gambar 1 wajib.');
  if (!imgIds['GAMBAR 2']) throw new Error('Gambar 2 wajib.');

  const row = Object.assign({
    ID: ex ? ex.ID : newId_('L'), DIREKOD: now_(), EMAIL: user.email, 'NAMA GURU': clip_(d.namaGuru || user.name, 120),
    'JENIS UNIT': jenis, UNIT: unit, PERJUMPAAN: per, TARIKH: clip_(d.tarikh, 10),
    TAJUK: clip_(d.tajuk, 200), AKTIVITI: clip_(d.aktiviti, 3000), SIVIK: clip_(d.sivik, 80), PIKEBM: clip_(d.pikebm, 80),
    RUMUSAN: clip_(d.rumusan, 3000), 'GURU PEMBIMBING': (d.guru || []).map(s => clip_(s, 120)).join('\n'),
    'KEMAHIRAN BERFIKIR': clip_(d.kb, 60), 'KATA KERJA KBAT': clip_(d.kbat, 60),
    'ULASAN 1': clip_(d.ulasan1, 1500), 'ULASAN 2': clip_(d.ulasan2, 1500), 'ULASAN 3': clip_(d.ulasan3, 1500), 'ULASAN 4': clip_(d.ulasan4, 1500),
    'NAMA DISEDIAKAN': clip_(d.namaDisediakan, 120), 'TT DISEDIAKAN': sig_(d.ttDisediakan),
    'NAMA DISEMAK': clip_(d.namaDisemak, 120), 'TT DISEMAK': sig_(d.ttDisemak)
  }, imgIds);
  writeRow_(sh, 'LAPORAN', row, ex && ex._row);
  return { ok: true, id: row.ID, replaced: !!ex };
}

function savePencapaian_(d, user) {
  const unit = up_(need_(d.unit, 'Unit'));
  const jenis = need_(normJenis_(d.jenis), 'Jenis unit');
  need_(d.pertandingan, 'Nama pertandingan'); need_(d.peringkat, 'Peringkat'); need_(d.pencapaian, 'Pencapaian'); need_(d.tarikh, 'Tarikh');
  const murid = (d.murid || []).map(s => clip_(s, 120)).filter(Boolean);
  if (!murid.length) throw new Error('Pilih sekurang-kurangnya seorang murid.');
  const sh = sheet_('PENCAPAIAN');
  let img = '';
  if (d.gambar) img = saveImage_(childFolder_(childFolder_(rootFolder_(), 'PENCAPAIAN'), clean_(unit)), d.gambar, clean_(d.tarikh + ' ' + d.pertandingan));
  const row = {
    ID: newId_('P'), DIREKOD: now_(), EMAIL: user.email, 'NAMA GURU': clip_(d.namaGuru || user.name, 120),
    'JENIS UNIT': jenis, UNIT: unit, TARIKH: clip_(d.tarikh, 10), PERTANDINGAN: clip_(d.pertandingan, 200),
    PERINGKAT: clip_(d.peringkat, 40), PENCAPAIAN: clip_(d.pencapaian, 60), KATEGORI: clip_(d.kategori, 80),
    PENYERTAAN: clip_(d.penyertaan, 20), MURID: murid.join('\n'), TEMPAT: clip_(d.tempat, 150), PENGANJUR: clip_(d.penganjur, 150),
    'GURU PENGIRING': (d.guru || []).map(s => clip_(s, 120)).join('\n'), CATATAN: clip_(d.catatan, 500), GAMBAR: img
  };
  writeRow_(sh, 'PENCAPAIAN', row);
  return { ok: true, id: row.ID };
}

function delete_(type, id, user) {
  type = up_(type);
  if (!HEAD[type]) throw new Error('Jenis rekod tidak sah.');
  const sh = sheet_(type);
  const ex = findRow_(sh, type, r => r.ID === String(id));
  if (!ex) throw new Error('Rekod tidak dijumpai.');
  if (ex.EMAIL !== user.email && user.role !== 'admin') throw new Error('Hanya pemilik rekod atau Admin boleh memadam.');
  sh.deleteRow(ex._row);
  return { ok: true };
}

/* ============================== HELPERS ============================== */

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function sheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight('bold').setBackground('#d9f2e6');
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, type, pred) {
  if (sh.getLastRow() < 2) return null;
  const heads = HEAD[type];
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, heads.length).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    const o = {}; heads.forEach((k, j) => o[k] = vals[i][j]);
    if (pred(o)) { o._row = i + 2; return o; }
  }
  return null;
}

function writeRow_(sh, type, obj, rowNo) {
  const arr = HEAD[type].map(k => String(obj[k] == null ? '' : obj[k]));
  const r = rowNo || sh.getLastRow() + 1;
  // Format teks supaya Sheets tidak menukar tarikh/perjumpaan.
  sh.getRange(r, 1, 1, arr.length).setNumberFormat('@').setValues([arr]);
}

function saveImage_(folder, dataUrl, name) {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Format gambar tidak sah.');
  const bytes = Utilities.base64Decode(m[3]);
  if (bytes.length > MAX_IMG_BYTES) throw new Error('Gambar terlalu besar.');
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const file = folder.createFile(Utilities.newBlob(bytes, m[1], name + '.' + ext));
  return file.getId();
}

function sig_(dataUrl) {
  const s = String(dataUrl || '');
  if (!s) return '';
  if (!/^data:image\/png;base64,/.test(s) || s.length > 45000) throw new Error('Tandatangan tidak sah atau terlalu besar.');
  return s;
}

function rootFolder_() {
  const id = String(DRIVE_FOLDER_ID || '').replace(/^.*\/folders\//, '').replace(/[?#].*$/, '').trim();
  if (id) return DriveApp.getFolderById(id);
  const it = DriveApp.getRootFolder().getFoldersByName(DRIVE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(DRIVE_FOLDER_NAME);
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function verifyTeacher_(idToken) {
  if (!idToken) throw new Error('Sila log masuk dengan akaun DELIMa dahulu.');
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('Token log masuk tidak sah.');
  let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (p.length % 4) p += '=';
  const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(p)).getDataAsString());
  const email = String(payload.email || '').toLowerCase().trim();
  if (!email) throw new Error('Token tiada email.');
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
    '/databases/(default)/documents/teachers/' + encodeURIComponent(email);
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Akaun tidak disahkan sebagai guru ICT HUB (sila log masuk semula).');
  const f = (JSON.parse(res.getContentText()).fields) || {};
  if (!(f.active && f.active.booleanValue === true)) throw new Error('Akaun ini bukan guru aktif.');
  return {
    email: email,
    name: (f.displayName && f.displayName.stringValue) || payload.name || email,
    role: (f.role && f.role.stringValue) || 'guru'
  };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function normJenis_(s) {
  const x = up_(s);
  if (!x) return '';
  if (/KELAB|PERSATUAN/.test(x)) return 'KELAB & PERSATUAN';
  if (/UNIFORM/.test(x)) return 'BADAN BERUNIFORM';
  if (/RUMAH/.test(x)) return 'RUMAH SUKAN';
  if (/SUKAN|PERMAINAN/.test(x)) return 'SUKAN & PERMAINAN';
  return x;
}

function need_(v, label) {
  const s = String(v == null ? '' : v).trim();
  if (!s) throw new Error(label + ' wajib diisi.');
  return s;
}
function up_(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase(); }
function clip_(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }
function clean_(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120); }
function now_() { return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss'); }
function newId_(p) { return p + Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyMMddHHmmss') + Math.floor(Math.random() * 900 + 100); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
