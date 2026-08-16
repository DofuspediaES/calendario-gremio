// ============================================
// CALENDARIO DEL GREMIO
// ============================================


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL = "https://nmmetzityubqbrbpibee.supabase.co";
const SUPABASE_KEY = "TU_SUPABASE_KEY_AQUI"; 

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,      // Mantiene la sesión guardada en el navegador
            autoRefreshToken: true,    // Renueva el token automáticamente
            detectSessionInUrl: true   // Captura el token cuando regresas de Discord OAuth
        }
    }
);


// ============================================
// ELEMENTOS DEL DOM
// ============================================

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const previousMonthButton = document.getElementById("previousMonth");
const nextMonthButton = document.getElementById("nextMonth");
const todayButton = document.getElementById("todayButton");
const timezoneName = document.getElementById("timezoneName");
const eventsList = document.getElementById("eventsList");
const addEventButton = document.getElementById("addEventButton");
const eventModal = document.getElementById("eventModal");
const closeModal = document.getElementById("closeModal");
const eventForm = document.getElementById("eventForm");
const notificationButton = document.getElementById("notificationButton");
const changeNameButton = document.getElementById("changeNameButton");


// ============================================
// VARIABLES GLOBALES
// ============================================

let currentDate = new Date();
let events = [];
let participants = [];
let currentUser = null;
let currentProfile = null;
let editingEventId = null;

// ============================================
// FILTROS GLOBALES
// ============================================

let currentViewFilter = "upcoming"; // 'upcoming', 'my_events', 'past'
let currentCategoryFilter = "all";  // 'all', 'raid', 'dungeon', 'quest', etc.


// Comprueba si la fecha y hora del evento ya pasaron respecto al momento actual
function isPastEvent(eventDate, eventTime) {
    if (!eventDate) return false;
    const eventTimeStr = eventTime || "23:59";
    const eventDateTime = new Date(`${eventDate}T${eventTimeStr}`);
    return eventDateTime < new Date();
}


// ============================================
// ZONA HORARIA
// ============================================

function getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function showTimezone() {
    if (timezoneName) {
        timezoneName.textContent = getTimezone();
    }
}


// ============================================
// USUARIO / SESIÓN
// ============================================

async function loginAnonymous() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (sessionData && sessionData.session && sessionData.session.user) {
        currentUser = sessionData.session.user;
        console.log("Sesión existente:", currentUser.id);
        return true;
    }

    const { data, error } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error("Error iniciando sesión:", error);
        alert("No se pudo conectar con Supabase.");
        return false;
    }

    currentUser = data.user;
    console.log("Nuevo usuario:", currentUser.id);
    return true;
}


// ============================================
// CARGAR PERFIL
// ============================================

async function loadProfile() {
    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Error cargando perfil:", error);
        return;
    }

    if (!data) {
        const playerName = prompt("¿Cuál es tu nombre dentro del gremio?");

        if (!playerName || !playerName.trim()) {
            alert("Necesitas poner un nombre.");
            return;
        }

        const cleanName = playerName.trim();

        const { data: newProfile, error: createError } = await supabaseClient
            .from("profiles")
            .insert({
                id: currentUser.id,
                player_name: cleanName
            })
            .select()
            .single();

        if (createError) {
            console.error("Error creando perfil:", createError);
            return;
        }

        currentProfile = newProfile;
    } else {
        currentProfile = data;
    }

    updateProfileDisplay();
}


// ============================================
// MOSTRAR NOMBRE DEL JUGADOR
// ============================================

function updateProfileDisplay() {
    const display = document.getElementById("playerNameDisplay");
    if (!display || !currentProfile) return;

    display.textContent = `👤 ${currentProfile.player_name}`;
}


// ============================================
// CAMBIAR NOMBRE
// ============================================

async function changePlayerName() {
    if (!currentUser || !currentProfile) return;

    const newName = prompt("Nuevo nombre del jugador:", currentProfile.player_name);
    if (!newName || !newName.trim()) return;

    const cleanName = newName.trim();

    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            player_name: cleanName,
            updated_at: new Date().toISOString()
        })
        .eq("id", currentUser.id)
        .select()
        .single();

    if (error) {
        console.error("Error cambiando nombre:", error);
        alert("No se pudo cambiar el nombre.");
        return;
    }

    currentProfile = data;
    updateProfileDisplay();
}


// ============================================
// NOTIFICACIONES PUSH & VAPID
// ============================================

