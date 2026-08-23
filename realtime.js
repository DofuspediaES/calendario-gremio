// ============================================
// SUPABASE REALTIME - CALENDARIO
// Actualiza actividades y participantes sin F5.
// ============================================
(function () {
    "use strict";

    const db = window.supabaseClient || (
        window.supabase?.createClient
            ? window.supabase.createClient(
                "https://nmmetzityubqbrbpibee.supabase.co",
                "sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX"
            )
            : null
    );

    if (!db) {
        console.warn("⚠️ Realtime: cliente Supabase no disponible.");
        return;
    }

    let refreshTimer = null;
    let lastRefresh = 0;

    function scheduleRefresh(reason) {
        const now = Date.now();
        if (now - lastRefresh < 300) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
            lastRefresh = Date.now();
            try {
                console.log("🔄 Realtime: actualización por", reason);
                if (typeof loadEvents === "function") await loadEvents();
            } catch (error) {
                console.error("❌ Realtime no pudo actualizar:", error);
            }
        }, 150);
    }

    const channel = db
        .channel("calendar-live-updates")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "events"
        }, payload => scheduleRefresh(`events/${payload.eventType}`))
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "event_participants"
        }, payload => scheduleRefresh(`event_participants/${payload.eventType}`))
        .subscribe((status, error) => {
            if (status === "SUBSCRIBED") {
                console.log("🟢 Realtime conectado: calendario en vivo.");
            } else if (error) {
                console.error("❌ Error conectando Realtime:", error);
            }
        });

    window.calendarRealtimeChannel = channel;
})();
