// ============================================
// CALENDARIO DEL GREMIO
// ============================================


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL =
    "https://nmmetzityubqbrbpibee.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o8bXQ5puE8EUgEn_c_qM6A_7OOxZIsX";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ============================================
// ELEMENTOS DEL DOM
// ============================================

const calendar =
    document.getElementById("calendar");

const monthTitle =
    document.getElementById("monthTitle");

const previousMonthButton =
    document.getElementById("previousMonth");

const nextMonthButton =
    document.getElementById("nextMonth");

const todayButton =
    document.getElementById("todayButton");

const timezoneName =
    document.getElementById("timezoneName");

const eventsList =
    document.getElementById("eventsList");

const addEventButton =
    document.getElementById("addEventButton");

const eventModal =
    document.getElementById("eventModal");

const closeModal =
    document.getElementById("closeModal");

const eventForm =
    document.getElementById("eventForm");

const notificationButton =
    document.getElementById("notificationButton");

const changeNameButton =
    document.getElementById("changeNameButton");


// ============================================
// VARIABLES GLOBALES
// ============================================

let currentDate =
    new Date();

let events = [];

let participants = [];

let currentUser = null;

let currentProfile = null;


// ============================================
// ZONA HORARIA
// ============================================

function getTimezone() {

    return Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

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

    const {
        data: sessionData
    } =
        await supabaseClient.auth.getSession();


    if (
        sessionData &&
        sessionData.session &&
        sessionData.session.user
    ) {

        currentUser =
            sessionData.session.user;


        console.log(
            "Sesión existente:",
            currentUser.id
        );


        return true;

    }


    const {
        data,
        error
    } =
        await supabaseClient.auth
            .signInAnonymously();


    if (error) {

        console.error(
            "Error iniciando sesión:",
            error
        );

        alert(
            "No se pudo conectar con Supabase."
        );

        return false;

    }


    currentUser =
        data.user;


    console.log(
        "Nuevo usuario:",
        currentUser.id
    );


    return true;

}


// ============================================
// CARGAR PERFIL
// ============================================

async function loadProfile() {

    if (!currentUser) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Error cargando perfil:",
            error
        );

        return;

    }


    if (!data) {

        const playerName =
            prompt(
                "¿Cuál es tu nombre dentro del gremio?"
            );


        if (
            !playerName ||
            !playerName.trim()
        ) {

            alert(
                "Necesitas poner un nombre."
            );

            return;

        }


        const cleanName =
            playerName.trim();


        const {
            data: newProfile,
            error: createError
        } =
            await supabaseClient
                .from("profiles")
                .insert({

                    id:
                        currentUser.id,

                    player_name:
                        cleanName

                })
                .select()
                .single();


        if (createError) {

            console.error(
                "Error creando perfil:",
                createError
            );

            return;

        }


        currentProfile =
            newProfile;

    } else {

        currentProfile =
            data;

    }


    updateProfileDisplay();

}


// ============================================
// MOSTRAR NOMBRE DEL JUGADOR
// ============================================

function updateProfileDisplay() {

    const display =
        document.getElementById(
            "playerNameDisplay"
        );


    if (
        !display ||
        !currentProfile
    ) {

        return;

    }


    display.textContent =
        `👤 ${currentProfile.player_name}`;

}


// ============================================
// CAMBIAR NOMBRE
// ============================================

