# ICT HUB (skagamamiri/tools)

Hub Tool ICT for SK Agama (MIS) Miri, hosted on GitHub Pages at
https://skagamamiri.github.io/tools/. Backend is Firebase (project `skamis-hubtool`):
Google sign-in, with Firestore `teachers` collection as the whitelist.

The same repo is also served from Cloudflare Pages (an alternate address for users whose
ISP cannot resolve github.io). Keep code host-agnostic: use relative URLs, never hard-code
`/tools/` or `skagamamiri.github.io` (`sw.js` derives its base path from its scope; tool URLs
stored in Firestore as github.io are rewritten by `localiseToolUrl()` in index.html and in tool.html).

## Conventions for tool pages

- Every tool is its own full page with its own URL (no iframes). `index.html` opens
  tools via `openToolPage()`: same-origin URL tools navigate directly, HTML-code tools
  from the admin panel open at `tool.html?id=<toolId>`, external URLs open in a new tab.
- **Every tool page uses the shared header** `ict-header.js`:
  `<script src="ict-header.js"></script>` in `<head>`, then
  `<ict-header icon="fa-solid ..." title="..." subtitle="..."></ict-header>` at the top of `<body>`.
  Start new tools from `_template-tool.html`.
- The header has **no logout button** and no login button. Put login UI in the page body.
  Set the user shown in the header with `ICTHeader.setUser(name, role)` (or the
  `#userName` / `#userRole` elements it renders); `ICTHeader.clearUser()` on sign-out.
- UI text is in Bahasa Melayu.

## Data

- `aktiviti` — school activities (aktiviti.html; shown on the index calendar). Public read.
- `roomBookings` — special-room bookings (tempahan.html). Activities with a room create
  linked bookings (`aktivitiId`, `sumber: "aktiviti"`). Read requires an active teacher.
- `kehadiranKelas` — teacher class attendance from QR scans (kehadiran.html). Doc id
  `<date>_<email-key>_<slotStart HHMM>`; create-only for the teacher; admin + pentadbir read all (report). Rules block is live in the Console.
  Required rules are in `firestore-rules-kehadiran.txt`.
- Room list is duplicated in `tempahan.html`, `aktiviti.html` and `kehadiran-data.js` (`ROOMS`); keep in sync.
  `kehadiran-data.js` also has `EXTRA_LOCATIONS` (Padang, Makmal Sains, Surau Istiqomah) — scan-only, not bookable.

## Kehadiran Kelas (QR)

- QR text format: `ICTHUB:KELAS:<code e.g. 4A>` or `ICTHUB:BILIK:<room/location name>` (any of `SCAN_ROOMS`).
  A room/location scan is recorded against the teacher's current timetable slot (`kelasJadual`), so that
  class's cell in Paparan Kelas turns blue too. Print them from `qr-kelas.html` (4 per A4 portrait page, 2 x 2).
- `qr-scanner.js` adds the mobile-only "Imbas QR" button to the index profile card and sends valid codes to
  `kehadiran.html?kod=...`. It drives the camera itself (getUserMedia + `<video playsinline muted>`, needed for iPhone)
  and decodes with BarcodeDetector or jsQR (jsdelivr, lazy). html5-qrcode is no longer used (failed on iPhone).
  If the live camera fails it offers "Ambil Gambar QR" (`<input capture=environment>`).
- The timetable is NOT duplicated: `kehadiran-data.js` fetches `jadual.html` and reads `VERSION_DATA` /
  `DEFAULT_VERSION_ID`. Keep that `const VERSION_DATA = [ ... \n];` block shape intact when updating jadual.html.
- kehadiran.html: scans that match the timetable/booking are saved automatically (no confirm tap); out-of-timetable
  scans (LUAR_JADUAL) still need a note + manual tap. Plus "Paparan Kelas" for admin/pentadbir — one class per view (dropdown), weekly
  landscape grid (days × 30-min columns); cell blue = scanned, red = started but not scanned, grey = not started.
  No late (LEWAT) status is used. "Cetak Kelas Ini" / "Cetak Semua Kelas" print A4 landscape, one class per page.
- "Paparan Guru" (admin/pentadbir, below Paparan Kelas, same week): teacher dropdown, weekly grid of that teacher's slots
  (blue/red/grey), stats boxes. 1 masa = 30 min. "Cetak Rumusan Mingguan" prints A4 portrait table of all teachers:
  jumlah masa seminggu, masa diimbas (records with namaJadual = teacher, not LUAR_JADUAL), peratus, luar jadual count.
  All print buttons render into #printAll via printOnly().
- Firestore security rules are edited by the owner in the Firebase Console, not from here.

## Guru Ganti (ganti.html)

- Relief-teacher generator. Reads the timetable via `KehadiranData.loadTimetable()` (kehadiran-data.js) — no copy of the jadual.
- Inputs: date, absent teachers (full day or a time range), optional programs (time range + classes; those class slots need no relief),
  settings (load cap <4/≤5/≤6/≤7 masa — `cap` value 3/5/6/7, admins 0/1/2 masa, avoid 4+ consecutive masa). 1 masa = 30-min slot.
- Cap rule: a teacher may take another relief slot while their day total (timetable + relief already given) is ≤ cap.
- Max relief per ordinary teacher per day (`maxRelief`, default 2).
- Flexible teachers (Guru Pemulihan + Guru Bimbingan & Kaunseling, default list `DEFAULT_FLEX`, kept in localStorage `ganti_fleksibel`):
  picked first, exempt from the load cap and the consecutive rule, own daily max (`flexMax`, default 6).
