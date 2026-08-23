(function(){
"use strict";
const S="https://nmmetzityubqbrbpibee.supabase.co",K="sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX",db=window.supabase.createClient(S,K);
let ownedEvents=[];
let historyEvents=[];
let ownerId=null;
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;/g").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
function past(e){return typeof window.isPastEvent==="function"?window.isPastEvent(e.event_date,e.event_time,e.timezone):new Date(`${e.event_date}T${e.event_time||"23:59"}`).getTime()<Date.now()}
async function load(){
 const {data:{session}}=await db.auth.getSession();
 if(!session?.user)return;
 ownerId=session.user.id;
 const {data,error}=await db.from("events").select("id,name,user_id,event_date,event_time,timezone,attendance_confirmed");
 if(error){console.error("❌ Error cargando actividades:",error);return;}
 historyEvents=data||[];
 ownedEvents=historyEvents.filter(e=>e.user_id===ownerId&&past(e));
}
function getCardEventId(card){
 const direct=card.dataset.eventId||card.getAttribute("data-event-id");
 if(direct&&/^\d+$/.test(direct))return Number(direct);
 const buttons=card.querySelectorAll("button");
 for(const button of buttons){
   const onclick=button.getAttribute("onclick")||"";
   let m=onclick.match(/openEditModal\((\d+)\)/);
   if(m)return Number(m[1]);
   m=onclick.match(/(?:edit|delete|join|leave)Event\((\d+)/i);
   if(m)return Number(m[1]);
   const id=button.dataset.eventId;
   if(id&&/^\d+$/.test(id))return Number(id);
 }
 return null;
}
async function openAttendance(e){
 const {data:rows,error}=await db.from("event_participants").select("user_id,player_name,attended").eq("event_id",e.id).order("player_name",{ascending:true});
 if(error){console.error(error);alert("No se pudieron cargar los participantes.");return}
 const confirmed=e.attendance_confirmed===true;
 const m=document.createElement("div");m.className="attendance-modal";
 m.innerHTML=`<div class="attendance-panel"><h2>👥 Confirmar asistencia</h2><div class="attendance-subtitle">${esc(e.name)}<br>Marca solamente a quienes <strong>NO asistieron</strong>.</div><div class="attendance-list">${rows?.length?rows.map(r=>`<label class="attendance-row"><input type="checkbox" data-user-id="${esc(r.user_id)}" ${confirmed&&r.attended===false?"checked":""}><span>${esc(r.player_name||"Jugador")}</span></label>`).join(""):"<div style='color:#aaa;padding:10px 0'>No hubo participantes.</div>"}</div><div class="attendance-actions"><button type="button" class="attendance-cancel">Cancelar</button><button type="button" class="attendance-save">Guardar asistencia</button></div></div>`;
 document.body.appendChild(m);
 const close=()=>m.remove();m.querySelector(".attendance-cancel").onclick=close;m.onclick=x=>{if(x.target===m)close()};
 m.querySelector(".attendance-save").onclick=async()=>{
  const b=m.querySelector(".attendance-save");b.disabled=true;b.textContent="Guardando...";
  for(const i of m.querySelectorAll("input[data-user-id]")){
   const {error}=await db.from("event_participants").update({attended:!i.checked}).eq("event_id",e.id).eq("user_id",i.dataset.userId);
   if(error){console.error(error);alert("No se pudo guardar la asistencia.");b.disabled=false;b.textContent="Guardar asistencia";return}
  }
  const {error}=await db.from("events").update({attendance_confirmed:true}).eq("id",e.id);
  if(error){console.error(error);alert("No se pudo confirmar la actividad.");b.disabled=false;b.textContent="Guardar asistencia";return}
  e.attendance_confirmed=true;close();inject();
 };
}
function inject(){
 const list=document.getElementById("eventsList");if(!list||!ownerId)return;
 list.querySelectorAll(".event-card").forEach(card=>{
  if(card.querySelector(".attendance-button"))return;
  const id=getCardEventId(card);if(id===null)return;
  const e=ownedEvents.find(x=>x.id===id);if(!e||e.user_id!==ownerId||!past(e))return;
  const a=card.querySelector(".event-actions");if(!a)return;
  const b=document.createElement("button");b.type="button";b.className="attendance-button";b.dataset.eventId=String(e.id);b.textContent=e.attendance_confirmed?"✏️ Editar asistencia":"👥 Confirmar asistencia";b.onclick=()=>openAttendance(e);a.appendChild(b);
 });
 paginateHistory();
}

// ============================================
// PAGINACIÓN DEL HISTÓRICO
// ============================================
let historyPage=1;
const HISTORY_PER_PAGE=10;
function paginateHistory(){
 const list=document.getElementById("eventsList");
 if(!list)return;
 const isHistory=typeof currentViewFilter!=="undefined"&&currentViewFilter==="past";
 let pager=document.getElementById("historyPagination");
 if(!isHistory){
   if(pager)pager.remove();
   list.querySelectorAll(".event-card").forEach(c=>c.style.display="");
   return;
 }
 const cards=[...list.querySelectorAll(".event-card")];
 if(!cards.length){if(pager)pager.remove();return;}
 const getEvent=id=>historyEvents.find(e=>Number(e.id)===Number(id))||null;
 // Ordenar de más reciente a más antiguo usando la fecha y hora reales de Supabase.
 cards.sort((a,b)=>{
   const ea=getEvent(getCardEventId(a)),eb=getEvent(getCardEventId(b));
   const da=ea?new Date(`${ea.event_date}T${ea.event_time||"23:59"}`).getTime():0;
   const dbb=eb?new Date(`${eb.event_date}T${eb.event_time||"23:59"}`).getTime():0;
   return dbb-da;
 });
 cards.forEach(c=>list.appendChild(c));
 const totalPages=Math.ceil(cards.length/HISTORY_PER_PAGE);
 if(historyPage>totalPages)historyPage=totalPages||1;
 const start=(historyPage-1)*HISTORY_PER_PAGE,end=start+HISTORY_PER_PAGE;
 cards.forEach((c,i)=>c.style.display=i>=start&&i<end?"":"none");
 if(totalPages<=1){if(pager)pager.remove();return;}
 if(!pager){
   pager=document.createElement("div");pager.id="historyPagination";list.parentNode.insertBefore(pager,list.nextSibling);
 }
 pager.innerHTML=`<div style="display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin:20px 0 8px"><button data-page="prev" style="padding:7px 11px;border:1px solid #555;background:#292929;color:#eee;border-radius:6px;cursor:pointer" ${historyPage===1?"disabled":""}>‹</button>${Array.from({length:totalPages},(_,i)=>{const p=i+1;return `<button data-page="${p}" style="padding:7px 11px;border:1px solid ${p===historyPage?'#f28c28':'#555'};background:${p===historyPage?'#f28c28':'#292929'};color:${p===historyPage?'#171717':'#eee'};border-radius:6px;cursor:pointer;font-weight:${p===historyPage?'bold':'normal'}">${p}</button>`}).join("")}<button data-page="next" style="padding:7px 11px;border:1px solid #555;background:#292929;color:#eee;border-radius:6px;cursor:pointer" ${historyPage===totalPages?"disabled":""}>›</button></div><div style="text-align:center;color:#888;font-size:12px;margin-bottom:12px">Página ${historyPage} de ${totalPages}</div>`;
 pager.querySelectorAll("button").forEach(btn=>btn.onclick=()=>{
   const value=btn.dataset.page;
   if(value==="prev")historyPage=Math.max(1,historyPage-1);
   else if(value==="next")historyPage=Math.min(totalPages,historyPage+1);
   else historyPage=Number(value);
   paginateHistory();
   window.scrollTo({top:list.offsetTop-20,behavior:"smooth"});
 });
}

async function start(){
 await load();inject();
 const list=document.getElementById("eventsList");
 if(list)new MutationObserver(()=>setTimeout(inject,80)).observe(list,{childList:true,subtree:true});
 setInterval(inject,1000);
 if(typeof window.renderEvents==="function"){
   const old=window.renderEvents;
   window.renderEvents=function(){
     if(typeof currentViewFilter!=="undefined"&&currentViewFilter==="past")historyPage=1;
     const r=old.apply(this,arguments);
     setTimeout(inject,120);
     return r;
   }
 }
 const stats=document.createElement("script");stats.src="stats.js?v=1";stats.async=true;document.body.appendChild(stats);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
