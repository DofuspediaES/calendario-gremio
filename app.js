// ============================================
// CALENDARIO DEL GREMIO
// PARTE 1
// ============================================


// --------------------------------------------
// VARIABLES
// --------------------------------------------

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");

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


// --------------------------------------------
// FECHA ACTUAL
// --------------------------------------------

let currentDate = new Date();


// --------------------------------------------
// EVENTOS DE PRUEBA
// --------------------------------------------

let events = [

    {
        id: 1,

        name: "RAID Conde Kontatrás",

        type: "raid",

        date: "2026-08-15",

        time: "20:00",

        capacity: 12,

        participants: [
            "Diego",
            "Juan",
            "Pedro"
        ],

        description:
            "Raid del gremio."
    },

    {
        id: 2,

        name: "Mazmorra Tal Kasha",

        type: "dungeon",

        date: "2026-08-17",

        time: "21:30",

        capacity: 8,

        participants: [
            "Carlos",
            "Luis"
        ],

        description:
            "Vamos a intentar pasar la mazmorra."
    }

];


// --------------------------------------------
// NOMBRE DE LA ZONA HORARIA
// --------------------------------------------

function showTimezone() {

    const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    timezoneName.textContent = timezone;
}

showTimezone();


// --------------------------------------------
// FORMATEAR FECHA
// --------------------------------------------

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


// --------------------------------------------
// FORMATEAR HORA
// --------------------------------------------

function formatTime(time) {

    const [hours, minutes] =
        time.split(":");

    const date =
        new Date();

    date.setHours(
        Number(hours),
        Number(minutes)
    );

    return date.toLocaleTimeString(
        "es-ES",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// --------------------------------------------
// ICONO DEL EVENTO
// --------------------------------------------

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


// --------------------------------------------
// GENERAR CALENDARIO
// --------------------------------------------

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


    // Convertir domingo = 0
    // a domingo = 7

    if (startDay === 0) {
        startDay = 7;
    }


    // ----------------------------------------
    // DÍAS VACÍOS
    // ----------------------------------------

    for (
        let i = 1;
        i < startDay;
        i++
    ) {

        const emptyDay =
            document.createElement("div");

        emptyDay.className =
            "day empty";

        calendar.appendChild(
            emptyDay
        );

    }


    // ----------------------------------------
    // DÍAS DEL MES
    // ----------------------------------------

    for (
        let day = 1;
        day <= lastDay.getDate();
        day++
    ) {

        const dayElement =
            document.createElement("div");

        dayElement.className =
            "day";


        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


        // ------------------------------------
        // COMPROBAR SI ES HOY
        // ------------------------------------

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


        // ------------------------------------
        // NÚMERO DEL DÍA
        // ------------------------------------

        const dayNumber =
            document.createElement("div");

        dayNumber.className =
            "day-number";

        dayNumber.textContent =
            day;

        dayElement.appendChild(
            dayNumber
        );


        // ------------------------------------
        // EVENTOS
        // ------------------------------------

        const dayEvents =
            events.filter(
                event =>
                    event.date === dateString
            );


        dayEvents.forEach(
            event => {

                const eventElement =
                    document.createElement("div");

                eventElement.className =
                    `calendar-event ${event.type}`;


                eventElement.innerHTML = `

                    <span class="event-time">
                        ${formatTime(event.time)}
                    </span>

                    ${getEventIcon(event.type)}
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


    // ----------------------------------------
    // TÍTULO DEL MES
    // ----------------------------------------

    monthTitle.textContent =
        currentDate.toLocaleDateString(
            "es-ES",
            {
                month: "long",
                year: "numeric"
            }
        );

}


// --------------------------------------------
// MOSTRAR LISTA DE EVENTOS
// --------------------------------------------

function renderEvents() {

    eventsList.innerHTML = "";


    const sortedEvents =
        [...events].sort(
            (a, b) => {

                const dateA =
                    new Date(
                        `${a.date}T${a.time}`
                    );

                const dateB =
                    new Date(
                        `${b.date}T${b.time}`
                    );

                return dateA - dateB;

            }
        );


    sortedEvents.forEach(
        event => {

            const card =
                document.createElement("div");

            card.className =
                "event-card";


            const participantCount =
                event.participants.length;


            card.innerHTML = `

                <div class="event-card-header">

                    <div>

                        <h3>
                            ${getEventIcon(event.type)}
                            ${event.name}
                        </h3>

                        <div class="event-info">

                            📅 ${formatDate(
                                new Date(
                                    `${event.date}T12:00:00`
                                )
                            )}

                            &nbsp;&nbsp;

                            🕐 ${formatTime(
                                event.time
                            )}

                        </div>

                    </div>


                    <div class="capacity">

                        👥
                        ${participantCount}/${event.capacity}

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


// --------------------------------------------
// CAMBIAR MES
// --------------------------------------------

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


// --------------------------------------------
// BOTÓN HOY
// --------------------------------------------

todayButton.addEventListener(
    "click",
    () => {

        currentDate =
            new Date();

        renderCalendar();

    }
);


// --------------------------------------------
// ABRIR MODAL
// --------------------------------------------

addEventButton.addEventListener(
    "click",
    () => {

        eventModal.classList.remove(
            "hidden"
        );

    }
);


// --------------------------------------------
// CERRAR MODAL
// --------------------------------------------

closeModal.addEventListener(
    "click",
    () => {

        eventModal.classList.add(
            "hidden"
        );

    }
);


// --------------------------------------------
// CERRAR AL HACER CLICK FUERA
// --------------------------------------------

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


// --------------------------------------------
// CREAR EVENTO
// --------------------------------------------

eventForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const newEvent = {

            id:
                Date.now(),

            name:
                document.getElementById(
                    "eventName"
                ).value,

            type:
                document.getElementById(
                    "eventType"
                ).value,

            date:
                document.getElementById(
                    "eventDate"
                ).value,

            time:
                document.getElementById(
                    "eventTime"
                ).value,

            capacity:
                Number(
                    document.getElementById(
                        "eventCapacity"
                    ).value
                ),

            participants: [],

            description:
                document.getElementById(
                    "eventDescription"
                ).value

        };


        events.push(
            newEvent
        );


        eventForm.reset();


        eventModal.classList.add(
            "hidden"
        );


        renderCalendar();

        renderEvents();

    }
);


// --------------------------------------------
// INICIAR
// --------------------------------------------

renderCalendar();

renderEvents();
