// ============================================
// CALENDARIO DEL GREMIO
// PARTE 3
// PARTICIPANTES
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
// ELEMENTOS
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


// ============================================
// VARIABLES
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

    timezoneName.textContent =
        getTimezone();

}


// ============================================
// USUARIO
// ============================================

async function loginAnonymous() {

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
        "Usuario conectado:",
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


    // ========================================
    // SI NO EXISTE EL PERFIL
    // ========================================

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
// FECHA
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
// HORA
// ============================================

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


// ============================================
// ICONO
// ============================================

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


// ============================================
// PARTICIPANTES DE UN EVENTO
// ============================================

function getEventParticipants(eventId) {

    return participants.filter(
        participant =>
            participant.event_id === eventId
    );

}


// ============================================
// ¿ESTOY APUNTADO?
// ============================================

function isJoined(eventId) {

    return participants.some(
        participant =>
            participant.event_id === eventId &&
            participant.user_id === currentUser.id
    );

}


// ============================================
// CALENDARIO
// ============================================

function renderCalendar() {

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


    // DÍAS

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


        // HOY

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


        // NÚMERO

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


        // EVENTOS

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

                    ${event.name}

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


    monthTitle.textContent =
        currentDate.toLocaleDateString(
            "es-ES",
            {
                month: "long",
                year: "numeric"
            }
        );

}


// ============================================
// MOSTRAR EVENTOS
// ============================================

function renderEvents() {

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
                                participant.player_name
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
// ESCAPAR HTML
// ============================================

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
// APUNTARSE
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

  const playerName =
    currentProfile.player_name;

    const {
        error
    } =
        await supabaseClient
            .from("event_participants")
            .insert({

                event_id:
                    eventId,

                user_id:
                    currentUser.id,

                player_name:
                    cleanName

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
// RETIRARSE
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
// BOTÓN CAMBIAR NOMBRE
// ============================================

const changeNameButton =
    document.getElementById(
        "changeNameButton"
    );


changeNameButton.addEventListener(
    "click",
    changePlayerName
);

// ============================================
// CAMBIAR MES
// ============================================

previousMonthButton.addEventListener(
    "click",
    () => {

        currentDate.setMonth(
            currentDate.getMonth() - 1
        );

        renderCalendar();

    }
);


nextMonthButton.addEventListener(
    "click",
    () => {

        currentDate.setMonth(
            currentDate.getMonth() + 1
        );

        renderCalendar();

    }
);


// ============================================
// HOY
// ============================================

todayButton.addEventListener(
    "click",
    () => {

        currentDate =
            new Date();

        renderCalendar();

    }
);


// ============================================
// ABRIR MODAL
// ============================================

addEventButton.addEventListener(
    "click",
    () => {

        eventModal.classList.remove(
            "hidden"
        );

    }
);


// ============================================
// CERRAR MODAL
// ============================================

closeModal.addEventListener(
    "click",
    () => {

        eventModal.classList.add(
            "hidden"
        );

    }
);


// ============================================
// CERRAR MODAL AL PULSAR FUERA
// ============================================

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


// ============================================
// CREAR EVENTO
// ============================================

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


// ============================================
// INICIAR
// ============================================

async function startApp() {

    showTimezone();


    const connected =
        await loginAnonymous();


    if (!connected) {

        return;

    }


    // Cargar perfil

    await loadProfile();


    // Cargar eventos

    await loadEvents();

}


startApp();
