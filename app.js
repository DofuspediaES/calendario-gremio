console.log("🔥 APP.JS CARGADO");

// ============================================
// CALENDARIO DEL GREMIO
// ============================================


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL = "https://nmmetzityubqbrbpibee.supabase.co";
const SUPABASE_KEY = "sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX"; 

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
// COMPROBAR SESIÓN AL CARGAR LA PÁGINA (PON ESTO AQUÍ)
// ============================================

const btnConectarDiscord = document.getElementById("discordButton"); // Asegúrate de que este sea el ID de tu botón

supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        console.log("Sesión detectada al recargar:", session.user);
        if (btnConectarDiscord) btnConectarDiscord.style.display = "none";
    } else {
        console.log("No hay sesión activa.");
        if (btnConectarDiscord) btnConectarDiscord.style.display = "block";
    }
});

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (btnConectarDiscord) btnConectarDiscord.style.display = "none";
    } else {
        if (btnConectarDiscord) btnConectarDiscord.style.display = "block";
    }
});


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
const createEventButton = document.getElementById("createEventButton");

if (createEventButton) {
    createEventButton.addEventListener("click", () => {
        console.log("🔥 BOTÓN CREAR ACTIVIDAD PRESIONADO");
        eventForm.dispatchEvent(
            new Event("submit", {
                bubbles: true,
                cancelable: true
            })
        );
    });
}
console.log("🧪 eventForm encontrado:", eventForm);

const submitButtonTest = document.querySelector(
    "#eventForm .submit-button"
);

console.log("🧪 BOTÓN ENCONTRADO:", submitButtonTest);

if (submitButtonTest) {
    submitButtonTest.addEventListener("click", () => {
        console.log("🔥🔥 CLICK DIRECTO EN CREAR ACTIVIDAD");
    });
}

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

// ============================================
// CONTROL DE PESTAÑAS Y FILTROS
// ============================================

document.querySelectorAll(".filter-tab").forEach(tab => {

    tab.addEventListener("click", () => {

        // Cambiar vista
        currentViewFilter = tab.dataset.view;

        // Cambiar apariencia de pestaña activa
        document.querySelectorAll(".filter-tab").forEach(t => {
            t.classList.remove("active");
        });

        tab.classList.add("active");

        // Actualizar lista
        renderEvents();
    });

});


// ============================================
// FILTRO POR TIPO DE ACTIVIDAD
// ============================================

const categoryFilterSelect =
    document.getElementById("categoryFilterSelect");

if (categoryFilterSelect) {

    categoryFilterSelect.addEventListener("change", () => {

        currentCategoryFilter =
            categoryFilterSelect.value;

        renderEvents();

    });

}

// ============================================
// COMPROBAR SI UN EVENTO YA PASÓ
// ============================================

function isPastEvent(
    eventDate,
    eventTime,
    timezone = "America/Bogota"
) {

    if (!eventDate) return false;

    const eventDateTime =
        eventDateTimeToDate(
            eventDate,
            eventTime || "23:59",
            timezone
        );

    if (!eventDateTime) return false;

    return eventDateTime.getTime() <
        Date.now();
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

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Error cargando perfil:",
            error
        );
        return;
    }

    // ========================================
    // PERFIL NO EXISTE
    // ========================================

    if (!data) {
        showFirstLoginModal();
        return;
    }

    // ========================================
    // PERFIL EXISTE
    // ========================================

    currentProfile = data;
    updateProfileDisplay();
}

// ============================================
// PRIMER ACCESO (NUEVO)
// ============================================

