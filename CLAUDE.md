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
- Inputs: date, absent teachers (full day or one or more time ranges — `from/to` + `extra[{from,to}]`, helpers `rangesOf`/`rangeTxt`; saved in records too), optional programs (time range + classes; those class slots need no relief),
  settings (tiered max relief per day by the teacher's own timetable load that day — `tier2` ≤2 masa (default 1), `tier3` 3 masa (1), `tier4` 4 masa (1; old saved settings without tier2/3 copy tier4), `tier5` (1), `tier6` (0), `tier7` 7+ (0); admins 0/1/2 masa, avoid 3+ consecutive masa `noConsec`, avoid relief directly before/after the teacher's own class `noAdjacent`, avoid back-to-back relief slots for the same teacher `noReliefRun` (default on, applies to flex teachers too) — break separates; flex teachers exempt from `noConsec`/`noAdjacent` only). 1 masa = 30-min slot.
- Jana runs `attempt()` ATTEMPTS (40) times with random tie-breaks (`st.rnd` per teacher, `n.rk` per need) and keeps the best:
  most slots filled, then lowest max relief per ordinary teacher, then lowest priority-rank sum
  (prefer higher-priority groups), then most teachers used. Each click can give a different result.
- Candidate order (school's priority, `priorityRank`): no-reason first → 1) no teach-in yet this week (`week==0`, when weekFair) →
  2) ≤4 masa → 3) 5 masa → 4) flex → 5) 6+ masa → 6) pentadbir → 7) released kolab teacher; then orig load, weekly count, relief, random.
  Attempt score uses Σ rank (+10 if the teacher already has teach-in this week) instead of raw load.
  If the best weekFair run still leaves slots unfilled, generate() reruns `runBatch()` with weekFair off (`set.weekDropped`) and
  keeps it only if it fills more slots (toast + "KEUTAMAAN MINGGUAN DIBATALKAN" in the summary line).
- Tier rule (`tierMax`): ordinary teacher's relief count that day < tier limit for their original load (excludes freed program slots). The old `cap` radio and `maxRelief` were replaced by these tiers.
- `weekFair` (default on, needs sign-in): before Jana, loads gantiRekod for the other weekdays of the same calendar week and counts
  each teacher's `ganti` items (`WEEKCNT`); candidates sort by weekly count after original load (fewest first).
- `splitKolab` (default OFF): in a co-taught slot ("A / B") one teacher may be released for relief elsewhere if all co-teachers are
  present and none already released (`canRelease`); need gets `releasedFrom` (shown in Senarai masa ganti).
- Flexible teachers (Guru Pemulihan + Guru Bimbingan & Kaunseling, default list `DEFAULT_FLEX`, kept in localStorage `ganti_fleksibel`):
  priority group 4 (after ≤5-masa teachers), exempt from the tier limits and the consecutive rule, own daily max (`flexMax` 0–4, default 4; saved values above 4 are clamped).
- Guru ganti penuh (per absent teacher, select `data-k=cover` in the absent row → `a.cover`, saved in records): in attempt(), after
  update-mode locks and before the greedy fill, every open need of that absent teacher goes to `a.cover` when the cover is present and
  not busy (`n.byCover`, tag "guru ganti penuh"); ignores tiers/consecutive rules; slots where the cover teaches fall back to normal relief.
- `EXTRA_TEACHERS` adds teachers with no timetable entries (Ku Muhammad Nadjri bin Ku Nasir, Guru B&K).
- Co-taught class slot ("A / B" in the class timetable): if the partner is present, no relief — shown as KOLABORASI with the partner's name.
- Program option per program: teachers of the program's classes either stay with the program (default) or are released (`free`) —
  released teachers are not busy in those slots and can be given relief.
- "Permohonan tidak diberikan teach-in" (card `holdCard`, everyone): temporary per-date holds `holds[{name,from,to,reason}]` — teacher
  is present but not given relief in that window (`holdAt`; grid cell MOHON). Cleared when the date changes; saved in records
  (`holds`) and restored in update mode.