async function changePlayerName() {

    if (
        !currentUser ||
        !currentProfile
    ) {

        return;

    }


    const newName =
        prompt(
            "Nuevo nombre del jugador:",
            currentProfile.player_name
        );


    if (
        !newName ||
        !newName.trim()
    ) {

        return;

    }


    const cleanName =
        newName.trim();


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({

                player_name:
                    cleanName,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                currentUser.id
            )
            .select()
            .single();


    if (error) {

        console.error(
            "Error cambiando nombre:",
            error
        );

        alert(
            "No se pudo cambiar el nombre."
        );

        return;

    }


    currentProfile =
        data;


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

    if (!notificationButton) {

        return;

    }


    if (
        !("Notification" in window)
    ) {

        notificationButton.textContent =
            "❌ No compatible";

        notificationButton.disabled =
            true;

        return;

    }


    if (
        Notification.permission ===
        "granted"
    ) {

        notificationButton.textContent =
            "🔔 Notificaciones activadas";

        return;

    }


    if (
        Notification.permission ===
        "denied"
    ) {

        notificationButton.textContent =
            "🚫 Notificaciones bloqueadas";

        return;

    }


    notificationButton.textContent =
        "🔔 Activar notificaciones";

}


// ============================================
// PASO 4: GUARDAR SUSCRIPCIÓN EN SUPABASE
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

    if (
        !("Notification" in window)
    ) {

        alert(
            "Tu navegador no permite notificaciones."
        );

        return;

    }


    const permission =
        await Notification.requestPermission();


    if (
        permission === "granted"
    ) {

        updateNotificationButton();


        await subscribeToPush();


        new Notification(
            "🔔 Calendario del Gremio",
            {

                body:
                    "Las notificaciones están activadas."

            }
        );


        console.log(
            "Notificaciones activadas."
        );

    } else {

        updateNotificationButton();


        console.log(
            "Permiso de notificaciones:",
            permission
        );

    }

}


// ============================================
// CARGAR EVENTOS
// ============================================

async function loadEvents() {

    const {
        data,
        error
    } =
        await supabaseClient
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


    events =
        data || [];


    await loadParticipants();


    renderCalendar();

    renderEvents();

}


// ============================================
// CARGAR PARTICIPANTES
// ============================================

async function loadParticipants() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("event_participants")
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


function formatTime(time) {

    const [
        hours,
        minutes
    ] =
        time.split(":");


    const date =
        new Date();


    date.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
    );


    return date.toLocaleTimeString(
        "es-ES",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function getEventIcon(type) {

    const icons = {

        raid: "⚔️",

        dungeon: "🏰",

        quest: "🎯",

        farm: "💰",

        other: "⭐"

    };


    return icons[type] || "⭐";

}


function getEventParticipants(eventId) {

    return participants.filter(
        participant =>
            participant.event_id === eventId
    );

}


function isJoined(eventId) {

    if (!currentUser) return false;

    return participants.some(
        participant =>
            participant.event_id === eventId &&
            participant.user_id === currentUser.id
    );

}


function escapeHTML(text) {

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
// ============================================

function renderCalendar() {

    if (!calendar) return;

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


    if (startDay === 0) {

        startDay = 7;

    }


    // DÍAS VACÍOS

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


    // DÍAS DEL MES

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


        // DÍA DE HOY

        const today =
            new Date();


        if (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        ) {

            dayElement.classList.add(
                "today"
            );

        }


        // NÚMERO DE DÍA

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


        // EVENTOS DEL DÍA

        const dayEvents =
            events.filter(
                event =>
                    event.event_date ===
                    dateString
            );


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
                            event.event_time
                        )}

                    </span>

                    ${getEventIcon(
                        event.type
                    )}

                    ${escapeHTML(event.name)}

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


    if (monthTitle) {

        monthTitle.textContent =
            currentDate.toLocaleDateString(
                "es-ES",
                {
                    month: "long",
                    year: "numeric"
                }
            );

    }

}


// ============================================
// MOSTRAR TARJETAS DE EVENTOS
// ============================================