const VAPID_PUBLIC_KEY = "BOK3lrJGlltGR-5pN81n13l4t9u0cvvrphSXQ6VyjExqv2cEOtuymqqJcwSaHsiw0-4s4I3miJGA16EeoXX6bm0";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function updateNotificationButton() {
    if (!notificationButton) return;

    if (!("Notification" in window)) {
        notificationButton.textContent = "❌ No compatible";
        notificationButton.disabled = true;
        return;
    }

    if (Notification.permission === "granted") {
        notificationButton.textContent = "🔔 Notificaciones activadas";
        return;
    }

    if (Notification.permission === "denied") {
        notificationButton.textContent = "🚫 Notificaciones bloqueadas";
        return;
    }

    notificationButton.textContent = "🔔 Activar notificaciones";
}


// ============================================
// GUARDAR SUSCRIPCIÓN EN SUPABASE
// ============================================

async function subscribeToPush() {
    if (!("serviceWorker" in navigator) || !currentUser) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });
        }

        const jsonSub = subscription.toJSON();

        const { error } = await supabaseClient
            .from("push_subscriptions")
            .upsert({
                user_id: currentUser.id,
                endpoint: jsonSub.endpoint,
                p256dh: jsonSub.keys ? jsonSub.keys.p256dh : "",
                auth: jsonSub.keys ? jsonSub.keys.auth : "",
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id, endpoint"
            });

        if (error) {
            console.error("Error guardando suscripción en Supabase:", error);
        } else {
            console.log("Suscripción Push guardada correctamente en Supabase.");
        }

    } catch (err) {
        console.error("Error al suscribir a notificaciones Push:", err);
    }
}

async function enableNotifications() {
    if (!("Notification" in window)) {
        alert("Tu navegador no soporta notificaciones.");
        return;
    }

    if (Notification.permission === "granted") {
        alert("✅ Las notificaciones ya están activadas en este navegador.");
        await subscribeToPush();
        return;
    }

    if (Notification.permission === "denied") {
        alert("🚫 Las notificaciones están bloqueadas en tu navegador.\n\nPara activarlas, debes hacer clic en el candado 🔒 al lado de la URL y permitir los permisos de Notificaciones.");
        updateNotificationButton();
        return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        updateNotificationButton();
        await subscribeToPush();
        alert("🔔 ¡Perfecto! Las notificaciones se han activado con éxito.");
    } else {
        updateNotificationButton();
        alert("⚠️ No se pudieron activar las notificaciones porque se rechazó el permiso.");
    }
}


// ============================================
// CARGAR EVENTOS
// ============================================

async function loadEvents() {
    console.time("⏱️ loadEvents");

    // 1. CARGAR DESDE CACHÉ (instantáneo)
    const cached = localStorage.getItem("events");
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                events = parsed;
                console.log("📦 Cargado desde caché:", events.length, "eventos");
                await loadParticipants();
                renderCalendar();
                renderEvents();
            }
        } catch (e) {
            console.warn("Caché corrupto, ignorando...");
        }
    }

    // 2. CARGAR DESDE SUPABASE (actualiza en segundo plano)
    const { data, error } = await supabaseClient
        .from("events")
        .select("*")
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

    if (error) {
        console.error("Error cargando eventos:", error);
        return;
    }

    // 3. ACTUALIZAR VARIABLES Y GUARDAR CACHÉ
    events = data || [];
    await loadParticipants();
    renderCalendar();
    renderEvents();

    // Guardar en localStorage para la próxima vez
    localStorage.setItem("events", JSON.stringify(events));
    console.log("💾 Caché guardado:", events.length, "eventos");

    console.timeEnd("⏱️ loadEvents");
}


// ============================================
// CARGAR PARTICIPANTES
// ============================================

async function loadParticipants() {
    const { data, error } = await supabaseClient
        .from("event_participants")
        .select("*");

    if (error) {
        console.error("Error cargando participantes:", error);
        return;
    }

    participants = data || [];
}


// ============================================
// FORMATOS Y FUNCIONES AUXILIARES
// ============================================

