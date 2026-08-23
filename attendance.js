(function () {
    "use strict";
    const SUPABASE_URL = "https://nmmetzityubqbrbpibee.supabase.co";
    const SUPABASE_KEY = "sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";
    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    let ownedEvents = [];
    let observerStarted = false;

    function esc(value) {
        return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
    }
    function isPast(event) {
        if (typeof window.isPastEvent === "function") return window.isPastEvent(event.event_date,event.event_time,event.timezone);
        return new Date(`${event.event_date}T${event.event_time || "23:59"}`).getTime() < Date.now();
    }
    async function loadOwnedEvents() {
        const {data:{session}}=await db.auth.getSession();
        if(!session?.user)return;
        const {data,error}=await db.from("events").select("id,name,user_id,event_date,event_time,timezone,attendance_confirmed").eq("user_id",session.user.id);
        if(error){console.error("❌ Error cargando actividades:",error);return;}
        ownedEvents=(data||[]).filter(isPast);
    }
    function getEventIdFromCard(card) {
        const edit=card.querySelector(".edit-button");
        const onclick=edit?.getAttribute("onclick")||"";
        const match=onclick.match(/openEditModal\((\d+)\)/);
        if(match)return Number(match[1]);
        const attendance=card.querySelector(".attendance-button");
        const id=attendance?.dataset.eventId;
        return id?Number(id):null;
    }
    async function openAttendance(event) {
        const {data:rows,error}=await db.from("event_participants").select("user_id,player_name,attended").eq("event_id",event.id).order("player_name",{ascending:true});
        if(error){console.error("❌ Error cargando participantes:",error);alert("No se pudieron cargar los participantes.");return;}
        const confirmed=event.attendance_confirmed===true;
        const modal=document.createElement("div");
        modal.className="attendance-modal";
        modal.innerHTML=`<div class="attendance-panel"><h2>👥 Confirmar asistencia</h2><div class="attendance-subtitle">${esc(event.name)}<br>Marca solamente a quienes <strong>NO asistieron</strong>.</div><div class="attendance-list">${rows.length?rows.map(row=>`<label class="attendance-row"><input type="checkbox" data-user-id="${esc(row.user_id)}" ${confirmed&&row.attended===false?"checked":""}><span>${esc(row.player_name||"Jugador")}</span></label>`).join(""):"<div style='color:#aaa;padding:10px 0'>No hubo participantes.</div>"}</div><div class="attendance-actions"><button type="button" class="attendance-cancel">Cancelar</button><button type="button" class="attendance-save">Guardar asistencia</button></div></div>`;
        document.body.appendChild(modal);
        const close=()=>modal.remove();
        modal.querySelector(".attendance-cancel").addEventListener("click",close);
        modal.addEventListener("click",e=>{if(e.target===modal)close();});
        modal.querySelector(".attendance-save").addEventListener("click",async()=>{
            const button=modal.querySelector(".attendance-save");button.disabled=true;button.textContent="Guardando...";
            for(const input of [...modal.querySelectorAll("input[data-user-id]")]){
                const {error}=await db.from("event_participants").update({attended:!input.checked}).eq("event_id",event.id).eq("user_id",input.dataset.userId);
                if(error){console.error("❌ Error guardando asistencia:",error);alert("No se pudo guardar la asistencia.");button.disabled=false;button.textContent="Guardar asistencia";return;}
            }
            const {error}=await db.from("events").update({attendance_confirmed:true}).eq("id",event.id);
            if(error){console.error("❌ Error confirmando actividad:",error);alert("Se guardaron los asistentes, pero no se pudo confirmar la actividad.");button.disabled=false;button.textContent="Guardar asistencia";return;}
            event.attendance_confirmed=true;close();injectButtons();
        });
    }
    function injectButtons() {
        const list=document.getElementById("eventsList");
        if(!list||!ownedEvents.length||typeof currentUser==="undefined"||!currentUser)return;
        list.querySelectorAll(".event-card").forEach(card=>{
            const eventId=getEventIdFromCard(card);if(eventId===null)return;
            const event=ownedEvents.find(e=>e.id===eventId);if(!event||event.user_id!==currentUser.id||!isPast(event))return;
            const actions=card.querySelector(".event-actions");if(!actions)return;
            let button=card.querySelector(".attendance-button");
            if(!button){button=document.createElement("button");button.type="button";button.className="attendance-button";actions.appendChild(button);}
            button.dataset.eventId=String(event.id);button.dataset.attendanceVersion="3";button.textContent=event.attendance_confirmed?"✏️ Editar asistencia":"👥 Confirmar asistencia";
            if(button.dataset.attendanceBound!=="true"){
                button.dataset.attendanceBound="true";
                button.addEventListener("click",()=>openAttendance(event));
            }
        });
    }
    async function start(){
        await loadOwnedEvents();injectButtons();
        const list=document.getElementById("eventsList");
        if(list&&!observerStarted){observerStarted=true;new MutationObserver(()=>requestAnimationFrame(injectButtons)).observe(list,{childList:true,subtree:true});}
    }
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
