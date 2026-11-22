/* =========================================================
   COMPARTIR EVENTOS — WABBITAPP
   Busca imágenes en Dofuspedia y genera una tarjeta PNG.
========================================================= */

(() => {
    "use strict";

    const API_URL = "https://dofuspedia.fandom.com/es/api.php";
    const WIDTH = 800;
    const HEIGHT = 450;

    const TYPE_NAMES = {
        dungeon: "Mazmorra",
        quest: "Misión",
        infinite_dreams: "Sueños Infinitos",
        commission: "Encargo de gremio",
        raid: "Raid",
        farm: "Farm / Drop",
        wanted: "Busca y Captura",
        other: "Actividad del gremio"
    };

    const style = document.createElement("style");
    style.textContent = `
        .share-event-button {
            background: #344b63;
            color: #fff;
            border: 1px solid #496782;
            border-radius: 6px;
            padding: 7px 11px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        }
        .share-event-button:hover { background: #42617f; }
        .share-event-button:disabled { opacity: .65; cursor: wait; }
    `;
    document.head.appendChild(style);

    function addShareButtons() {
        const list = document.getElementById("eventsList");
        if (!list || typeof events === "undefined") return;

        list.querySelectorAll(".event-card").forEach(card => {
            if (card.querySelector(".share-event-button")) return;

            const eventId = Number(card.dataset.eventId);
            const event = events.find(item => Number(item.id) === eventId);
            const actions = card.querySelector(".event-actions");
            if (!event || !actions) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "share-event-button";
            button.textContent = "🖼️ Compartir";
            button.addEventListener("click", () => shareEventImage(event, button));
            actions.appendChild(button);
        });
    }

    function buildSearchTerm(event) {
        return String(event.name || "")
            .replace(/\\b(mazmorra|dungeon|raid|misión|misiones|actividad|evento|farm|drop)\\b/gi, " ")
            .replace(/\\s+/g, " ")
            .trim() || String(event.name || "").trim();
    }

    async function findDofusImage(event) {
        const term = buildSearchTerm(event);
        if (!term) return null;

        const params = new URLSearchParams({
            action: "query",
            generator: "search",
            gsrsearch: term,
            gsrnamespace: "6",
            gsrlimit: "12",
            prop: "imageinfo",
            iiprop: "url",
            iiurlwidth: "1200",
            format: "json",
            origin: "*"
        });

        const response = await fetch(`${API_URL}?${params.toString()}`);
        if (!response.ok) throw new Error("La API de Dofuspedia no respondió correctamente.");

        const data = await response.json();
        const pages = Object.values(data.query?.pages || {})
            .sort((a, b) => (a.index || 999) - (b.index || 999));

        const tokens = term.toLocaleLowerCase("es")
            .split(/[^\\p{L}\\p{N}]+/u)
            .filter(token => token.length > 2);

        const candidates = pages.map(page => {
            const title = String(page.title || "");
            const info = page.imageinfo?.[0];
            const url = info?.thumburl || info?.url;
            if (!url || !/\\.(png|jpe?g|webp|gif)(?:\\?|$)/i.test(url)) return null;

            const normalizedTitle = title.toLocaleLowerCase("es");
            const score = tokens.reduce((total, token) =>
                total + (normalizedTitle.includes(token) ? 3 : 0), 0);

            return { url, title, score, index: page.index || 999 };
        }).filter(Boolean);

        candidates.sort((a, b) => b.score - a.score || a.index - b.index);
        return candidates.slice(0, 5);
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("No se pudo cargar la imagen externa."));
            image.src = url;
        });
    }

    async function loadBestImage(event) {
        try {
            const candidates = await findDofusImage(event);
            for (const candidate of candidates || []) {
                try {
                    const image = await loadImage(candidate.url);
                    return { image, title: candidate.title };
                } catch (error) {
                    console.warn("No se pudo utilizar esta imagen de Dofuspedia:", candidate.title, error);
                }
            }
        } catch (error) {
            console.warn("No se pudo buscar en Dofuspedia:", error);
        }
        return null;
    }

    function drawCover(ctx, image) {
        const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
    }

    function drawContain(ctx, image, x, y, maxWidth, maxHeight) {
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
    }

    function wrapText(ctx, text, maxWidth, maxLines) {
        const words = String(text || "").split(/\\s+/);
        const lines = [];
        let line = "";

        for (const word of words) {
            const test = line ? line + " " + word : word;
            if (ctx.measureText(test).width > maxWidth && line) {
                lines.push(line);
                line = word;
                if (lines.length === maxLines - 1) break;
            } else {
                line = test;
            }
        }

        if (line && lines.length < maxLines) lines.push(line);
        if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
            let last = lines[maxLines - 1];
            while (ctx.measureText(last + "…").width > maxWidth && last.length) {
                last = last.slice(0, -1);
            }
            lines[maxLines - 1] = last.trimEnd() + "…";
        }
        return lines;
    }

    function drawTextLines(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        const lines = wrapText(ctx, text, maxWidth, maxLines);
        lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
        return lines.length;
    }

    function formatEventDate(event) {
        const date = new Date(`${event.event_date}T12:00:00`);
        if (typeof formatDate === "function") return formatDate(date);
        return new Intl.DateTimeFormat("es-ES", {
            day: "numeric", month: "long", year: "numeric"
        }).format(date);
    }

    function formatEventTime(event) {
        const time = typeof formatTimeOriginal === "function"
            ? formatTimeOriginal(event.event_time)
            : String(event.event_time || "").slice(0, 5);

        const zone = typeof formatTimezoneName === "function"
            ? formatTimezoneName(event.timezone)
            : event.timezone || "";

        return [time, zone].filter(Boolean).join(" · ");
    }

    function createEventCanvas(event, imageData) {
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#191919";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        if (imageData?.image) {
            const image = imageData.image;
            if (image.width / image.height > 1.25) {
                drawCover(ctx, image);
            } else {
                const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
                gradient.addColorStop(0, "#191919");
                gradient.addColorStop(.58, "#202020");
                gradient.addColorStop(1, "#292929");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                drawContain(ctx, image, 470, 35, 295, 380);
            }
        } else {
            const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
            gradient.addColorStop(0, "#29231c");
            gradient.addColorStop(.55, "#1b1b1b");
            gradient.addColorStop(1, "#111820");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }

        const overlay = ctx.createLinearGradient(0, 0, WIDTH, 0);
        overlay.addColorStop(0, "rgba(12,12,12,.96)");
        overlay.addColorStop(.55, "rgba(12,12,12,.78)");
        overlay.addColorStop(1, "rgba(12,12,12,.20)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.strokeStyle = "rgba(242,140,40,.85)";
        ctx.lineWidth = 3;
        ctx.strokeRect(14, 14, WIDTH - 28, HEIGHT - 28);
        ctx.fillStyle = "#f28c28";
        ctx.fillRect(42, 49, 5, 43);

        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f3a34f";
        ctx.font = "bold 17px Arial";
        ctx.fillText("AVENTUWEWOS DEL WEY WABBIT", 62, 68);

        ctx.fillStyle = "#d0d0d0";
        ctx.font = "bold 13px Arial";
        ctx.fillText((TYPE_NAMES[event.type] || "Actividad").toLocaleUpperCase("es"), 45, 125);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 43px Arial";
        const titleLines = drawTextLines(ctx, event.name || "Actividad del gremio", 45, 184, 680, 51, 2);

        const descriptionY = 184 + titleLines * 51 + 8;
        ctx.fillStyle = "#d1d1d1";
        ctx.font = "18px Arial";
        drawTextLines(ctx, event.description || "¡Te esperamos!", 47, descriptionY, 650, 27, 2);

        ctx.fillStyle = "#f3a34f";
        ctx.fillRect(45, 345, 710, 1);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 21px Arial";
        ctx.fillText(formatEventDate(event), 47, 385);

        ctx.fillStyle = "#e5e5e5";
        ctx.font = "18px Arial";
        ctx.fillText(formatEventTime(event), 47, 416);

        const participantCount = typeof getEventParticipants === "function"
            ? getEventParticipants(event.id).length
            : 0;

        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 19px Arial";
        ctx.fillText(`${participantCount} / ${event.capacity} PARTICIPANTES`, 750, 385);
        ctx.fillStyle = "#f3a34f";
        ctx.font = "bold 15px Arial";
        ctx.fillText("CALENDARIO DEL GREMIO · TAL KASHA", 750, 416);
        ctx.textAlign = "left";

        return canvas;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function safeFilename(name) {
        return String(name || "evento")
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() || "evento";
    }

    async function shareEventImage(event, button) {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "⏳ Preparando…";

        try {
            const imageData = await loadBestImage(event);
            const canvas = createEventCanvas(event, imageData);
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(result => result ? resolve(result) : reject(new Error("No se pudo generar el PNG.")), "image/png");
            });

            const filename = `evento-${safeFilename(event.name)}.png`;
            const file = new File([blob], filename, { type: "image/png" });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: event.name || "Actividad del gremio",
                    text: `${event.name} · ${formatEventDate(event)} · ${formatEventTime(event)}`
                });
            } else {
                downloadBlob(blob, filename);
                alert("La imagen PNG se ha descargado. Adjuntala manualmente al grupo de WhatsApp.");
            }
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.error("Error compartiendo evento:", error);
                alert("No se pudo preparar la imagen. Inténtalo de nuevo.");
            }
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    const list = document.getElementById("eventsList");
    if (list) {
        new MutationObserver(addShareButtons).observe(list, { childList: true, subtree: true });
        addShareButtons();
    }
    window.addEventListener("load", () => setTimeout(addShareButtons, 600));
    setTimeout(addShareButtons, 1200);
})();