function formatDate(date) {
    return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatTime(time) {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ============================================
// EMOJIS / ÍCONOS DE ACTIVIDAD
// ============================================

function getEventIcon(type) {
    const icons = {
        dungeon: "🗝️",
        quest: "🗺️",
        infinite_dreams: "🌀",
        commission: "📦",
        raid: "⚔️",
        farm: "💰",
        wanted: "📜",
        other: "🎲"
    };
    return icons[type] || "🎲";
}

function getEventParticipants(eventId) {
    return participants.filter(participant => participant.event_id === eventId);
}

function isJoined(eventId) {
    if (!currentUser) return false;
    return participants.some(
        participant => participant.event_id === eventId && participant.user_id === currentUser.id
    );
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// ============================================
// RENDERIZAR CALENDARIO
// ============================================

function renderCalendar() {
    if (!calendar) return;

    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();
    if (startDay === 0) startDay = 7;

    // DÍAS VACÍOS
    for (let i = 1; i < startDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "day empty";
        calendar.appendChild(emptyDay);
    }

    // DÍAS DEL MES
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "day";

        const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const today = new Date();
        if (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        ) {
            dayElement.classList.add("today");
        }

        const dayNumber = document.createElement("div");
        dayNumber.className = "day-number";
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        const dayEvents = events.filter(event => event.event_date === dateString);

        dayEvents.forEach(event => {
            const eventElement = document.createElement("div");
            eventElement.className = `calendar-event ${event.type}`;
            eventElement.innerHTML = `
                <span class="event-time">
                    ${formatTime(event.event_time)}
                </span>
                ${getEventIcon(event.type)}
                ${escapeHTML(event.name)}
            `;
            dayElement.appendChild(eventElement);
        });

        calendar.appendChild(dayElement);
    }

    if (monthTitle) {
        monthTitle.textContent = currentDate.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric"
        });
    }
}


// ============================================
// MOSTRAR TARJETAS DE EVENTOS (CON FILTROS)
// ============================================

const EVENT_TYPE_NAMES = {
    dungeon: "Mazmorra",
    quest: "Misión",
    infinite_dreams: "Sueños Infinitos",
    commission: "Encargo de gremio",
    raid: "Raid",
    farm: "Farm / Drop",
    wanted: "Busca y Captura (ByC)",
    other: "Otros"
};

