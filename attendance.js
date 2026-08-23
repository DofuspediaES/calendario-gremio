(function () {
    "use strict";

    function getEvent(eventId) {
        return Array.isArray(window.__calendarEvents) ? window.__calendarEvents.find(e => e.id === eventId) : null;
    }

    function escapeText(value) {
        return String(value ?? "");
    }

    async function openAttendanceModal(eventId) {
        const event = getEvent(eventId);
        if (!event || !window.currentUser) return;

        const { data: rows, error } = await window.supabaseClient
            .from("event_participants")
            .select("id,user_id,player_name,attended")
            .eq("event_id", eventId)
            .order("joined_at", { ascending: true });

        if (error) {
            console.error("Error cargando asistencia:", error);
            alert("No se pudieron cargar los participantes.");
            return;
        }

        const modal = document.createElement("div");
        modal.className = "attendance-modal";
        modal.innerHTML = `
            <div class="attendance-panel">
                <h2>✅ Confirmar asistencia</h2>
                <div class="attendance-subtitle">${escapeText(event.name)} · Marca quién realmente asistió.</div>
                <div class="attendance-list">
                    ${rows.length ? rows.map(row => `
                        <label class="attendance-row">
                            <input type="checkbox" data-user-id="${escapeText(row.user_id)}" ${row.attended ? "checked" : ""}>
                            <span>${escapeText(row.player_name || "Jugador")}</span>
                        </label>
                    `).join("") : `<div style="color:#aaa;padding:10px 0">No hubo participantes.</div>`}
                </div>
                <div class="attendance-actions">
                    <button type="button" class="attendance-cancel">Cancelar</button>
                    <button type="button" class="attendance-save">Guardar asistencia</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector(".attendance-cancel").addEventListener("click", close);
        modal.addEventListener("click", e => {
            if (e.target === modal) close();
        });

        modal.querySelector(".attendance-save").addEventListener("click", async () => {
            const saveButton = modal.querySelector(".attendance-save");
            saveButton.disabled = true;
            saveButton.textContent = "Guardando...";

            const attendedUserIds = [...modal.querySelectorAll("input[type=checkbox]:checked")]
                .map(input => input.dataset.userId);

            const { error: saveError } = await window.supabaseClient.rpc(
                "mark_event_attendance",
                {
                    p_event_id: eventId,
                    p_attended_user_ids: attendedUserIds
                }
            );

            if (saveError) {
                console.error("Error guardando asistencia:", saveError);
                alert(saveError.message || "No se pudo guardar la asistencia.");
                saveButton.disabled = false;
                saveButton.textContent = "Guardar asistencia";
                return;
            }

            close();
            if (typeof window.loadEvents === "function") {
                await window.loadEvents();
            } else if (typeof window.renderEvents === "function") {
                window.renderEvents();
            }
        });
    }

    function injectButtons() {
        const list = document.getElementById("eventsList");
        if (!list || !Array.isArray(window.__calendarEvents) || !window.currentUser) return;

        list.querySelectorAll(".event-card").forEach(card => {
            const eventId = Number(card.dataset.eventId);
            if (!eventId || card.querySelector(".attendance-button")) return;

            const event = getEvent(eventId);
            if (!event || event.user_id !== window.currentUser.id) return;

            const past = typeof window.isPastEvent === "function"
                ? window.isPastEvent(event.event_date, event.event_time, event.timezone)
                : false;

            if (!past) return;

            const actions = card.querySelector(".event-actions");
            if (!actions) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "attendance-button";
            button.textContent = "✅ Confirmar asistencia";
            button.addEventListener("click", () => openAttendanceModal(eventId));
            actions.appendChild(button);
        });
    }

    window.openAttendanceModal = openAttendanceModal;
    window.addEventListener("calendar-events-ready", injectButtons);

    const observer = new MutationObserver(injectButtons);
    document.addEventListener("DOMContentLoaded", () => {
        const list = document.getElementById("eventsList");
        if (list) observer.observe(list, { childList: true, subtree: true });
        setTimeout(injectButtons, 500);
        setTimeout(injectButtons, 1500);
    });
})();
