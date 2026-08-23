(function(){
"use strict";
if(window.__guildStatsLoaded)return;
window.__guildStatsLoaded=true;
const URL="https://nmmetzityubqbrbpibee.supabase.co",KEY="sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";
const db=window.supabase.createClient(URL,KEY);
const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const types={dungeon:"🗝️ Mazmorra",quest:"🗺️ Misiones",infinite_dreams:"🌀 Sueños Infinitos",commission:"📦 Encargo",raid:"⚔️ Raids",farm:"💰 Drop/Farm",wanted:"📜 Busca y Captura",other:"🎲 Otros"};
function styles(){if(document.getElementById("guildStatsStyles"))return;const s=document.createElement("style");s.id="guildStatsStyles";s.textContent=`.guild-stats-section{margin-top:28px;padding:20px;background:#202020;border:1px solid #3b3b3b;border-radius:10px}.guild-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.guild-stat-card{background:#292929;border:1px solid #444;border-radius:8px;padding:14px 10px;text-align:center}.guild-stat-card b{display:block;font-size:24px;margin:4px 0}.guild-stat-card span{font-size:12px;color:#aaa}.guild-stats-highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.guild-stats-highlights>div{background:#292929;border:1px solid #444;border-radius:8px;padding:14px}.guild-stats-highlights strong{display:block;font-size:13px;margin-bottom:6px}.guild-stats-highlights span{font-weight:bold}.guild-stats-highlights small{display:block;color:#aaa;margin-top:5px}.guild-records{margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.guild-records>div{background:#292929;border:1px solid #444;border-radius:8px;padding:14px}.guild-records strong,.guild-records span,.guild-records small{display:block}.guild-records span{font-weight:bold;margin-top:5px}.guild-records small{color:#aaa;margin-top:4px}.guild-stats-full-link{display:inline-block;margin-top:16px;padding:9px 14px;border-radius:6px;background:#292929;border:1px solid #555;color:#fff;text-decoration:none;font-weight:bold;font-size:13px}.guild-stats-full-link:hover{background:#e67e22;color:#171717}@media(max-width:700px){.guild-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.guild-stats-highlights,.guild-records{grid-template-columns:1fr}}`;document.head.appendChild(s)}
async function load(){
if(document.getElementById("guildStats"))return;
styles();
const [{data:events,error:e1},{data:parts,error:e2}]=await Promise.all([db.from("events").select("id,name,type,event_date,event_time,capacity,attendance_confirmed"),db.from("event_participants").select("event_id,user_id,player_name,attended")]);
if(e1||e2){console.error("Estadísticas:",e1||e2);return;}
const now=new Date();
const past=(events||[]).filter(e=>new Date(`${e.event_date}T${e.event_time||"23:59"}`)<now);
const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
const month=past.filter(e=>String(e.event_date).slice(0,7)===monthKey);
const byEvent={};(parts||[]).forEach(p=>(byEvent[p.event_id]??=[]).push(p));
// Si la actividad terminó y el creador no marcó inasistencias, todos los apuntados cuentan como asistentes.
const absent=(e,p)=>e.attendance_confirmed===true&&p.attended===false;
const attended=(e,p)=>!absent(e,p);
const pastParts=past.flatMap(e=>(byEvent[e.id]||[]).map(p=>({e,p})));
const attendedParts=pastParts.filter(x=>attended(x.e,x.p));
const absentParts=pastParts.filter(x=>absent(x.e,x.p));
const total=pastParts.length,att=attendedParts.length,rate=total?Math.round(att/total*100):0;
const popular=[...past].sort((a,b)=>(byEvent[b.id]?.length||0)-(byEvent[a.id]?.length||0))[0];
const popularMonth=[...month].sort((a,b)=>(byEvent[b.id]?.length||0)-(byEvent[a.id]?.length||0))[0];
const maxParticipants=popular?(byEvent[popular.id]?.length||0):0;
const ranking={};attendedParts.forEach(({p})=>{const k=p.user_id||p.player_name||"unknown";if(!ranking[k])ranking[k]={name:p.player_name||"Jugador",a:0,t:0};ranking[k].a++});pastParts.forEach(({p})=>{const k=p.user_id||p.player_name||"unknown";if(!ranking[k])ranking[k]={name:p.player_name||"Jugador",a:0,t:0};ranking[k].t++});
const topPlayers=Object.values(ranking).sort((a,b)=>b.a-a.a||b.t-a.t).slice(0,5);
const rankingHtml=topPlayers.length?topPlayers.map((p,i)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #3b3b3b"><span>${i+1}. ${esc(p.name)}</span><strong>${p.a}</strong></div>`).join(""):"<span style='color:#999'>Todavía no hay participaciones.</span>";
const dayCounts={};past.forEach(e=>{const k=new Date(`${e.event_date}T12:00:00`).getDay();dayCounts[k]=(dayCounts[k]||0)+1});let topDay=null;Object.keys(dayCounts).forEach(k=>{if(topDay===null||dayCounts[k]>dayCounts[topDay])topDay=k});
const days=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const typeCounts={};past.forEach(e=>{const k=e.type||"other";typeCounts[k]=(typeCounts[k]||0)+1});let topType=null;Object.keys(typeCounts).forEach(k=>{if(!topType||typeCounts[k]>typeCounts[topType])topType=k});
const monthCounts={};past.forEach(e=>{const k=String(e.event_date).slice(0,7);monthCounts[k]=(monthCounts[k]||0)+1});let topMonth=null;Object.keys(monthCounts).forEach(k=>{if(!topMonth||monthCounts[k]>monthCounts[topMonth])topMonth=k});
const monthLabel=topMonth?new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(new Date(`${topMonth}-01T12:00:00`)):"";
const section=document.createElement("section");section.id="guildStats";section.className="guild-stats-section";
section.innerHTML=`<div class="section-title"><h2>📊 Estadísticas del gremio</h2></div><div class="guild-stats-grid"><div class="guild-stat-card">🔥<b>${month.length}</b><span>Actividades este mes</span></div><div class="guild-stat-card">👥<b>${total}</b><span>Participaciones realizadas</span></div><div class="guild-stat-card">✅<b>${rate}%</b><span>Asistencia registrada</span></div><div class="guild-stat-card">📅<b>${past.length}</b><span>Actividades realizadas</span></div></div><div class="guild-stats-highlights"><div><strong>🌟 Actividad más popular</strong><span>${popular?esc(popular.name):"Todavía no hay datos"}</span><small>${popular?maxParticipants+" participantes":""}</small></div><div><strong>🔥 Más popular este mes</strong><span>${popularMonth?esc(popularMonth.name):"Todavía no hay datos"}</span><small>${popularMonth?(byEvent[popularMonth.id]?.length||0)+" participantes":""}</small></div><div><strong>🏆 Ranking de asistentes</strong>${rankingHtml}</div></div><div class="guild-records"><div><strong>👥 Mayor número de participantes</strong><span>${maxParticipants?maxParticipants+" participantes":"Todavía no hay datos"}</span><small>${popular?esc(popular.name):""}</small></div><div><strong>📆 Día más activo</strong><span>${topDay!==null?days[Number(topDay)]:"Todavía no hay datos"}</span><small>${topDay!==null?dayCounts[topDay]+" actividades":""}</small></div><div><strong>🎯 Tipo más popular</strong><span>${topType?types[topType]||esc(topType):"Todavía no hay datos"}</span><small>${topType?typeCounts[topType]+" actividades":""}</small></div><div><strong>🗓️ Mes más activo</strong><span>${monthLabel||"Todavía no hay datos"}</span><small>${topMonth?monthCounts[topMonth]+" actividades":""}</small></div></div><a class="guild-stats-full-link" href="estadisticas.html">📈 Ver estadísticas completas →</a>`;
document.querySelector(".events-section")?.insertAdjacentElement("afterend",section);
}
function start(){setTimeout(load,500)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();