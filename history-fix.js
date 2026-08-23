(function(){
"use strict";
const PAGE_SIZE=10;
let busy=false;
let page=1;
let lastSignature="";

function eventIdFromCard(card){
  const direct=card.dataset.eventId||card.getAttribute("data-event-id");
  if(direct&&/^\d+$/.test(direct)) return Number(direct);
  const edit=card.querySelector(".edit-button");
  const m=edit?.getAttribute("onclick")?.match(/openEditModal\((\d+)\)/);
  return m?Number(m[1]):null;
}
function eventTime(e){
  if(!e) return 0;
  const d=String(e.event_date||"");
  const t=String(e.event_time||"23:59");
  return new Date(`${d}T${t}`).getTime()||0;
}
function isHistory(){
  try{return typeof currentViewFilter!=="undefined"&&currentViewFilter==="past";}catch(_){return false;}
}
function apply(){
  const list=document.getElementById("eventsList");
  if(!list||!isHistory()||typeof events==="undefined") return;
  const cards=[...list.querySelectorAll(":scope > .event-card")];
  if(!cards.length) return;
  const mapped=cards.map(card=>({card,event:events.find(e=>Number(e.id)===eventIdFromCard(card))}));
  mapped.sort((a,b)=>eventTime(b.event)-eventTime(a.event));
  const sig=mapped.map(x=>`${x.event?.id||"x"}:${eventTime(x.event)}`).join(",");
  if(sig!==lastSignature){page=1;lastSignature=sig;}
  const totalPages=Math.max(1,Math.ceil(mapped.length/PAGE_SIZE));
  if(page>totalPages) page=totalPages;
  const start=(page-1)*PAGE_SIZE;
  mapped.forEach((x,i)=>{
    x.card.style.display=i>=start&&i<start+PAGE_SIZE?"":"none";
    list.appendChild(x.card);
  });
  renderPager(list,totalPages);
}
function renderPager(list,totalPages){
  let nav=document.getElementById("historyPagination");
  if(totalPages<=1){nav?.remove();return;}
  if(!nav){
    nav=document.createElement("div");
    nav.id="historyPagination";
    nav.style.cssText="display:flex;justify-content:center;align-items:center;gap:6px;margin:20px 0 5px;flex-wrap:wrap";
    list.appendChild(nav);
  }
  nav.innerHTML="";
  const make=(text,p,active=false,disabled=false)=>{
    const b=document.createElement("button");
    b.type="button";b.textContent=text;
    b.disabled=disabled;
    b.style.cssText=`min-width:36px;padding:7px 10px;border:1px solid #555;border-radius:6px;background:${active?"#f0a500":"#292929"};color:${active?"#171717":"#fff"};cursor:${disabled?"default":"pointer"};font-weight:bold`;
    if(!disabled)b.onclick=()=>{page=p;lastSignature="";apply();window.scrollTo({top:list.offsetTop-20,behavior:"smooth"});};
    nav.appendChild(b);
  };
  make("‹",page-1,false,page===1);
  for(let p=1;p<=totalPages;p++) make(String(p),p,p===page,false);
  make("›",page+1,false,page===totalPages);
}
function schedule(){if(busy)return;busy=true;setTimeout(()=>{busy=false;apply()},80)}
function init(){
  const list=document.getElementById("eventsList");
  if(!list)return;
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  document.querySelectorAll(".filter-tab").forEach(tab=>tab.addEventListener("click",()=>{page=1;lastSignature="";setTimeout(apply,120)}));
  document.getElementById("categoryFilterSelect")?.addEventListener("change",()=>{page=1;lastSignature="";setTimeout(apply,120)});
  setInterval(()=>{if(isHistory())apply();},1500);
  setTimeout(apply,300);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();