- "Jual beli masa" (card `swapCard`, everyone, per-date): `swaps[{owner,taker,from,to,ownerFree}]` — buildDay moves the owner's slots in
  the window to the taker (`tmap[taker][i].swapFrom`, grid ⇄ purple) if the taker is free. Owner is held from relief in that window
  unless `ownerFree` (via `holdAt`). Taker absent → normal relief for that class; owner absent → no need. Cleared on date change;
  saved in records (`swaps`) and restored in update mode.
- Optional Google sign-in on the page (Firebase, same pattern as kehadiran.html). Signed-in active teachers load `gantiSekatan`
  (admin-set "teacher may not be given teach-in": teacher, `day` SEMUA/ISNIN…/"" or `date` YYYY-MM-DD, from, to, reason) and
  the generator skips those slots. Only role `admin` sees the "Sekatan teach-in" card (add/delete). Rules block (`firestore-rules-ganti.txt`) is live in the Console.
- Guru praktikum (admin-only card "Guru praktikum"; Firestore `gantiPraktikum`: name, mentor, classes[{class,subject}], from, to):
  for active dates, buildDay moves the mentor's matching class+subject slots to the trainee (`tmap[trainee][i].mentor`), so the
  mentor is free then and the trainee is an ordinary relief candidate. Trainee absent → mentor takes the class back automatically
  (`byMentor`, shown "(GURU ASAL)"); if the mentor is also absent, normal relief. Loaded for any signed-in active teacher; trainee
  names are appended to `teachers`. Grid tag (PR). Rules block in `firestore-rules-ganti.txt` (must be added in the Console).
- Sekolah ganti (card `sgCard`, admin + penyelaras; Firestore `sekolahGanti/<YYYY-MM-DD>` {date, ikut ISNIN…JUMAAT, catatan}; public read,
  write isGantiAdmin — rules block in `firestore-rules-ganti.txt`, must be added in the Console). Loaded at page start without sign-in
  (`GANTI_SEKOLAH_GANTI`). onDate(): `D.day` = timetable day used (`ikut`), `D.realDay` = actual day (SABTU); R.day / slips / record /
  PDF name use the real day, subtitles show "(sekolah ganti • jadual X)". defaultDate() no longer skips a weekend that is a sekolah ganti.
  weekFair counts Mon–Sat; Rekod Mingguan shows a SABTU column when that Saturday is a sekolah ganti or has a record.
- Pelepasan kelas (card `lpCard`, admin + penyelaras): stored in `gantiPraktikum` with `jenis:"pelepasan"` {teacher, name, classes[{class,subject}],
  from, to, reason} — reuses that collection's rules; loader splits into `GANTI_PELEPASAN` / `GANTI_PRAKTIKUM`. buildDay removes the matching
  slots from the teacher's tmap (`D.lepas[{i,class,subject,teacher,reason}]`) so the teacher is free for relief; attempt() adds a need per slot
  (`n.lepas`, `absent:[teacher]`; candidates() excludes the teacher for their own class). `slipGroups()` (absents + one group per released
  teacher, SEBAB "DIBEBASKAN DARIPADA …") drives slips, PDF and WhatsApp. Grid cell LEPAS. Jana is allowed with no absents if D.lepas exists.
- Penyelaras Teach-In: teachers/<email>.penyelarasTeachIn == true gives admin access inside ganti.html only (Guru praktikum card only —
  Sekatan is real-admin only: card hidden, reasons/SEKAT cells hidden from others via `GANTI_SEE_SEKATAN`; header shows "PENYELARAS TEACH-IN"). Only role admin sees the "Penyelaras Teach-In" card that ticks this field (updateDoc on
  teachers). Rules use isGantiAdmin() = isAdmin() || penyelarasTeachIn (see `firestore-rules-ganti.txt`). Cikgu Haslinda is the coordinator.
