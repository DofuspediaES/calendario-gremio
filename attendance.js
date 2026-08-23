(function () {
    "use strict";

    const SUPABASE_URL = "https://nmmetzityubqbrbpibee.supabase.co";
    const SUPABASE_KEY = "sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";
    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    let ownedEvents = [];
    let observerStarted = false;

    function esc(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function isPast(event) {
        if (typeof window.isPastEvent === "function") return window.isPastEvent(event.event_date, event.event_time, event.timezone);
        return new Date(`${event.event_date}T${event.event_time || "23:59"}`).getTime() < Date.now();
    }

    async function loadOwnedEvents() {
        const { data: { session } } = await db.auth.getSession();
        if (!session?.user) return;
        const { data, error } = await db.from("events").select("id,name,user_id,event_date,event_time,timezone,attendance_confirmed").eq("user_id", session.user.id);
        if (error) {
            console.error("❌ Error cargando actividades del creador:", error);
            return;
        }
        ownedEvents = (data || []).filter(isPast);
    }

    function findEventForCard(card) {
        const text = card.innerText || "";
        return ownedEvents.find(event => event.name && text.includes(event.name));
    }

    async function openAttendance(event) {
        const { data: rows, error } = await db.from("event_participants").select("user_id,player_name,attended").eq("event_id", event.id).order("player_name", { ascending: true });
        if (error) {
            console.error("❌ Error cargando participantes:", error);
            alert("No se pudieron cargar los participantes.");
            return;
        }

        const isConfirmed = event.attendance_confirmed === true;
        const modal = document.createElement("div");
        modal.className = "attendance-modal";
        modal.innerHTML = `<div class="attendance-panel"><h2>👥 Confirmar asistencia</h2><div class="attendance-subtitle">${esc(event.name)}<br>Marca solamente a quienes <strong>NO asistieron</strong>.</div><div class="attendance-list">${rows.length ? rows.map(row => `<label class="attendance-row"><input type="checkbox" data-user-id="${esc(row.user_id)}" ${isConfirmed && row.attended === false ? "checked" : ""}><span>${esc(row.player_name || "Jugador")}</span></label>`).join("") : `<div style="color:#aaa;padding:10px 0">No hubo participantes.</div>`}</div><div class="attendance-actions"><button type="button" class="attendance-cancel">Cancelar</button><button type="button" class="attendance-save">Guardar asistencia</button></div></div>`;
        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector(".attendance-cancel").addEventListener("click", close);
        modal.addEventListener("click", e => { if (e.target === modal) close(); });

        modal.querySelector(".attendance-save").addEventListener("click", async () => {
            const button = modal.querySelector(".attendance-save");
            button.disabled = true;
            button.textContent = "Guardando...";
            let failed = false;

            for (const input of [...modal.querySelectorAll("input[data-user-id]")]) {
                const { error: updateError } = await db.from("event_participants").update({ attended: !input.checked }).eq("event_id", event.id).eq("user_id", input.dataset.userId);
                if (updateError) {
                    console.error("❌ Error guardando asistencia:", updateError);
                    failed = true;
                    break;
                }
            }

            if (failed) {
                alert("No se pudo guardar la asistencia. Revisa los permisos de Supabase.");
                button.disabled = false;
                button.textContent = "Guardar asistencia";
                return;
            }

            const { error: confirmError } = await db.from("events").update({ attendance_confirmed: true }).eq("id", event.id);
            if (confirmError) {
                console.error("❌ Error confirmando la actividad:", confirmError);
                button.disabled = false;
                button.textContent = "Guardar asistencia";
                return;
            }

            event.attendance_confirmed = true;
            close();
        });
    }

    function injectButtons() {
        const list = document.getElementById("eventsList");
        if (!list || !ownedEvents.length) return;

        list.querySelectorAll(".event-card").forEach(card => {
            const event = findEventForCard(card);
            if (!event) return;

            const existing = card.querySelector(".attendance-button");
            if (existing) {
                const label = event.attendance_confirmed ? "✏️ Editar asistencia" : "👥 Confirmar asistencia";
                if (existing.textContent !== label) existing.textContent = label;
                if (existing.dataset.attendanceBound !== "true") {
                    existing.dataset.attendanceBound = "true";
                    existing.addEventListener("click", () => openAttendance(event));
                }
                return;
            }

            const actions = card.querySelector(".event-actions");
            if (!actions) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "attendance-button";
            button.dataset.attendanceBound = "true";
            button.textContent = event.attendance_confirmed ? "✏️ Editar asistencia" : "👥 Confirmar asistencia";
            button.addEventListener("click", () => openAttendance(event));
            actions.appendChild(button);
        });
    }

    async function start() {
        await loadOwnedEvents();
        injectButtons();

        const list = document.getElementById("eventsList");
        if (list && !observerStarted) {
            observerStarted = true;
            new MutationObserver(() => {
                // Deja que el render de la página termine antes de revisar las tarjetas.
                requestAnimationFrame(injectButtons);
            }).observe(list, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
})();
