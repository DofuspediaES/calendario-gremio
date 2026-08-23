(function(){
  "use strict";
  const URL="https://nmmetzityubqbrbpibee.supabase.co";
  const KEY="sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";
  const db=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const typeNames={dungeon:"🗝️ Mazmorra",quest:"🗺️ Misiones",infinite_dreams:"🌀 Sueños Infinitos",commission:"📦 Encargo",raid:"⚔️ Raids",farm:"💰 Drop/Farm",wanted:"📜 Busca y Captura",other:"🎲 Otros"};
  function styles(){if(document.getElementById("guildStatsStyles"))return;const s=document.createElement("style");s.id="guildStatsStyles";s.textContent=`.guild-stats-section{margin-top:28px;padding:20px;background:#202020;border:1px solid #3b3b3b;border-radius:10px}.guild-stats-section .section-title{margin-bottom:16px}.guild-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.guild-stat-card{background:#292929;border:1px solid #444;border-radius:8px;padding:14px 10px;text-align:center;display:flex;flex-direction:column;gap:4px}.guild-stat-card strong{font-size:20px}.guild-stat-card b{font-size:24px}.guild-stat-card span{font-size:12px;color:#aaa}.guild-stats-highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.guild-stats-highlights>div{background:#292929;border:1px solid #444;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:5px}.guild-stats-highlights strong{font-size:13px}.guild-stats-highlights span{font-weight:bold}.guild-stats-highlights small{color:#aaa;font-size:12px}.guild-records{margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.guild-records>div{background:#292929;border:1px solid #444;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:5px}.guild-records strong{font-size:13px}.guild-records span{font-weight:bold}.guild-records small{color:#aaa;font-size:12px}.guild-stats-full-link{display:inline-block;margin-top:16px;padding:9px 14px;border-radius:6px;background:#292929;border:1px solid #555;color:#fff;text-decoration:none;font-weight:bold;font-size:13px}.guild-stats-full-link:hover{background:#e67e22;color:#171717;border-color:#e67e22}@media(max-width:700px){.guild-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.guild-stats-highlights,.guild-records{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  async function load(){
    if(document.getElementById("guildStats"))return;
    styles();
    const {data:events,error:e1}=await db.from("events").select("id,name,type,event_date,event_time,capacity,attendance_confirmed");
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
    const maxParticipants=popular?pBy[popular.id]?.length||0:0;
    const dayCounts={};past.forEach(e=>{const d=new Date(`${e.event_date}T12:00:00`);const key=d.getDay();dayCounts[key]=(dayCounts[key]||0)+1});
    const days=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];let topDay=null;Object.keys(dayCounts).forEach(k=>{if(!topDay||dayCounts[k]>dayCounts[topDay])topDay=k});
    const typeCounts={};past.forEach(e=>{const key=e.type||"other";typeCounts[key]=(typeCounts[key]||0)+1});let topType=null;Object.keys(typeCounts).forEach(k=>{if(!topType||typeCounts[k]>typeCounts[topType])topType=k});
    const monthCounts={};past.forEach(e=>{const key=String(e.event_date).slice(0,7);monthCounts[key]=(monthCounts[key]||0)+1});let topMonth=null;Object.keys(monthCounts).forEach(k=>{if(!topMonth||monthCounts[k]>monthCounts[topMonth])topMonth=k});
    const monthLabel=topMonth?new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(new Date(`${topMonth}-01T12:00:00`)):"";
    const section=document.createElement("section");section.id="guildStats";section.className="guild-stats-section";
    section.innerHTML=`<div class="section-title"><h2>📊 Estadísticas del gremio</h2></div><div class="guild-stats-grid"><div class="guild-stat-card"><strong>🔥</strong><b>${month.length}</b><span>Actividades este mes</span></div><div class="guild-stat-card"><strong>👥</strong><b>${(parts||[]).length}</b><span>Participaciones</span></div><div class="guild-stat-card"><strong>✅</strong><b>${rate}%</b><span>Asistencia registrada</span></div><div class="guild-stat-card"><strong>📅</strong><b>${past.length}</b><span>Actividades realizadas</span></div></div><div class="guild-stats-highlights"><div><strong>🌟 Actividad más popular</strong><span>${popular?esc(popular.name):"Todavía no hay datos"}</span><small>${popular?maxParticipants+" participantes":""}</small></div><div><strong>🔥 Más popular este mes</strong><span>${popularMonth?esc(popularMonth.name):"Todavía no hay datos"}</span><small>${popularMonth?(pBy[popularMonth.id]?.length||0)+" participantes":""}</small></div><div><strong>📈 El gremio está activo</strong><span>${month.length} actividades realizadas este mes</span><small>${total} participaciones con asistencia confirmada</small></div></div><div class="guild-records"><div><strong>👥 Mayor número de participantes</strong><span>${maxParticipants?maxParticipants+" participantes":"Todavía no hay datos"}</span><small>${popular?esc(popular.name):""}</small></div><div><strong>📆 Día más activo</strong><span>${topDay!==null?days[Number(topDay)]:"Todavía no hay datos"}</span><small>${topDay!==null?dayCounts[topDay]+" actividades":""}</small></div><div><strong>🎯 Tipo más popular</strong><span>${topType?typeNames[topType]||esc(topType):"Todavía no hay datos"}</span><small>${topType?typeCounts[topType]+" actividades":""}</small></div><div><strong>🗓️ Mes más activo</strong><span>${monthLabel||"Todavía no hay datos"}</span><small>${topMonth?monthCounts[topMonth]+" actividades":""}</small></div></div><a class="guild-stats-full-link" href="estadisticas.html">📈 Ver estadísticas completas →</a>`;
    document.querySelector(".events-section")?.insertAdjacentElement("afterend",section);
  }
  function start(){setTimeout(load,500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