- Admin (pentadbir) list is ticked in the page and kept in localStorage (`ganti_pentadbir`); default `DEFAULT_ADMINS` (Fauzia, Helmi, Mohamad Nazimi, Sapri); settings in `ganti_tetapan`. Nothing is saved to Firestore.
- Output: "Teach-In" slips in the school's form layout (one per absent teacher: Nama/Tarikh/Hari/Sebab + Nama Guru/Masa/Kelas-MP,
  no blank padding rows; "Disediakan oleh" (preparer, required, remembered in localStorage `ganti_disediakan`) printed after the last slip;
  printed A4 portrait, 3 per page; relief names prefixed by `honorific()`: USTAZ/USTAZAH (bin/binti) for teachers of BA or PI-* in the
  timetable (`TT.agama`), else CIKGU — also in PDF and WhatsApp; when any need has `releasedFrom` (split kolab), a boxed
  "MAKLUMAN: KELAS KOLABORASI" note (`kolabNotes()`, `KOLAB_INTRO`, `#kolabNote`) is printed before "Disediakan oleh" on slips and in the PDF), plus a one-page grid of all teachers (A4 landscape), editable relief list, WhatsApp text copy.
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
  Also `settings` (R.set + `pentadbir[]`, `fleksibel[]`, `weekDropped`, `lines[]` = readable Malay lines from `settingsLines()`) and
  `mode` (baru|tambah|semula). Rekod Mingguan shows them per day under the grid (`#wkSettings`, "Tetapan yang digunakan").
- Update mode (`BASE = {rec,map,mode,src}`), two buttons in absCard: "Tambah Teach-In" (`mode:'tambah'`) and "Jana Semula Keseluruhan"
  (`mode:'semula'`); banner can switch mode. `startUpdate()` uses the on-screen result R as base when it is for the same date
  (`src:'skrin'`, no sign-in needed), otherwise loads gantiRekod for the date (`src:'rekod'`, absents marked ASAL, programs, holds, swaps, preparedBy).
  tambah: on Jana, base `ganti` assignments are locked unless that relief teacher is now absent (then reassigned, `prevRelief`);
  changed/new items get `added` (TAMBAHAN, amber); WhatsApp copy lists only the additions.
  semula: nothing locked, full re-run; items differing from base get `added` shown as BERUBAH (`addTag()`) with `prevRelief` = old relief;
  WhatsApp copy is the full list with "menggantikan jadual sebelum ini" and (BERUBAH) marks. Record `revision` increments.
  Records now also store `programs[]` and `revision`. Changing the date leaves update mode. No "kecemasan" wording (user request).
- Tabs: "Jana Teach-In" (generator, `.jana-only`) and "Rekod Mingguan" (`.minggu-only`, body class `tab-minggu`, remembered in
  localStorage `ganti_tab`). Rekod Mingguan: pick a school week, loads gantiRekod for Mon–Fri, grid of all teachers × 5 days
  (relief count + classes, absence reason, grey = day not saved) + weekly total; sort by name/total; prints A4 landscape.
  Rules block for gantiRekod is in `firestore-rules-ganti.txt` (must be added in the Console).
- Tab "Panduan" (`.panduan-only`, body class `tab-panduan`, remembered in `ganti_tab`): `loadGuide()` fetches `panduan-ganti.html`,
  takes its `<style>` (minus @page) and the `.pg` element and injects them into `#guideBody`. `panduan-ganti.html` (+ images in
  `panduan-ganti/*.jpg`) is the SINGLE SOURCE of the user guide — all CSS is scoped under `.pg`, with `@media screen` tweaks for the tab.
  Whenever a ganti.html feature changes, update panduan-ganti.html in the same commit (and refresh screenshots if the UI changed).
  The printable PDF is rendered from it (Playwright `page.pdf`, A4, print media); the Claude Doc copy of the guide is secondary.
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
