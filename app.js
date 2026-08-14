// ============================================
// CALENDARIO DEL GREMIO
// PARTE 2
// SUPABASE
// ============================================


// ============================================
// CONFIGURACIÓN SUPABASE
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

let currentDate = new Date();

let events = [];

let currentUser = null;


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
// INICIAR USUARIO ANÓNIMO
// ============================================

async function loginAnonymous() {

    const {
        data,
        error
    } = await supabaseClient.auth
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
// CARGAR EVENTOS
// ============================================

async function loadEvents() {

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

        alert(
            "No se pudieron cargar los eventos."
        );

        return;

    }


    events =
        data || [];


    renderCalendar();

    renderEvents();

}


// ============================================
// FORMATEAR FECHA
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
// FORMATEAR HORA
// ============================================

function formatTime(time) {

    const [
        hours,
        minutes
    ] = time.split(":");


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
// ICONO DEL EVENTO
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
// GENERAR CALENDARIO
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


        // NÚMERO DEL DÍA

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


    // TÍTULO DEL MES

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
// MOSTRAR LISTA DE EVENTOS
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


            card.innerHTML = `

                <div class="event-card-header">

                    <div>

                        <h3>

                            ${getEventIcon(
                                event.type
                            )}

                            ${event.name}

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

                        👥 0/${event.capacity}

                    </div>

                </div>


                <div class="event-info">

                    ${event.description || ""}

                </div>

            `;


            eventsList.appendChild(
                card
            );

        }
    );

}


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
// BOTÓN HOY
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
// CERRAR AL PULSAR FUERA
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


        // GUARDAR EN SUPABASE

        const {
            data,
            error
        } = await supabaseClient
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

            })
            .select();


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


        console.log(
            "Evento creado:",
            data
        );


        // LIMPIAR

        eventForm.reset();


        // CERRAR

        eventModal.classList.add(
            "hidden"
        );


        // RECARGAR

        await loadEvents();

    }
);


// ============================================
// INICIAR APLICACIÓN
// ============================================

async function startApp() {

    showTimezone();


    const loggedIn =
        await loginAnonymous();


    if (!loggedIn) {

        return;

    }


    await loadEvents();

}


startApp();
