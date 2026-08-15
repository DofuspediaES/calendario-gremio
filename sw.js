// ============================================
// SERVICE WORKER - CALENDARIO DEL GREMIO
// ============================================

// ============================================
// INSTALACIÓN
// ============================================
self.addEventListener("install", (event) => {
    console.log("Service Worker instalado");
    self.skipWaiting();
});

// ============================================
// ACTIVACIÓN
// ============================================
self.addEventListener("activate", (event) => {
    console.log("Service Worker activado");
    event.waitUntil(self.clients.claim());
});

// ============================================
// NOTIFICACIÓN PUSH
// ============================================
self.addEventListener("push", (event) => {
    let data = {
        title: "⚔️ Calendario del Gremio",
        body: "Tienes una nueva actividad en el gremio.",
        icon: "/icon-192.png"
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || "/icon-192.png",
        badge: data.icon || "/icon-192.png",
        vibrate: [200, 100, 200],
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ============================================
// CLICK EN NOTIFICACIÓN
// ============================================
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            // Si la página web ya está abierta en una pestaña, enfócala
            for (const client of clientList) {
                if ("focus" in client) {
                    return client.focus();
                }
            }
            // Si la pestaña está cerrada, ábrela
            if (clients.openWindow) {
                return clients.openWindow("./");
            }
        })
    );
});