- `EXTRA_TEACHERS` adds teachers with no timetable entries (Ku Muhammad Nadjri bin Ku Nasir, Guru B&K).
- Co-taught class slot ("A / B" in the class timetable): if the partner is present, no relief — shown as KOLABORASI with the partner's name.
- Program option per program: teachers of the program's classes either stay with the program (default) or are released (`free`) —
  released teachers are not busy in those slots and can be given relief.
- Optional Google sign-in on the page (Firebase, same pattern as kehadiran.html). Signed-in active teachers load `gantiSekatan`
  (admin-set "teacher may not be given teach-in": teacher, `day` SEMUA/ISNIN…/"" or `date` YYYY-MM-DD, from, to, reason) and
  the generator skips those slots. Only role `admin` sees the "Sekatan teach-in" card (add/delete). Rules block (`firestore-rules-ganti.txt`) is live in the Console.
- Admin (pentadbir) list is ticked in the page and kept in localStorage (`ganti_pentadbir`); settings in `ganti_tetapan`. Nothing is saved to Firestore.
- Output: "Teach-In" slips in the school's form layout (one per absent teacher: Nama/Tarikh/Hari/Sebab + Nama Guru/Masa/Kelas-MP,
  no blank padding rows; "Disediakan oleh" (preparer, required, remembered in localStorage `ganti_disediakan`) printed after the last slip;
  printed A4 portrait, 3 per page), plus a one-page grid of all teachers (A4 landscape), editable relief list, WhatsApp text copy.
- "Simpan Rekod": builds a vector PDF of the slips (jsPDF + autotable from cdnjs, loaded on click) and POSTs it (text/plain JSON:
  idToken, week, fileName, pdfBase64) to the Apps Script web app `apps-script/teach-in-drive.gs` (URL in `TEACHIN_DRIVE_URL`).
  The script verifies the Firebase ID token by reading teachers/<email> via Firestore REST, then saves to Drive
  `TEACH IN / MINGGU NN / DD.MM.YYYY HARI.pdf` (same name is replaced). Requires sign-in on the page.
  The working deployment is owned by the school's DELIMa admin account (Oct 2026). An earlier deployment from
  sekolah-8965-cm1@moe-dl.edu.my was blocked for outside callers even with "Who has access: Anyone" (fetch failed with a
  CORS error, browser showed "You need access"). If redeploying, check the /exec URL answers a plain GET with
  {"ok":true,...} from the ganti.html origin.
- "Simpan Rekod" also writes the day's structured record to Firestore `gantiRekod/<YYYY-MM-DD>` (date, day, week, preparedBy,
  absents[], items[{start,end,class,subject,absent[],relief,kind ganti|program|kolab|tiada,note}], savedBy, savedAt); re-saving overwrites.
- Tabs: "Jana Teach-In" (generator, `.jana-only`) and "Rekod Mingguan" (`.minggu-only`, body class `tab-minggu`, remembered in
  localStorage `ganti_tab`). Rekod Mingguan: pick a school week, loads gantiRekod for Mon–Fri, grid of all teachers × 5 days
  (relief count + classes, absence reason, grey = day not saved) + weekly total; sort by name/total; prints A4 landscape.
  Rules block for gantiRekod is in `firestore-rules-ganti.txt` (must be added in the Console).
- School week comes from erph.html (`const WEEKS=[...].map` and `CUTI`), fetched and parsed — keep that shape intact.

## e-Kokurikulum (ekokurikulum.html)

- Three forms + records: Daftar Hadir (perjumpaan ke-, tarikh, masa mula/tamat, jenis unit, unit, tick students present),
  Laporan Aktiviti (Daftar Laporan Mingguan: tajuk, aktiviti, laporan murid photo, Sivik, PikeBM, rumusan, guru pembimbing,
  gambar 1–4 + ulasan, kemahiran berfikir + kata kerja KBAT filtered by level, signatures disediakan/disemak), Pencapaian,
  and Rekod (list/print/delete; print attendance slip, laporan A4 with photos, unit attendance summary grid, pencapaian list).
- Backend: Apps Script `apps-script/ekokurikulum.gs` (URL in `EKOKU_URL`) on the e-Kokurikulum Google Sheet
  (ID in `SHEET_ID`). Same Firebase ID-token check as teach-in-drive.gs; POST text/plain JSON `{action, idToken, ...}`.
  Tabs: MURID (student list — wide format NAMA|KELAS|KELAB/PERSATUAN|BADAN BERUNIFORM|SUKAN/PERMAINAN|RUMAH SUKAN, or long
  format NAMA|KELAS|JENIS UNIT|UNIT; headers detected by keyword), UNIT (JENIS UNIT|UNIT options), KEHADIRAN, LAPORAN, PENCAPAIAN.
  Photos go to Drive `E-KOKURIKULUM/<UNIT>/` (file IDs in the sheet; page reads them back via action `images`).
  Signatures are small PNG data URLs stored in the cell. Same unit + perjumpaan → asks to replace.
- Guru pembimbing list comes from the timetable via `KehadiranData.loadTimetable()`. Laporan text draft kept in localStorage `ekoku_draf_laporan`.
- Sivik / PikeBM / KBAT lists are constants at the top of the module script.
