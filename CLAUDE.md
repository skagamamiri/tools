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
  `kehadiran.html?kod=...`.
- The timetable is NOT duplicated: `kehadiran-data.js` fetches `jadual.html` and reads `VERSION_DATA` /
  `DEFAULT_VERSION_ID`. Keep that `const VERSION_DATA = [ ... \n];` block shape intact when updating jadual.html.
- kehadiran.html: scans that match the timetable/booking are saved automatically (no confirm tap); out-of-timetable
  scans (LUAR_JADUAL) still need a note + manual tap. Plus "Paparan Kelas" for admin/pentadbir — one class per view (dropdown), weekly
  landscape grid (days × 30-min columns); cell blue = scanned, red = started but not scanned, grey = not started.
  No late (LEWAT) status is used. "Cetak Kelas Ini" / "Cetak Semua Kelas" print A4 landscape, one class per page.
- Firestore security rules are edited by the owner in the Firebase Console, not from here.

## Guru Ganti (ganti.html)

- Relief-teacher generator. Reads the timetable via `KehadiranData.loadTimetable()` (kehadiran-data.js) — no copy of the jadual.
- Inputs: date, absent teachers (full day or a time range), optional programs (time range + classes; those class slots need no relief),
  settings (load cap ≤5/≤6/≤7 masa, admins 0/1/2 masa, avoid 4+ consecutive masa). 1 masa = 30-min slot.
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
- School week comes from erph.html (`const WEEKS=[...].map` and `CUTI`), fetched and parsed — keep that shape intact.