function renderEvents() {

    if (!eventsList) return;

    eventsList.innerHTML = "";


    events.forEach(
        event => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "event-card";


            const eventParticipants =
                getEventParticipants(
                    event.id
                );


            const count =
                eventParticipants.length;


            const joined =
                isJoined(
                    event.id
                );


            let participantHTML =
                "";


            eventParticipants.forEach(
                participant => {

                    participantHTML += `

                        <div class="participant">

                            ✅

                            ${escapeHTML(
                                participant.player_name || "Jugador"
                            )}

                        </div>

                    `;

                }
            );


            if (
                eventParticipants.length === 0
            ) {

                participantHTML = `

                    <div class="no-participants">

                        Todavía nadie se ha apuntado.

                    </div>

                `;

            }


            let buttonHTML;


            if (joined) {

                buttonHTML = `

                    <button

                        class="leave-button"

                        onclick="leaveEvent(${event.id})"

                    >

                        🔴 Retirarme

                    </button>

                `;

            } else if (
                count >= event.capacity
            ) {

                buttonHTML = `

                    <button

                        class="full-button"

                        disabled

                    >

                        🚫 Completo

                    </button>

                `;

            } else {

                buttonHTML = `

                    <button

                        class="join-button"

                        onclick="joinEvent(${event.id})"

                    >

                        🟢 Apuntarme

                    </button>

                `;

            }


            card.innerHTML = `

                <div class="event-card-header">

                    <div>

                        <h3>

                            ${getEventIcon(
                                event.type
                            )}

                            ${escapeHTML(
                                event.name
                            )}

                        </h3>


                        <div class="event-info">

                            📅

                            ${formatDate(
                                new Date(
                                    `${event.event_date}T12:00:00`
                                )
                            )}

                            &nbsp;&nbsp;

                            🕐

                            ${formatTime(
                                event.event_time
                            )}

                        </div>

                    </div>


                    <div class="capacity">

                        👥

                        ${count}/${event.capacity}

                    </div>

                </div>


                <div class="event-info">

                    ${escapeHTML(
                        event.description || ""
                    )}

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

                </div>

            `;


            eventsList.appendChild(
                card
            );

        }
    );

}


// ============================================
// APUNTARSE A UN EVENTO
// ============================================

async function joinEvent(eventId) {

    if (!currentUser) {

        alert(
            "No estás conectado."
        );

        return;

    }


    const event =
        events.find(
            e =>
                e.id === eventId
        );


    if (!event) {

        return;

    }


    const currentParticipants =
        getEventParticipants(
            eventId
        );


    if (
        currentParticipants.length >=
        event.capacity
    ) {

        alert(
            "Este evento está completo."
        );

        return;

    }


    if (
        isJoined(eventId)
    ) {

        alert(
            "Ya estás apuntado."
        );

        return;

    }


const { error } = await supabaseClient
    .from("event_participants")
    .insert({
        event_id: eventId,
        user_id: currentUser.id,
        player_name: currentUser.user_metadata?.full_name || currentUser.email || "Jugador"
    });


    if (error) {

        console.error(
            "Error apuntándose:",
            error
        );


        alert(
            "No se pudo apuntar. Revisa la consola."
        );


        return;

    }


    await loadEvents();

}


// ============================================
// RETIRARSE DE UN EVENTO
// ============================================

async function leaveEvent(eventId) {

    if (!currentUser) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("event_participants")
            .delete()
            .eq(
                "event_id",
                eventId
            )
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "Error retirándose:",
            error
        );


        alert(
            "No se pudo retirar la inscripción."
        );


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


            if (!currentUser) {

                alert(
                    "Todavía no estás conectado."
                );

                return;

            }


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


            const {
                error
            } =
                await supabaseClient
                    .from("events")
                    .insert({

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

                    });


            if (error) {

                console.error(
                    "Error creando evento:",
                    error
                );


                alert(
                    "No se pudo crear el evento."
                );


                return;

            }


            eventForm.reset();


            eventModal.classList.add(
                "hidden"
            );


            await loadEvents();

        }
    );

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

    updateNotificationButton();


    const connected =
        await loginAnonymous();


    if (!connected) {

        return;

    }


    await loadProfile();

    await loadEvents();

}


startApp();
