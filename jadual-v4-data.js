// Jadual Versi 4.0 — 27 September 2026
// Data asas menggunakan struktur jadual semasa yang telah disahkan.
(function(){
  if(typeof VERSION_DATA === "undefined") return;
  const base = VERSION_DATA.find(v=>v.id === "v6");
  if(!base || VERSION_DATA.some(v=>v.id === "v4")) return;
  VERSION_DATA.push({
    id: "v4",
    label: "Versi 4.0 — 27 September 2026",
    shortLabel: "V4 — 27/09/2026",
    data: JSON.parse(JSON.stringify(base.data))
  });
  try{
    if(typeof setupVersions === "function") setupVersions();
  }catch(e){ console.warn("Jadual V4: gagal refresh senarai versi",e); }
})();
