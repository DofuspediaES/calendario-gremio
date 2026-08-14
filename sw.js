// ============================================
// SERVICE WORKER
// CALENDARIO DEL GREMIO
// ============================================


// ============================================
// INSTALACIÓN
// ============================================

self.addEventListener(
    "install",
    event => {

        console.log(
            "Service Worker instalado"
        );

        self.skipWaiting();

    }
);


// ============================================
// ACTIVACIÓN
// ============================================

self.addEventListener(
    "activate",
    event => {

        console.log(
            "Service Worker activado"
        );

        event.waitUntil(
            self.clients.claim()
        );

    }
);


// ============================================
// NOTIFICACIÓN PUSH
// ============================================

self.addEventListener(
    "push",
    event => {

        let data = {

            title:
                "Calendario del Gremio",

            body:
                "Tienes una nueva actividad.",

            icon:
                "/icon-192.png"

        };


        if (event.data) {

            try {

                data =
                    event.data.json();

            } catch (error) {

                data.body =
                    event.data.text();

            }

        }


        event.waitUntil(

            self.registration
                .showNotification(
                    data.title,
                    {

                        body:
                            data.body,

                        icon:
                            data.icon,

                        badge:
                            data.icon,

                        data:
                            data.data || {}

                    }
                )

        );

    }
);


// ============================================
// CLICK EN NOTIFICACIÓN
// ============================================

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();


        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            })
            .then(
                clientList => {

                    for (
                        const client
                        of clientList
                    ) {

                        if (
                            "focus" in client
                        ) {

                            return client.focus();

                        }

                    }


                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            "./"
                        );

                    }

                }
            )

        );

    }
);
