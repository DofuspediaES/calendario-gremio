(function(){
  "use strict";
  const URL="https://nmmetzityubqbrbpibee.supabase.co";
  const KEY="sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  async function load(){
    if(document.getElementById("guildStats"))return;
    const {data:events,error:e1}=await db.from("events").select("id,name,event_date,event_time,capacity,attendance_confirmed");
    if(e1){console.error("Estadísticas:",e1);return;}
    const {data:parts,error:e2}=await db.from("event_participants").select("event_id,attended");
    if(e2){console.error("Estadísticas:",e2);return;}
    const now=new Date();
    const past=(events||[]).filter(e=>new Date(`${e.event_date}T${e.event_time||"23:59"}`)<now);
    const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const month=past.filter(e=>String(e.event_date).slice(0,7)===monthKey);
    const pBy={};(parts||[]).forEach(p=>(pBy[p.event_id]??=[]).push(p));
    const confirmed=past.filter(e=>e.attendance_confirmed===true);
    const confirmedParts=confirmed.flatMap(e=>pBy[e.id]||[]);
    const attended=confirmedParts.filter(p=>p.attended===true).length;
    const total=confirmedParts.length;
    const rate=total?Math.round(attended/total*100):0;
    const popular=[...past].sort((a,b)=>(pBy[b.id]?.length||0)-(pBy[a.id]?.length||0))[0];
    const popularMonth=[...month].sort((a,b)=>(pBy[b.id]?.length||0)-(pBy[a.id]?.length||0))[0];
    const section=document.createElement("section");section.id="guildStats";section.className="guild-stats-section";
    section.innerHTML=`<div class="section-title"><h2>📊 Estadísticas del gremio</h2></div><div class="guild-stats-grid"><div class="guild-stat-card"><strong>🔥</strong><b>${month.length}</b><span>Actividades este mes</span></div><div class="guild-stat-card"><strong>👥</strong><b>${(parts||[]).length}</b><span>Participaciones</span></div><div class="guild-stat-card"><strong>✅</strong><b>${rate}%</b><span>Asistencia registrada</span></div><div class="guild-stat-card"><strong>📅</strong><b>${past.length}</b><span>Actividades realizadas</span></div></div><div class="guild-stats-highlights"><div><strong>🌟 Actividad más popular</strong><span>${popular?esc(popular.name):"Todavía no hay datos"}</span><small>${popular?(pBy[popular.id]?.length||0)+" participantes":""}</small></div><div><strong>🔥 Más popular este mes</strong><span>${popularMonth?esc(popularMonth.name):"Todavía no hay datos"}</span><small>${popularMonth?(pBy[popularMonth.id]?.length||0)+" participantes":""}</small></div><div><strong>📈 El gremio está activo</strong><span>${month.length} actividades realizadas este mes</span><small>${total} asistencias registradas</small></div></div>`;
    document.querySelector(".events-section")?.insertAdjacentElement("afterend",section);
  }
  function start(){setTimeout(load,500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