function showFirstLoginModal() {
    return new Promise((resolve) => {
        const modal = document.createElement("div");

        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.background = "rgba(0,0,0,0.75)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "99999";

        modal.innerHTML = `
            <div style="
                background:#242424;
                color:white;
                width:90%;
                max-width:420px;
                padding:25px;
                border-radius:12px;
                box-sizing:border-box;
                text-align:center;
                box-shadow:0 10px 40px rgba(0,0,0,.5);
            ">
                <h2 style="
                    margin-top:0;
                    margin-bottom:10px;
                ">
                    👋 Bienvenido
                </h2>

                <p style="
                    color:#ccc;
                    margin-bottom:20px;
                ">
                    ¿Cómo quieres identificarte en el calendario?
                </p>

                <input
                    id="firstLoginName"
                    type="text"
                    placeholder="Tu nombre en el gremio"
                    maxlength="30"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border-radius:6px;
                        border:1px solid #555;
                        background:#181818;
                        color:white;
                        margin-bottom:10px;
                        font-size:14px;
                    "
                >

                <button
                    id="firstLoginContinue"
                    style="
                        width:100%;
                        padding:12px;
                        border:0;
                        border-radius:6px;
                        background:#5865F2;
                        color:white;
                        font-size:14px;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    Continuar
                </button>

                <div style="
                    margin:18px 0;
                    color:#777;
                ">
                    ─────────── O ───────────
                </div>

                <button
                    id="firstLoginDiscord"
                    style="
                        width:100%;
                        padding:12px;
                        border:0;
                        border-radius:6px;
                        background:#5865F2;
                        color:white;
                        font-size:14px;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    🎮 Continuar con Discord
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        const nameInput = modal.querySelector("#firstLoginName");
        const continueButton = modal.querySelector("#firstLoginContinue");
        const discordButton = modal.querySelector("#firstLoginDiscord");

        // ====================================
        // CONTINUAR CON NOMBRE
        // ====================================

        continueButton.addEventListener(
            "click",
            async () => {
                const playerName = nameInput.value.trim();

                if (!playerName) {
                    alert("Necesitas poner un nombre.");
                    return;
                }

                continueButton.disabled = true;

                const {
                    data: newProfile,
                    error: createError
                } = await supabaseClient
                    .from("profiles")
                    .insert({
                        id: currentUser.id,
                        player_name: playerName
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error("Error creando perfil:", createError);
                    alert("No se pudo crear tu perfil.");
                    continueButton.disabled = false;
                    return;
                }

                currentProfile = newProfile;
                modal.remove();
                updateProfileDisplay();
                resolve();
            }
        );

        // ====================================
        // CONTINUAR CON DISCORD
        // ====================================

        discordButton.addEventListener(
            "click",
            () => {
                sessionStorage.setItem(
                    "discord_first_login",
                    "true"
                );
                connectDiscord();
            }
        );

        // ====================================
        // ENTER EN EL CAMPO
        // ====================================

        nameInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    continueButton.click();
                }
            }
        );

        nameInput.focus();
    });
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

    // 1. CARGAR DESDE CACHÉ
    const cached = localStorage.getItem("events");

    if (cached) {

        try {

            const parsed =
                JSON.parse(cached);

            if (
                Array.isArray(parsed) &&
                parsed.length > 0
            ) {

                events = parsed;

                console.log(
                    "📦 Cargado desde caché:",
                    events.length,
                    "eventos"
                );

                await loadParticipants();

                renderCalendar();
                renderEvents();

            }

        } catch (e) {

            console.warn(
                "Caché corrupto, ignorando..."
            );

        }

    }


    // 2. CARGAR DESDE SUPABASE
    const {
        data,
        error
    } = await supabaseClient

        .from("events")

        .select("*")

        .order(
            "event_date",
            {
                ascending: true
            }
        )

        .order(
            "event_time",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Error cargando eventos:",
            error
        );

        return;

    }


    // 3. ACTUALIZAR EVENTOS
    events =
        data || [];


    // ========================================
    // CARGAR NOMBRES DE LOS CREADORES
    // ========================================

    const creatorIds = [
        ...new Set(
            events
                .map(
                    event =>
                        event.user_id
                )
                .filter(Boolean)
        )
    ];


    if (
        creatorIds.length > 0
    ) {

        const {
            data: profiles,
            error: profilesError
        } = await supabaseClient

            .from("profiles")

            .select(
                "id, player_name"
            )

            .in(
                "id",
                creatorIds
            );


        if (profilesError) {

            console.error(
                "Error cargando creadores:",
                profilesError
            );

        } else {

            const profilesMap = {};


            profiles.forEach(
                profile => {

                    profilesMap[
                        profile.id
                    ] =
                        profile.player_name;

                }
            );


            events.forEach(
                event => {

                    event.creator_name =
                        profilesMap[
                            event.user_id
                        ] ||
                        "Usuario";

                }
            );

        }

    }


    // ========================================
    // CARGAR PARTICIPANTES
    // ========================================

    await loadParticipants();


    // ========================================
    // RENDERIZAR
    // ========================================

    renderCalendar();

    renderEvents();


    // ========================================
    // GUARDAR CACHÉ
    // ========================================

    localStorage.setItem(
        "events",
        JSON.stringify(events)
    );


    console.log(
        "💾 Caché guardado:",
        events.length,
        "eventos"
    );


    console.timeEnd(
        "⏱️ loadEvents"
    );

}



// ============================================
// CARGAR PARTICIPANTES
// ============================================

async function loadParticipants() {

    const {
        data,
        error
    } = await supabaseClient

        .from(
            "event_participants"
        )

        .select("*");


    if (error) {

        console.error(
            "Error cargando participantes:",
            error
        );

        return;

    }


    participants =
        data || [];


    console.log(
        "👥 Participantes cargados:",
        participants.length
    );

}



// ============================================
// FORMATOS Y FUNCIONES AUXILIARES
// ============================================

function formatDate(date) {

    return date.toLocaleDateString(
        "es-ES",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}



// ============================================
// CONVERSIÓN DE ZONA HORARIA
// ============================================

function getTimezoneOffset(
    date,
    timezone
) {

    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    timezone,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hourCycle:
                    "h23"
            }
        ).formatToParts(date);


    const values = {};


    parts.forEach(
        part => {

            if (
                part.type !==
                "literal"
            ) {

                values[
                    part.type
                ] =
                    Number(
                        part.value
                    );

            }

        }
    );


    const asUTC =
        Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute,
            values.second
        );


    return (
        asUTC -
        date.getTime()
    );

}



// ============================================
// CONVERTIR FECHA/HORA DEL EVENTO
// A SU INSTANTE REAL
// ============================================

function eventDateTimeToDate(
    eventDate,
    eventTime,
    timezone
) {

    if (
        !eventDate ||
        !eventTime
    ) {

        return null;

    }


    const [
        year,
        month,
        day
    ] =
        eventDate
            .split("-")
            .map(Number);


    const [
        hours,
        minutes
    ] =
        eventTime
            .split(":")
            .map(Number);


    // Fecha aproximada
    const approximateUTC =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hours,
                minutes,
                0
            )
        );


    // Diferencia real de la zona
    const offset =
        getTimezoneOffset(
            approximateUTC,
            timezone ||
                "America/Lima"
        );


    // Instante UTC real
    return new Date(
        approximateUTC.getTime() -
        offset
    );

}



// ============================================
// OBTENER FECHA + HORA DEL EVENTO
// SEGÚN LA ZONA DEL LECTOR
// ============================================

function formatEventDateTime(
    eventDate,
    eventTime,
    eventTimezone
) {

    const eventDateTime =
        eventDateTimeToDate(
            eventDate,
            eventTime,
            eventTimezone
        );


    if (!eventDateTime) {

        return {

            date:
                "Sin fecha",

            time:
                "Sin hora"

        };

    }


    const viewerTimezone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    const parts =
        new Intl.DateTimeFormat(
            "es-ES",
            {
                timeZone:
                    viewerTimezone,

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    true
            }
        ).formatToParts(
            eventDateTime
        );


    const values = {};


    parts.forEach(
        part => {

            if (
                part.type !==
                "literal"
            ) {

                values[
                    part.type
                ] =
                    part.value;

            }

        }
    );


    return {

        date:
            `${values.day}/${values.month}/${values.year}`,

        time:
            `${values.hour}:${values.minute} ${values.dayPeriod || ""}`

    };

}



// ============================================
// MOSTRAR HORA EN LA ZONA DEL USUARIO
// ============================================

function formatTime(
    time,
    eventDate = null,
    eventTimezone = "America/Lima"
) {

    if (!time) {

        return "Sin hora";

    }


    // Si no tenemos fecha
    if (!eventDate) {

        const [
            hours,
            minutes
        ] =
            time
                .split(":")
                .map(Number);


        const date =
            new Date();


        date.setHours(
            hours,
            minutes,
            0,
            0
        );


        return date.toLocaleTimeString(
            "es-ES",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    true
            }
        );

    }


    const eventDateTime =
        eventDateTimeToDate(
            eventDate,
            time,
            eventTimezone
        );


    if (!eventDateTime) {

        return "Sin hora";

    }


    const viewerTimezone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    return new Intl.DateTimeFormat(
        "es-ES",
        {
            timeZone:
                viewerTimezone,

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true
        }
    ).format(
        eventDateTime
    );

}



// ============================================
// MOSTRAR HORA ORIGINAL DEL CREADOR
// ============================================

function formatTimeOriginal(
    time
) {

    if (!time) {

        return "Sin hora";

    }


    const [
        hours,
        minutes
    ] =
        time
            .split(":")
            .map(Number);


    const date =
        new Date();


    date.setHours(
        hours,
        minutes,
        0,
        0
    );


    return date.toLocaleTimeString(
        "es-ES",
        {
            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true
        }
    );

}



// ============================================
// NOMBRE DE LA ZONA HORARIA
// ============================================

function formatTimezoneName(
    timezone
) {

    const names = {

        "America/Lima":
            "🇵🇪 Lima",

        "America/Bogota":
            "🇨🇴 Bogotá",

        "America/Mexico_City":
            "🇲🇽 Ciudad de México",

        "America/Santiago":
            "🇨🇱 Santiago",

        "America/Argentina/Buenos_Aires":
            "🇦🇷 Buenos Aires",

        "America/Sao_Paulo":
            "🇧🇷 São Paulo",

        "America/New_York":
            "🇺🇸 Nueva York",

        "America/Los_Angeles":
            "🇺🇸 Los Ángeles",

        "Europe/Madrid":
            "🇪🇸 Madrid",

        "Europe/Paris":
            "🇫🇷 París",

        "Europe/London":
            "🇬🇧 Londres"

    };


    return (
        names[timezone] ||
        timezone ||
        "Zona horaria desconocida"
    );

}



// ============================================
// EMOJIS / ÍCONOS DE ACTIVIDAD
// ============================================

function getEventIcon(
    type
) {

    const icons = {

        dungeon:
            "🗝️",

        quest:
            "🗺️",

        infinite_dreams:
            "🌀",

        commission:
            "📦",

        raid:
            "⚔️",

        farm:
            "💰",

        wanted:
            "📜",

        other:
            "🎲"

    };


    return (
        icons[type] ||
        "🎲"
    );

}



// ============================================
// PARTICIPANTES
// ============================================

function getEventParticipants(
    eventId
) {

    return participants.filter(
        participant =>
            participant.event_id ===
            eventId
    );

}


function isJoined(
    eventId
) {

    if (!currentUser) {

        return false;

    }


    return participants.some(
        participant =>
            participant.event_id ===
                eventId &&
            participant.user_id ===
                currentUser.id
    );

}


function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}



// ============================================
// RENDERIZAR CALENDARIO
// SEGÚN LA ZONA HORARIA DEL LECTOR
// ============================================

function renderCalendar() {

    if (!calendar) {

        return;

    }


    calendar.innerHTML = "";


    const year =
        currentDate.getFullYear();


    const month =
        currentDate.getMonth();


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );


    let startDay =
        firstDay.getDay();


    if (
        startDay === 0
    ) {

        startDay = 7;

    }


    // ========================================
    // DÍAS VACÍOS
    // ========================================

    for (
        let i = 1;
        i < startDay;
        i++
    ) {

        const emptyDay =
            document.createElement(
                "div"
            );


        emptyDay.className =
            "day empty";


        calendar.appendChild(
            emptyDay
        );

    }


    // ========================================
    // DÍAS DEL MES
    // ========================================

    for (
        let day = 1;
        day <= lastDay.getDate();
        day++
    ) {

        const dayElement =
            document.createElement(
                "div"
            );


        dayElement.className =
            "day";


        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


        // ====================================
        // ¿ES HOY?
        // ====================================

        const today =
            new Date();


        if (
            today.getFullYear() ===
                year &&

            today.getMonth() ===
                month &&

            today.getDate() ===
                day
        ) {

            dayElement.classList.add(
                "today"
            );

        }


        // ====================================
        // NÚMERO DEL DÍA
        // ====================================

        const dayNumber =
            document.createElement(
                "div"
            );


        dayNumber.className =
            "day-number";


        dayNumber.textContent =
            day;


        dayElement.appendChild(
            dayNumber
        );


        // ====================================
        // BUSCAR EVENTOS
        // SEGÚN LA FECHA DEL LECTOR
        // ====================================

        const dayEvents =
            events.filter(
                event => {

                    if (
                        !event.event_date ||
                        !event.event_time
                    ) {

                        return false;

                    }


                    const eventDateTime =
                        eventDateTimeToDate(
                            event.event_date,
                            event.event_time,
                            event.timezone
                        );


                    if (!eventDateTime) {

                        return false;

                    }


                    const viewerTimezone =
                        Intl.DateTimeFormat()
                            .resolvedOptions()
                            .timeZone;


                    const viewerDate =
                        new Intl.DateTimeFormat(
                            "en-CA",
                            {
                                timeZone:
                                    viewerTimezone,

                                year:
                                    "numeric",

                                month:
                                    "2-digit",

                                day:
                                    "2-digit"
                            }
                        ).format(
                            eventDateTime
                        );


                    return (
                        viewerDate ===
                        dateString
                    );

                }
            );


        // ====================================
        // MOSTRAR EVENTOS
        // ====================================

        dayEvents.forEach(
            event => {

                const eventElement =
                    document.createElement(
                        "div"
                    );


                eventElement.className =
                    `calendar-event ${event.type}`;


                eventElement.innerHTML = `

                    <span class="event-time">

                        ${formatTime(
                            event.event_time,
                            event.event_date,
                            event.timezone
                        )}

                    </span>

                    ${getEventIcon(
                        event.type
                    )}

                    ${escapeHTML(
                        event.name
                    )}

                `;


                dayElement.appendChild(
                    eventElement
                );

            }
        );


        calendar.appendChild(
            dayElement
        );

    }


    // ========================================
    // TÍTULO DEL MES
    // ========================================

    if (monthTitle) {

        monthTitle.textContent =
            currentDate.toLocaleDateString(
                "es-ES",
                {
                    month:
                        "long",

                    year:
                        "numeric"
                }
            );

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

        const isPast = isPastEvent(
            event.event_date,
            event.event_time,
            event.timezone
        );

        if (
            currentViewFilter === "upcoming" &&
            isPast
        ) return false;

        if (
            currentViewFilter === "past" &&
            !isPast
        ) return false;

        if (
            currentViewFilter === "my_events" &&
            (!isJoined(event.id) || isPast)
        ) return false;

        if (
            currentCategoryFilter !== "all" &&
            event.type !== currentCategoryFilter
        ) {
            return false;
        }

        return true;

    });


    if (filteredEvents.length === 0) {

        let emptyMessage =
            "No hay eventos en esta categoría.";

        if (
            currentViewFilter === "my_events"
        ) {
            emptyMessage =
                "No te has apuntado a ningún evento próximo.";
        }

        if (
            currentViewFilter === "past"
        ) {
            emptyMessage =
                "No hay eventos pasados en el historial.";
        }

        eventsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888;">
                <p style="font-size: 1.1rem;">
                    ${emptyMessage}
                </p>
            </div>
        `;

        return;
    }


    filteredEvents.forEach(event => {

        const card =
            document.createElement("div");


        const eventType =
            event.type || "other";


        card.className =
            `event-card ${eventType} type-${eventType}`;


        const isPast =
            isPastEvent(
                event.event_date,
                event.event_time,
                event.timezone
            );


        if (isPast) {
            card.classList.add(
                "event-past"
            );
        }


        const eventParticipants =
            getEventParticipants(
                event.id
            );


        const count =
            eventParticipants.length;


        const joined =
            isJoined(event.id);


        const isCreator =
            currentUser &&
            event.user_id === currentUser.id;


        // ========================================
        // PARTICIPANTES
        // ========================================

        let participantHTML = "";


        eventParticipants.forEach(
            participant => {

                participantHTML += `
                    <div class="participant">
                        ✅ ${escapeHTML(
                            participant.player_name ||
                            "Jugador"
                        )}
                    </div>
                `;

            }
        );


        if (
            eventParticipants.length === 0
        ) {

            participantHTML =
                `<div class="no-participants">
                    Todavía nadie se ha apuntado.
                </div>`;

        }


        // ========================================
        // BOTÓN PRINCIPAL
        // ========================================

        let buttonHTML;


        if (isPast) {

            buttonHTML =
                `<button
                    class="full-button"
                    disabled
                    style="opacity: 0.6;"
                >
                    🏁 Evento Finalizado
                </button>`;

        }

        else if (joined) {

            buttonHTML =
                `<button
                    class="leave-button"
                    onclick="leaveEvent(${event.id})"
                >
                    🔴 Retirarme
                </button>`;

        }

        else if (
            count >= event.capacity
        ) {

            buttonHTML =
                `<button
                    class="full-button"
                    disabled
                >
                    🚫 Completo
                </button>`;

        }

        else {

            buttonHTML =
                `<button
                    class="join-button"
                    onclick="joinEvent(${event.id})"
                >
                    🟢 Apuntarme
                </button>`;

        }


        // ========================================
        // BOTONES DEL CREADOR
        // ========================================

        let creatorButtonsHTML = "";


        if (
            isCreator &&
            !isPast
        ) {

            creatorButtonsHTML = `
                <div
                    class="creator-actions"
                    style="
                        margin-top: 10px;
                        display: flex;
                        gap: 8px;
                    "
                >

                    <button
                        class="edit-button"
                        onclick="openEditModal(${event.id})"
                        style="
                            background-color: #f39c12;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                        "
                    >
                        ✏️ Editar
                    </button>


                    <button
                        class="delete-button"
                        onclick="deleteEvent(${event.id})"
                        style="
                            background-color: #e74c3c;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                        "
                    >
                        🗑️ Eliminar
                    </button>

                </div>
            `;

        }


        // ========================================
        // DATOS DEL EVENTO
        // ========================================

        const typeLabel =
            EVENT_TYPE_NAMES[eventType] ||
            eventType;


        const creatorName =
            event.creator_name ||
            "Usuario";


        // Hora original introducida por el creador
        const originalTime =
            formatTimeOriginal(
                event.event_time
            );


        // Zona horaria original
        const timezoneName =
            formatTimezoneName(
                event.timezone
            );


        // Hora convertida a la zona del visitante
        const viewerTime =
            formatTime(
                event.event_time,
                event.event_date,
                event.timezone
            );


        // ========================================
        // TARJETA
        // ========================================

        card.innerHTML = `

            <div class="event-card-header">

                <div>

                    <span
                        class="event-type-badge ${eventType}"
                    >
                        ${getEventIcon(event.type)}
                        ${typeLabel}
                    </span>


                    <h3>
                        ${escapeHTML(
                            event.name
                        )}
                    </h3>


                    <div class="event-info">

                        📅 ${
                            formatDate(
                                new Date(
                                    `${event.event_date}T12:00:00`
                                )
                            )
                        }

                        &nbsp;&nbsp;

                        🕐
                        <strong>
                            ${viewerTime}
                        </strong>

                        — Tu hora

                    </div>


                    <div
                        class="event-info"
                        style="
                            font-size: 0.9em;
                            opacity: 0.8;
                            margin-top: 3px;
                        "
                    >

                        📍 Hora original:
                        <strong>
                            ${originalTime}
                        </strong>

                        ${timezoneName}

                    </div>

                </div>


                <div class="capacity">
                    👥 ${count}/${event.capacity}
                </div>

            </div>


            <div class="event-info">

                ${escapeHTML(
                    event.description || ""
                )}

            </div>


            <div
                class="event-info"
                style="margin-top: 6px;"
            >

                👑 Creado por:

                <strong>
                    ${escapeHTML(
                        creatorName
                    )}
                </strong>

            </div>


            <div class="participants-box">

                <strong>
                    👥 Participantes
                </strong>


                <div class="participants-list">

                    ${participantHTML}

                </div>

            </div>


            <div class="event-actions">

                ${buttonHTML}

                ${creatorButtonsHTML}

            </div>

        `;


        eventsList.appendChild(
            card
        );

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

    if (getEventParticipants(eventId).length >= event.capacity) {
        alert("Este evento está completo.");
        return;
    }

    if (isJoined(eventId)) {
        alert("Ya estás apuntado.");
        return;
    }

    // Obtener nombre tanto si ingresó manualmente como si está conectado por Discord
    const playerName = currentProfile?.player_name ||
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.username ||
        "Jugador";

    // 1. Guardar en Supabase directamente desde la Web
    const { error: dbError } = await supabaseClient
        .from("event_participants")
        .upsert({
            event_id: eventId,
            user_id: currentUser.id,
            player_name: playerName,
            discord_id: currentProfile?.discord_id || null
        }, {
            onConflict: "event_id,user_id"
        });

    if (dbError) {
        console.error("❌ Error guardando en BD:", dbError);
        alert("No se pudo registrar tu participación.");
        return;
    }

    // 2. Notificar a la Edge Function para actualizar el mensaje en Discord
    try {
        await supabaseClient.functions.invoke("discord-event", {
            body: { action: "update_message", event_id: eventId }
        });
    } catch (syncErr) {
        console.warn("⚠️ No se pudo sincronizar con Discord:", syncErr);
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

    // 1. Eliminar de Supabase directamente desde la Web
    const { error: dbError } = await supabaseClient
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUser.id);

    if (dbError) {
        console.error("❌ Error al retirarse:", dbError);
        alert("No se pudo cancelar la inscripción.");
        return;
    }

    // 2. Notificar a la Edge Function para actualizar Discord
    try {
        await supabaseClient.functions.invoke("discord-event", {
            body: { action: "update_message", event_id: eventId }
        });
    } catch (syncErr) {
        console.warn("⚠️ No se pudo sincronizar con Discord:", syncErr);
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
// ABRIR MODAL CREAR ACTIVIDAD
// ============================================

if (addEventButton) {

    addEventButton.addEventListener("click", () => {

        console.log("🟢 Abriendo formulario de nueva actividad.");

        editingEventId = null;

        eventForm.reset();

        document.getElementById("eventCapacity").value = 8;

        const modalTitle = eventModal.querySelector("h2");

        if (modalTitle) {
            modalTitle.textContent = "➕ Crear actividad";
        }

        eventModal.classList.remove("hidden");

    });

}


// ============================================
// CERRAR MODAL
// ============================================

if (closeModal) {

    closeModal.addEventListener("click", () => {

        console.log("🔴 Cerrando formulario.");

        editingEventId = null;

        eventModal.classList.add("hidden");

        eventForm.reset();

        document.getElementById("eventCapacity").value = 8;

    });

}

// ============================================
// CREAR / EDITAR EVENTO DESDE LA WEB
// ============================================

if (eventForm) {

    console.log("🟢 Registrando listener del formulario...");
    eventForm.addEventListener("click", (e) => {
        console.log("🖱️ CLICK:", e.target);
    });

    eventForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        console.log("🟢🟢 SUBMIT DETECTADO");

        if (!currentUser) {
            alert("No estás conectado.");
            return;
        }

        const name = document
            .getElementById("eventName")
            .value
            .trim();

        const type = document
            .getElementById("eventType")
            .value;

        const date = document
            .getElementById("eventDate")
            .value;

        const time = document
            .getElementById("eventTime")
            .value;

        const capacity = Number(
            document.getElementById("eventCapacity").value
        );

        const description = document
            .getElementById("eventDescription")
            .value
            .trim();

        if (!name || !type || !date || !time || !capacity) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        const submitButton =
            eventForm.querySelector(".submit-button");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Guardando...";
        }

        try {

            // ========================================
            // EDITAR EVENTO
            // ========================================

            if (editingEventId) {

                const { error } = await supabaseClient
                    .from("events")
                    .update({
                        name: name,
                        type: type,
                        event_date: date,
                        event_time: time,
                        capacity: capacity,
                        description: description,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                    .eq("id", editingEventId)
                    .eq("user_id", currentUser.id);

                if (error) {
                    console.error(
                        "❌ Error editando evento:",
                        error
                    );

                    alert(
                        "No se pudo editar la actividad."
                    );

                    return;
                }

                console.log("✅ Evento actualizado.");

                alert(
                    "✅ Actividad actualizada correctamente."
                );

                // Notificar a Discord la edición del evento
                try {
                    await supabaseClient.functions.invoke("discord-event", {
                        body: { action: "update_message", event_id: editingEventId }
                    });
                } catch (discordErr) {
                    console.warn("⚠️ Error actualizando Discord al editar:", discordErr);
                }

            }

            // ========================================
            // CREAR EVENTO NUEVO
            // ========================================

            else {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("events")
                    .insert({
                        user_id: currentUser.id,
                        name: name,
                        type: type,
                        event_date: date,
                        event_time: time,
                        capacity: capacity,
                        description: description,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                    .select()
                    .single();

                if (error) {

                    console.error(
                        "❌ Error creando evento:",
                        error
                    );

                    alert(
                        "No se pudo crear la actividad."
                    );

                    return;
                }

                console.log(
                    "✅ Evento creado:",
                    data
                );

                // ====================================
// APUNTAR AUTOMÁTICAMENTE AL CREADOR
// ====================================

const {
    error: participantError
} = await supabaseClient
    .from("event_participants")
    .upsert(
        {
            event_id: data.id,
            user_id: currentUser.id,
            player_name: currentProfile?.player_name || null
        },
        {
            onConflict: "event_id,user_id"
        }
    );

if (participantError) {

    console.error(
        "❌ Error apuntando al creador:",
        participantError
    );

    alert(
        "⚠️ La actividad se creó, pero no se pudo registrar tu inscripción."
    );

} else {

    console.log(
        "🟢 Creador apuntado automáticamente:",
        {
            event_id: data.id,
            user_id: currentUser.id
        }
    );

}

                alert(
                    "✅ Actividad creada correctamente."
                );

                // ====================================
                // AVISAR A DISCORD
                // ====================================

                try {

                    const {
                        data: discordData,
                        error: discordError
                    } = await supabaseClient.functions.invoke(
                        "discord-event",
                        {
                            body: {
    ...data,
    player_name: currentProfile?.player_name || null
}
                        }
                    );

                    if (discordError) {

                        console.error(
                            "⚠️ Error publicando en Discord:",
                            discordError
                        );

                    } else {

                        console.log(
                            "📢 Discord respondió:",
                            discordData
                        );

                    }

                } catch (discordError) {

                    console.error(
                        "⚠️ Error enviando a Discord:",
                        discordError
                    );

                }
            }

            // ========================================
            // LIMPIAR
            // ========================================

            editingEventId = null;

            if (eventModal) {
                eventModal.classList.add("hidden");
            }

            eventForm.reset();

            document.getElementById(
                "eventCapacity"
            ).value = 8;

            const modalTitle =
                eventModal?.querySelector("h2");

            if (modalTitle) {
                modalTitle.textContent =
                    "➕ Nueva Actividad";
            }

            // ========================================
            // RECARGAR EVENTOS
            // ========================================

            await loadEvents();

        } catch (error) {

            console.error(
                "❌ Error procesando formulario:",
                error
            );

            alert(
                "Ocurrió un error inesperado."
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "Crear actividad";
            }

        }

    });

}

// ============================================
// BOTÓN DISCORD
// ============================================

const discordButton = document.getElementById("discordButton");

// ============================================
// ID DE TU APLICACIÓN DISCORD
// ============================================

const DISCORD_CLIENT_ID = "1538010946130419762";

// ============================================
// URL DE RETORNO DE DISCORD
// ============================================

const DISCORD_REDIRECT_URI = "https://dofuspediaes.github.io/calendario-gremio/";

// ============================================
// CONECTAR DISCORD
// ============================================

function connectDiscord() {
    const discordURL =
        "https://discord.com/oauth2/authorize" +
        "?client_id=" +
        encodeURIComponent(DISCORD_CLIENT_ID) +
        "&response_type=code" +
        "&redirect_uri=" +
        encodeURIComponent(DISCORD_REDIRECT_URI) +
        "&scope=identify";

    window.location.href = discordURL;
}

// ============================================
// PROCESAR REGRESO DE DISCORD
// ============================================

async function processDiscordCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
        return;
    }

    console.log("Código de Discord recibido.");

    try {
        const { data, error } = await supabaseClient.functions.invoke(
            "discord-oauth",
            {
                body: { code }
            }
        );

        if (error) {
            console.error("Error OAuth Discord:", error);
            alert("No se pudo conectar Discord.");
            return;
        }

        if (!data || !data.success) {
            console.error(data);
            alert("Discord no pudo ser conectado.");
            return;
        }

        console.log("Discord conectado:", data.discord);

        // ====================================
        // CREAR / ACTUALIZAR PERFIL CON UPSERT
        // ====================================

        const discordPlayerName =
            data.discord.global_name ||
            data.discord.username ||
            "Jugador";

        const {
            data: profileData,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .upsert(
                {
                    id: currentUser.id,
                    player_name: discordPlayerName,
                    discord_id: data.discord.id,
                    discord_username: discordPlayerName
                },
                {
                    onConflict: "id"
                }
            )
            .select()
            .single();

        if (profileError) {
            console.error("❌ Error creando/actualizando perfil:", profileError);
            alert("Discord se conectó, pero no se pudo crear tu perfil.");
            return;
        }

        currentProfile = profileData;
        updateProfileDisplay();

        // ====================================
        // CERRAR MODAL DE PRIMER ACCESO (si existe)
        // ====================================

        const firstLoginModal = document.querySelector(
            "div[style*='position:fixed'][style*='z-index:99999']"
        );

        if (firstLoginModal) {
            firstLoginModal.remove();
        }

        // ====================================
        // LIMPIAR MARCA DE PRIMER ACCESO
        // ====================================

        sessionStorage.removeItem("discord_first_login");

        // ====================================
        // ACTUALIZAR BOTÓN
        // ====================================

        if (discordButton) {
            discordButton.textContent = `🎮 ${data.discord.global_name || data.discord.username}`;
            discordButton.classList.add("discord-connected");
        }

        // ====================================
        // LIMPIAR URL
        // ====================================

        window.history.replaceState({}, document.title, window.location.pathname);

        alert("✅ Discord conectado correctamente.");

    } catch (error) {
        console.error("Error conectando Discord:", error);
        alert("Ocurrió un error al conectar Discord.");
    }
}

// ============================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL (SUSCRIPCIÓN)
// ============================================

function subscribeToRealtime() {
    supabaseClient
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'event_participants' },
            async (payload) => {
                console.log("🔄 Cambio detectado en participantes, recargando...", payload);
                await loadEvents();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'events' },
            async (payload) => {
                console.log("🔄 Cambio detectado en eventos, recargando...", payload);
                await loadEvents();
            }
        )
        .subscribe();
}

// ============================================
// INICIAR APLICACIÓN
// ============================================

async function initApp() {

    console.log("🚀 Iniciando Calendario WabbitAPP...");

    // 1. Comprobar / crear sesión anónima
    const loggedIn = await loginAnonymous();

    if (!loggedIn) {
        console.error("❌ No se pudo iniciar sesión.");
        return;
    }

    console.log("✅ Usuario listo:", currentUser.id);

    // 2. Comprobar si estamos regresando de Discord
    await processDiscordCallback();

    // 3. Cargar perfil
    await loadProfile();

    // 4. Cargar eventos
    await loadEvents();

    // 5. Mostrar zona horaria
    showTimezone();

    // 6. Actualizar botón de notificaciones
    updateNotificationButton();

    // 7. Escuchar cambios de Discord/base de datos en vivo
    subscribeToRealtime();

    console.log("✅ Calendario iniciado correctamente.");
}


// ============================================
// ARRANCAR CUANDO CARGUE LA PÁGINA
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
