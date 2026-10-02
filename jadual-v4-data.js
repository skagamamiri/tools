// ============================================================
// JADUAL VERSI 4.0 — 27 SEPTEMBER 2026
// Sumber: Jadual Waktu Guru (7).pdf, Versi 4.0
// Data diekstrak terus daripada PDF dan disimpan sebagai JavaScript biasa.
// Tiada Base64 / atob digunakan supaya tidak bergantung pada decoder.
// ============================================================
(function(){
  if(typeof VERSION_DATA === "undefined") return;
  if(VERSION_DATA.some(v=>v.id === "v4")) return;
  VERSION_DATA.push({
    id: "v4",
    label: "Versi 4.0 — 27 September 2026",
    shortLabel: "V4 — 27/09/2026",
    data: {"teachers":[{"name":"Abdullah bin Mohammad","entries":[{"day":"ISNIN","start":"07:00","end":"07:30","subject":"PI-Q","class":"4A"},{"day":"ISNIN","start":"07:30","end":"08:30","subject":"PI-Q","class":"4A"},{"day":"ISNIN","start":"10:30","end":"11:30","subject":"TAS","class":"5C"},{"day":"ISNIN","start":"12:00","end":"13:00","subject":"TAS","class":"4A"},{"day":"SELASA","start":"07:00","end":"07:30","subject":"PI-Q","class":"5D"},{"day":"SELASA","start":"08:30","end":"09:30","subject":"PI-U","class":"5B"},{"day":"SELASA","start":"11:30","end":"12:30","subject":"PI-Q","class":"5D"},{"day":"SELASA","start":"12:30","end":"13:00","subject":"PI-J","class":"4A"},{"day":"RABU","start":"07:00","end":"08:00","subject":"PI-Q","class":"6A"},{"day":"RABU","start":"09:00","end":"09:30","subject":"PI-Q","class":"6A"},{"day":"RABU","start":"10:00","end":"11:00","subject":"PI-Q","class":"5B"},{"day":"RABU","start":"12:00","end":"12:30","subject":"PI-Q","class":"5B"},{"day":"RABU","start":"12:30","end":"13:00","subject":"PI-J","class":"5B"},{"day":"KHAMIS","start":"07:30","end":"08:30","subject":"PI-U","class":"4A"},{"day":"KHAMIS","start":"09:00","end":"09:30","subject":"PI-Q","class":"5C"},{"day":"KHAMIS","start":"10:00","end":"11:00","subject":"PI-Q","class":"5C"},{"day":"KHAMIS","start":"12:00","end":"13:00","subject":"TAS","class":"5B"},{"day":"JUMAAT","start":"08:30","end":"09:30","subject":"TAS","class":"5D"},{"day":"JUMAAT","start":"10:00","end":"10:30","subject":"TAS","class":"4B"}]}]}
  });
})();
