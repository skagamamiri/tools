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

## Kehadiran Kelas (QR)

- QR text format: `ICTHUB:KELAS:<code e.g. 4A>` or `ICTHUB:BILIK:<room name>`. Print them from `qr-kelas.html`.
- `qr-scanner.js` adds the mobile-only "Imbas QR" button to the index profile card and sends valid codes to
  `kehadiran.html?kod=...`.
- The timetable is NOT duplicated: `kehadiran-data.js` fetches `jadual.html` and reads `VERSION_DATA` /
  `DEFAULT_VERSION_ID`. Keep that `const VERSION_DATA = [ ... \n];` block shape intact when updating jadual.html.
- kehadiran.html: teacher scan flow + "Paparan Kelas" for admin/pentadbir — one class per view (dropdown), weekly
  landscape grid (days × 30-min columns); cell blue = scanned, red = started but not scanned, grey = not started.
  No late (LEWAT) status is used.
- Firestore security rules are edited by the owner in the Firebase Console, not from here.
