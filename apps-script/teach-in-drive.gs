/**
 * ICT HUB — Simpan Rekod Teach-In ke Google Drive (dipanggil oleh ganti.html → butang "Simpan Rekod").
 *
 * Struktur fail dalam Drive:
 *   TEACH IN / MINGGU 37 / 15.10.2026 KHAMIS.pdf
 * Fail dengan nama sama dalam folder minggu itu akan diganti (fail lama ke Trash).
 *
 * CARA PASANG (sekali sahaja, guna akaun Google yang memiliki folder TEACH IN):
 *  1. https://script.google.com → New project → tampal kod ini (ganti semua kod asal) → Save.
 *  2. (Pilihan) Jika folder "TEACH IN" sudah ada, salin ID folder dari URL Drive ke ROOT_FOLDER_ID.
 *     Jika dibiarkan kosong, folder "TEACH IN" dicari/dicipta di My Drive akaun ini.
 *  3. Deploy → New deployment → Select type: Web app
 *       Execute as: Me      Who has access: Anyone
 *     → Deploy → benarkan akses (Authorize) → salin "Web app URL" (berakhir dengan /exec).
 *  4. Masukkan URL itu ke TEACHIN_DRIVE_URL dalam ganti.html.
 *
 * Keselamatan: setiap permintaan mesti membawa Firebase ID token guru yang log masuk di ICT HUB.
 * Token disahkan dengan membaca dokumen teachers/<email> melalui Firestore REST menggunakan token itu
 * (Firestore menolak token palsu/tamat tempoh), dan guru mesti active == true.
 */

const PROJECT_ID = 'skamis-hubtool';
const ROOT_FOLDER_ID = '';            // pilihan: ID folder "TEACH IN" sedia ada
const ROOT_FOLDER_NAME = 'TEACH IN';
const MAX_BYTES = 10 * 1024 * 1024;   // 10 MB

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verifyTeacher_(req.idToken);

    const fileName = clean_(req.fileName);
    if (!/\.pdf$/i.test(fileName)) throw new Error('Nama fail tidak sah.');
    const weekFolder = clean_(req.week) || 'LUAR MINGGU PERSEKOLAHAN';
    const bytes = Utilities.base64Decode(String(req.pdfBase64 || ''));
    if (!bytes.length) throw new Error('Fail PDF kosong.');
    if (bytes.length > MAX_BYTES) throw new Error('Fail PDF terlalu besar.');

    const folder = childFolder_(rootFolder_(), weekFolder);
    const old = folder.getFilesByName(fileName);
    while (old.hasNext()) old.next().setTrashed(true);

    const file = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', fileName));
    file.setDescription('Rekod teach-in disimpan oleh ' + user.email + ' melalui ICT HUB (Guru Ganti).');

    return json_({ ok: true, name: fileName, week: weekFolder, url: file.getUrl(), folderUrl: folder.getUrl() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'ICT HUB Teach-In Drive' });
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
  const doc = JSON.parse(res.getContentText());
  const active = doc.fields && doc.fields.active && doc.fields.active.booleanValue === true;
  if (!active) throw new Error('Akaun ini bukan guru aktif.');
  return { email: email };
}

function rootFolder_() {
  // Terima ID atau pautan penuh folder Drive (…/folders/<ID>?usp=sharing).
  const id = String(ROOT_FOLDER_ID || '').replace(/^.*\/folders\//, '').replace(/[?#].*$/, '').trim();
  if (id) return DriveApp.getFolderById(id);
  const it = DriveApp.getRootFolder().getFoldersByName(ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(ROOT_FOLDER_NAME);
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean_(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
