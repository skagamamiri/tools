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

  // Simpan versi default guru ke Supabase tanpa menyentuh FCM/sw.js.
  const originalSetDefaultVersion = window.setDefaultVersion;
  window.setDefaultVersion = async function(){
    const id = document.getElementById("versionSelect")?.value || "v4";
    if(typeof originalSetDefaultVersion === "function") originalSetDefaultVersion();
    if(id !== "v4"){
      console.warn("Versi push server belum tersedia:", id);
      return;
    }
    try{
      const mod = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      const auth = mod.getAuth();
      const user = auth.currentUser;
      if(!user) return;
      const idToken = await user.getIdToken();
      const r = await fetch("https://ifqgstspfxagzstccsin.supabase.co/functions/v1/save-schedule-version",{
        method:"POST",
        headers:{"Authorization":"Bearer "+idToken,"Content-Type":"application/json"},
        body:JSON.stringify({scheduleVersion:id})
      });
      const data = await r.json().catch(()=>({}));
      if(!r.ok || !data.ok) throw new Error(data.error || "Gagal menyimpan versi jadual.");
      console.log("Jadual version synced:", data.scheduleVersion);
    }catch(e){
      console.warn("Jadual V4: gagal sync versi ke Supabase",e);
    }
  };
})();