function renderEvents() {
    if (!eventsList) return;
    eventsList.innerHTML = "";

    const filteredEvents = events.filter(event => {
        const isPast = isPastEvent(event.event_date, event.event_time);

        if (currentViewFilter === "upcoming" && isPast) return false;
        if (currentViewFilter === "past" && !isPast) return false;
        if (currentViewFilter === "my_events" && (!isJoined(event.id) || isPast)) return false;

        if (currentCategoryFilter !== "all" && event.type !== currentCategoryFilter) {
            return false;
        }

        return true;
    });

    if (filteredEvents.length === 0) {
        let emptyMessage = "No hay eventos en esta categoría.";
        if (currentViewFilter === "my_events") emptyMessage = "No te has apuntado a ningún evento próximo.";
        if (currentViewFilter === "past") emptyMessage = "No hay eventos pasados en el historial.";

        eventsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888;">
                <p style="font-size: 1.1rem;">${emptyMessage}</p>
            </div>
        `;
        return;
    }

    filteredEvents.forEach(event => {
        const card = document.createElement("div");

        const eventType = event.type || "other";
        card.className = `event-card ${eventType} type-${eventType}`;

        const isPast = isPastEvent(event.event_date, event.event_time);
        if (isPast) {
            card.classList.add("event-past");
        }

        const eventParticipants = getEventParticipants(event.id);
        const count = eventParticipants.length;
        const joined = isJoined(event.id);
        const isCreator = currentUser && event.user_id === currentUser.id;

        let participantHTML = "";
        eventParticipants.forEach(participant => {
            participantHTML += `
                <div class="participant">
                    ✅ ${escapeHTML(participant.player_name || "Jugador")}
                </div>
            `;
        });

        if (eventParticipants.length === 0) {
            participantHTML = `<div class="no-participants">Todavía nadie se ha apuntado.</div>`;
        }

        let buttonHTML;
        if (isPast) {
            buttonHTML = `<button class="full-button" disabled style="opacity: 0.6;">🏁 Evento Finalizado</button>`;
        } else if (joined) {
            buttonHTML = `<button class="leave-button" onclick="leaveEvent(${event.id})">🔴 Retirarme</button>`;
        } else if (count >= event.capacity) {
            buttonHTML = `<button class="full-button" disabled>🚫 Completo</button>`;
        } else {
            buttonHTML = `<button class="join-button" onclick="joinEvent(${event.id})">🟢 Apuntarme</button>`;
        }

        let creatorButtonsHTML = "";
        if (isCreator && !isPast) {
            creatorButtonsHTML = `
                <div class="creator-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="edit-button" onclick="openEditModal(${event.id})" style="background-color: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        ✏️ Editar
                    </button>
                    <button class="delete-button" onclick="deleteEvent(${event.id})" style="background-color: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        🗑️ Eliminar
                    </button>
                </div>
            `;
        }

        const typeLabel = EVENT_TYPE_NAMES[eventType] || eventType;

        card.innerHTML = `
            <div class="event-card-header">
                <div>
                    <span class="event-type-badge ${eventType}">
                        ${getEventIcon(event.type)} ${typeLabel}
                    </span>
                    <h3>
                        ${escapeHTML(event.name)}
                    </h3>
                    <div class="event-info">
                        📅 ${formatDate(new Date(`${event.event_date}T12:00:00`))} &nbsp;&nbsp;
                        🕐 ${formatTime(event.event_time)}
                    </div>
                </div>
                <div class="capacity">
                    👥 ${count}/${event.capacity}
                </div>
            </div>

            <div class="event-info">
                ${escapeHTML(event.description || "")}
            </div>

            <div class="participants-box">
                <strong>👥 Participantes</strong>
                <div class="participants-list">
                    ${participantHTML}
                </div>
            </div>

            <div class="event-actions">
                ${buttonHTML}
                ${creatorButtonsHTML}
            </div>
        `;

        eventsList.appendChild(card);
    });
}


// ============================================
// APUNTARSE A UN EVENTO
// ============================================

async function joinEvent(eventId) {
    if (!currentUser) {
        alert("No estás conectado.");
        return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const currentParticipants = getEventParticipants(eventId);

    if (currentParticipants.length >= event.capacity) {
        alert("Este evento está completo.");
        return;
    }

    if (isJoined(eventId)) {
        alert("Ya estás apuntado.");
        return;
    }

    const playerName = currentProfile?.player_name ||
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.username ||
        "Jugador";

    const { error } = await supabaseClient
        .from("event_participants")
        .insert({
            event_id: eventId,
            user_id: currentUser.id,
            player_name: playerName
        });

    if (error) {
        console.error("Error apuntándose:", error);
        alert("No se pudo apuntar. Revisa la consola.");
        return;
    }

    await loadEvents();
}


// ============================================
// ELIMINAR UN EVENTO
// ============================================

async function deleteEvent(eventId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este evento?")) {
        return;
    }

    await supabaseClient
        .from("event_participants")
        .delete()
        .eq("event_id", eventId);

    const { error } = await supabaseClient
        .from("events")
        .delete()
        .eq("id", eventId);

    if (error) {
        console.error("Error eliminando evento:", error);
        alert("No se pudo eliminar el evento.");
        return;
    }

    await loadEvents();
}


// ============================================
// ABRIR MODAL PARA EDITAR EVENTO
// ============================================

function openEditModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    editingEventId = eventId;

    document.getElementById("eventName").value = event.name;
    document.getElementById("eventType").value = event.type;
    document.getElementById("eventDate").value = event.event_date;
    document.getElementById("eventTime").value = event.event_time;
    document.getElementById("eventCapacity").value = event.capacity;
    document.getElementById("eventDescription").value = event.description || "";

    const modalTitle = eventModal.querySelector("h2");
    if (modalTitle) modalTitle.textContent = "✏️ Editar Evento";

    eventModal.classList.remove("hidden");
}


// ============================================
// RETIRARSE DE UN EVENTO
// ============================================

async function leaveEvent(eventId) {
    if (!currentUser) return;

    const { error } = await supabaseClient
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Error retirándose:", error);
        alert("No se pudo retirar la inscripción.");
        return;
    }

    await loadEvents();
}


// ============================================
// LISTENERS / EVENTOS
// ============================================

if (changeNameButton) {

    changeNameButton.addEventListener(
        "click",
        changePlayerName
    );

}

// ============================================
// BOTÓN DISCORD
// ============================================

const discordButton =
    document.getElementById(
        "discordButton"
    );


// ============================================
// ID DE TU APLICACIÓN DISCORD
// ============================================

const DISCORD_CLIENT_ID =
    "1538010946130419762";


// ============================================
// URL DE RETORNO DE DISCORD
// ============================================

const DISCORD_REDIRECT_URI =
    "https://dofuspediaes.github.io/calendario-gremio/";


// ============================================
// CONECTAR DISCORD
// ============================================

function connectDiscord() {

    const discordURL =
        "https://discord.com/oauth2/authorize" +
        "?client_id=" +
        encodeURIComponent(
            DISCORD_CLIENT_ID
        ) +
        "&response_type=code" +
        "&redirect_uri=" +
        encodeURIComponent(
            DISCORD_REDIRECT_URI
        ) +
        "&scope=identify";

    window.location.href =
        discordURL;

}

// ============================================
// PROCESAR REGRESO DE DISCORD
// ============================================

async function processDiscordCallback() {

    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    const code =
        urlParams.get("code");


    if (!code) {

        return;

    }


    console.log(
        "Código de Discord recibido."
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "discord-oauth",
                {

                    body: {

                        code:
                            code

                    }

                }
            );


        if (error) {

            console.error(
                "Error OAuth Discord:",
                error
            );


            alert(
                "No se pudo conectar Discord."
            );


            return;

        }


        if (
            !data ||
            !data.success
        ) {

            console.error(
                data
            );


            alert(
                "Discord no pudo ser conectado."
            );


            return;

        }


        console.log(
            "Discord conectado:",
            data.discord
        );


        // ====================================
        // GUARDAR DISCORD EN PERFIL
        // ====================================

        const {
            error:
                profileError
        } =
            await supabaseClient
                .from("profiles")
                .update({

                    discord_id:
                        data.discord.id,

                    discord_username:
                        data.discord.global_name ||
                        data.discord.username

                })
                .eq(
                    "id",
                    currentUser.id
                );


        if (profileError) {

            console.error(
                "Error guardando Discord:",
                profileError
            );


            alert(
                "Discord se conectó, pero no se pudo guardar en tu perfil."
            );


            return;

        }


        // ====================================
        // ACTUALIZAR BOTÓN
        // ====================================

        if (discordButton) {

            discordButton.textContent =
                `🎮 ${data.discord.global_name || data.discord.username}`;

            discordButton.classList.add(
                "discord-connected"
            );

        }


        // ====================================
        // LIMPIAR URL
        // ====================================

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );


        alert(
            "✅ Discord conectado correctamente."
        );


    } catch (error) {

        console.error(
            "Error conectando Discord:",
            error
        );


        alert(
            "Ocurrió un error al conectar Discord."
        );

    }

}


// ============================================
// CLICK EN BOTÓN
// ============================================

if (discordButton) {

    discordButton.addEventListener(
        "click",
        connectDiscord
    );

}


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        enableNotifications
    );

}


if (previousMonthButton) {

    previousMonthButton.addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );

            renderCalendar();

        }
    );

}


if (nextMonthButton) {

    nextMonthButton.addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );

            renderCalendar();

        }
    );

}


if (todayButton) {

    todayButton.addEventListener(
        "click",
        () => {

            currentDate =
                new Date();

            renderCalendar();

        }
    );

}


if (addEventButton) {

    addEventButton.addEventListener(
        "click",
        () => {

            editingEventId = null;
            eventForm.reset();

            // --- INICIO DE LA MODIFICACIÓN ---
            // Obtener la fecha de hoy en formato AAAA-MM-DD
            const todayStr = new Date().toISOString().split('T')[0];
            const eventDateInput = document.getElementById('eventDate');
            
            if (eventDateInput) {
                // Bloquea los días pasados en el calendario visual
                eventDateInput.min = todayStr;
                // Asigna por defecto la fecha de hoy
                eventDateInput.value = todayStr;
            }
            // --- FIN DE LA MODIFICACIÓN ---

            const modalTitle = eventModal.querySelector("h2");
            if (modalTitle) modalTitle.textContent = "➕ Crear Evento";

            eventModal.classList.remove(
                "hidden"
            );

        }
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        () => {

            eventModal.classList.add(
                "hidden"
            );

        }
    );

}


if (eventModal) {

    eventModal.addEventListener(
        "click",
        event => {

            if (
                event.target === eventModal
            ) {

                eventModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


if (eventForm) {

    eventForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            // ========================================
            // COMPROBAR USUARIO
            // ========================================

            if (!currentUser) {

                alert(
                    "Todavía no estás conectado."
                );

                return;

            }


            // ========================================
            // OBTENER DATOS
            // ========================================

            const name =
                document.getElementById(
                    "eventName"
                ).value;


            const type =
                document.getElementById(
                    "eventType"
                ).value;


            const date =
                document.getElementById(
                    "eventDate"
                ).value;


            const time =
                document.getElementById(
                    "eventTime"
                ).value;


            const capacity =
                Number(
                    document.getElementById(
                        "eventCapacity"
                    ).value
                );


            const description =
                document.getElementById(
                    "eventDescription"
                ).value;


            // ========================================
            // VALIDAR FECHA Y HORA
            // ========================================

            const selectedDateTime =
                new Date(`${date}T${time}`);


            const currentDateTime =
                new Date();


            if (
                selectedDateTime <
                currentDateTime
            ) {

                alert(
                    "⚠️ No puedes programar una actividad en una fecha u hora que ya ha pasado."
                );

                return;

            }


// ========================================
// DATOS DEL EVENTO
// ========================================

const eventData = {

    user_id:
        currentUser.id,

    name:
        name,

    type:
        type,

    event_date:
        date,

    event_time:
        time,

    timezone:
        getTimezone(),

    capacity:
        capacity,

    description:
        description

};


// ========================================
// VARIABLE DE RESULTADO
// ========================================

let savedEvent = null;

let error = null;


// ========================================
// CREAR / EDITAR
// ========================================

// (Nota: se eliminaron las declaraciones duplicadas de error y savedEvent que tenías abajo)

// ============================================
// EDITAR EVENTO
// ============================================

if (editingEventId) {

    const res =
        await supabaseClient
            .from("events")
            .update(eventData)
            .eq(
                "id",
                editingEventId
            )
            .select()
            .single();


    error =
        res.error;


    savedEvent =
        res.data;

}


// ============================================
// CREAR EVENTO
// ============================================

else {

    const res =
        await supabaseClient
            .from("events")
            .insert(
                eventData
            )
            .select()
            .single();


    error =
        res.error;


    savedEvent =
        res.data;

}


// ========================================
// ERROR SUPABASE
// ========================================

if (error) {

    console.error(
        "Error guardando evento:",
        error
    );


    alert(
        "No se pudo guardar el evento."
    );


    return;

}


// ============================================
// PUBLICAR EN DISCORD
// ============================================

if (
    savedEvent &&
    !editingEventId
) {

    try {

        const {
            data:
                discordData,
            error:
                discordError
        } =
            await supabaseClient
                .functions
                .invoke(
                    "discord-event",
                    {

                        body:
                            savedEvent

                    }
                );


        if (discordError) {

            console.error(
                "Error enviando a Discord:",
                discordError
            );

            alert(
                "⚠️ La actividad se creó, pero no pudo publicarse en Discord."
            );

        }

        else if (
            discordData &&
            discordData.success
        ) {

            // ==================================
            // GUARDAR ID DEL MENSAJE DISCORD
            // ==================================

            await supabaseClient
                .from("events")
                .update({

                    discord_message_id:
                        discordData.message_id,

                    discord_channel_id:
                        discordData.channel_id

                })
                .eq(
                    "id",
                    savedEvent.id
                );


            console.log(
                "✅ Actividad publicada en Discord."
            );

        }

    } catch (discordError) {

        console.error(
            "Error Discord:",
            discordError
        );

    }

}


// ========================================
// LIMPIAR
// ========================================

editingEventId =
    null;


eventForm.reset();


eventModal.classList.add(
    "hidden"
);


// ========================================
// RECARGAR EVENTOS
// ========================================

await loadEvents();

        }
    );

}

// Pestañas de Vista (Próximos / Mis Eventos / Histórico)
document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", event => {
        document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
        event.target.classList.add("active");

        currentViewFilter = event.target.dataset.view;
        renderEvents();
    });
});

// Selector de Categoría (Raids, Mazmorras, etc.)
const categoryFilterSelect = document.getElementById("categoryFilterSelect");
if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener("change", event => {
        currentCategoryFilter = event.target.value;
        renderEvents();
    });
}


// ============================================
// REGISTRO DE SERVICE WORKER
// ============================================

if ("serviceWorker" in navigator) {

    navigator.serviceWorker
        .register("sw.js")
        .then(registration => {

            console.log(
                "Service Worker registrado con éxito:",
                registration.scope
            );

        })
        .catch(error => {

            console.error(
                "Error registrando Service Worker:",
                error
            );

        });

}


// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================

async function startApp() {

    showTimezone();


    const connected =
        await loginAnonymous();


    if (!connected) {

        return;

    }


    await loadProfile();


    // ========================================
    // PROCESAR DISCORD
    // ========================================

    await processDiscordCallback();


    // ========================================
    // CARGAR EVENTOS
    // ========================================

    await loadEvents();
    localStorage.setItem("events", JSON.stringify(events));

}


// ============================================
// EJECUCIÓN AL CARGAR LA PÁGINA
// ============================================

window.addEventListener("DOMContentLoaded", () => {
    startApp();
});


