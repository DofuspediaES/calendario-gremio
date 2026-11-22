// ============================================
// COMPARTIR EVENTOS COMO IMAGEN
// Dofuspedia API + PNG generado en el navegador
// ============================================
(() => {
    "use strict";

    const API = "https://dofuspedia.fandom.com/es/api.php";
    const WIDTH = 800;
    const HEIGHT = 450;
    const imageCache = new Map();

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    function cleanText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function truncate(ctx, value, maxWidth) {
        let text = cleanText(value);
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length && ctx.measureText(text + "…").width > maxWidth) {
            text = text.slice(0, -1);
        }
        return text.trimEnd() + "…";
    }

    function formatEventDate(value) {
        if (typeof formatDate === "function") {
            return formatDate(new Date(value + "T12:00:00"));
        }
        return new Date(value + "T12:00:00").toLocaleDateString("es-ES", {
            day: "numeric", month: "long", year: "numeric"
        });
    }

    function getEventTime(event) {
        if (typeof formatTime === "function") {
            return formatTime(event.event_time, event.event_date, event.timezone);
        }
        return String(event.event_time || "").slice(0, 5);
    }

    function getSearchTerms(event) {
        const name = cleanText(event.name);
        const cleanName = name
            .replace(/^(mazmorra|dungeon|raid|misión|misiones|farm|drop|jefe|zona)\s+(de|del|la|el)\s+/i, "")
            .replace(/^(mazmorra|dungeon|raid|misión|misiones|farm|drop|jefe|zona)\s+/i, "")
            .trim();
        return [...new Set([cleanName, name].filter(term => term.length >= 3))];
    }

    function normalizeTitle(value) {
        return cleanText(value)
            .replace(/^(File|Archivo):/i, "")
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]/g, " ")
            .toLocaleLowerCase("es");
    }

    function scoreImage(page, searchTerm, role) {
        const title = normalizeTitle(page.title);
        const normalizedTerm = normalizeTitle(searchTerm);
        const info = page.imageinfo?.[0] || {};
        const width = info.thumbwidth || info.width || 0;
        const height = info.thumbheight || info.height || 0;
        const ratio = width && height ? width / height : 0;
        const excluded = /\b(lana|piel|hueso|cola|cuerno|ojo|diente|pluma|escama|recurso|ingrediente|capa|sombrero|amuleto|anillo|botas|cinturon|escudo|espada|martillo|set|conjunto|receta|pocima|pócima|gema|runa|llave|ficha|moneda|interfaz|inventario|icono|miniatura|thumb)\b/i;

        let score = 0;
        if (title === normalizedTerm) score += 18;
        else if (title.includes(normalizedTerm)) score += 12;

        const words = normalizedTerm.split(/\s+/).filter(word => word.length > 2);
        for (const word of words) {
            if (title.includes(word)) score += 4;
        }

        if (excluded.test(title)) score -= 30;

        if (role === "background") {
            if (ratio >= 1.35) score += 12;
            else if (ratio >= 1.1) score += 5;
            else score -= 8;

            if (/dungeon rusher|captura|zona|mazmorra|mapa|paisaje|fondo|sala|entorno/i.test(title)) score += 8;
            if (/monstruo|boss|jefe|personaje|npc/i.test(title)) score -= 3;
            if (width >= 900) score += 5;
        } else {
            if (ratio >= 0.75 && ratio <= 1.25) score += 10;
            else if (ratio < 0.75) score += 4;
            else score -= 8;

            if (/monstruo|boss|jefe|personaje/i.test(title)) score += 8;
            if (/dungeon rusher|captura|zona|mazmorra|mapa|paisaje|fondo|sala/i.test(title)) score -= 5;
            if (width >= 400) score += 3;
        }

        return score;
    }

    async function searchDofuspediaImages(event) {
        const cacheKey = cleanText(event.name);
        if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

        const promise = (async () => {
            const terms = getSearchTerms(event);
            const candidates = [];
            const seen = new Set();

            for (const term of terms) {
                const params = new URLSearchParams({
                    action: "query",
                    generator: "search",
                    gsrsearch: term,
                    gsrnamespace: "6",
                    gsrlimit: "30",
                    prop: "imageinfo",
                    iiprop: "url|size",
                    iiurlwidth: "1200",
                    format: "json",
                    origin: "*"
                });

                const response = await fetch(API + "?" + params.toString());
                if (!response.ok) throw new Error("No se pudo consultar Dofuspedia (HTTP " + response.status + ").");

                const data = await response.json();
                const pages = Object.values(data.query?.pages || {});

                for (const page of pages) {
                    if (seen.has(page.pageid)) continue;
                    seen.add(page.pageid);
                    candidates.push(page);
                }
            }

            const rank = role => candidates
                .map(page => ({
                    page,
                    score: Math.max(...terms.map(term => scoreImage(page, term, role)))
                }))
                .filter(item => item.score >= (role === "background" ? 15 : 18))
                .sort((a, b) => b.score - a.score);

            const bestBackground = rank("background")[0]?.page;
            const bestBoss = rank("boss")[0]?.page;

            const getUrl = page => {
                const info = page?.imageinfo?.[0];
                return info?.thumburl || info?.url || null;
            };

            return {
                background: bestBackground ? { url: getUrl(bestBackground), title: bestBackground.title } : null,
                boss: bestBoss ? { url: getUrl(bestBoss), title: bestBoss.title } : null
            };
        })();

        imageCache.set(cacheKey, promise);
        try {
            return await promise;
        } catch (error) {
            imageCache.delete(cacheKey);
            throw error;
        }
    }

    function loadCanvasImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("La imagen no permite su uso en el PNG (posible restricción CORS)."));
            image.src = url;
        });
    }

    function drawCover(ctx, image, x, y, width, height) {
        const scale = Math.max(width / image.width, height / image.height);
        const sw = width / scale;
        const sh = height / scale;
        const sx = (image.width - sw) / 2;
        const sy = (image.height - sh) / 2;
        ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    }

    function drawCard(event, participants, background, boss) {
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#17191e";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        if (background) {
            drawCover(ctx, background, 0, 0, WIDTH, HEIGHT);
        }

        const overlay = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        overlay.addColorStop(0, "rgba(12,13,16,.96)");
        overlay.addColorStop(.58, "rgba(12,13,16,.78)");
        overlay.addColorStop(1, "rgba(12,13,16,.52)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        if (boss) {
            const maxWidth = 245;
            const maxHeight = 285;
            const scale = Math.min(maxWidth / boss.width, maxHeight / boss.height);
            const width = boss.width * scale;
            const height = boss.height * scale;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,.65)";
            ctx.shadowBlur = 22;
            ctx.shadowOffsetY = 8;
            ctx.drawImage(boss, 770 - width, 218 - height / 2, width, height);
            ctx.restore();
        }

        ctx.strokeStyle = "#8d7548";
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

        ctx.fillStyle = "#c5b285";
        ctx.fillRect(42, 48, 4, 42);

        ctx.textAlign = "left";
        ctx.fillStyle = "#c5b285";
        ctx.font = "bold 17px Tahoma, sans-serif";
        ctx.fillText("AVENTUWEWOS DEL WEY WABBIT", 60, 66);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 43px Tahoma, sans-serif";
        ctx.fillText(truncate(ctx, event.name || "Actividad del gremio", boss ? 490 : 680), 60, 166);

        ctx.fillStyle = "#d4d0c8";
        ctx.font = "22px Tahoma, sans-serif";
        const description = cleanText(event.description);
        if (description) {
            ctx.fillText(truncate(ctx, description, boss ? 470 : 660), 62, 211);
        } else {
            ctx.fillText("¡Acompáñanos en esta aventura!", 62, 211);
        }

        ctx.strokeStyle = "rgba(197,178,133,.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(60, 250);
        ctx.lineTo(740, 250);
        ctx.stroke();

        const date = formatEventDate(event.event_date);
        const time = getEventTime(event);
        const count = participants.length;
        const capacity = Number(event.capacity) || 0;

        const blocks = [
            { x: 62, label: "FECHA", value: date },
            { x: 300, label: "HORA", value: time + " · Tu hora" },
            { x: 540, label: "PARTICIPANTES", value: count + " / " + capacity }
        ];

        blocks.forEach(block => {
            ctx.fillStyle = "#c5b285";
            ctx.font = "bold 13px Tahoma, sans-serif";
            ctx.fillText(block.label, block.x, 292);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px Tahoma, sans-serif";
            ctx.fillText(truncate(ctx, block.value, block.x === 540 ? 190 : 215), block.x, 326);
        });

        ctx.fillStyle = "#c5b285";
        ctx.font = "bold 16px Tahoma, sans-serif";
        ctx.fillText("¡TE ESPERAMOS!", 62, 390);

        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.font = "13px Tahoma, sans-serif";
        ctx.fillText("CALENDARIO DEL GREMIO · TAL KASHA", 738, 390);

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

    function makeShareText(event) {
        const date = formatEventDate(event.event_date);
        const time = getEventTime(event);
        const link = location.href.split("#")[0];
        return "⚔️ " + event.name + "\n📅 " + date + "\n🕐 " + time + " (tu hora)\n\nCalendario del gremio: " + link;
    }

    async function shareEvent(event, button) {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "⏳ Preparando imagen…";

        try {
            const participants = typeof getEventParticipants === "function"
                ? getEventParticipants(event.id)
                : [];

            let background = null;
            let boss = null;
            let imageWarning = "";

            try {
                const found = await searchDofuspediaImages(event);

                if (found?.background?.url) {
                    try {
                        background = await loadCanvasImage(found.background.url);
                    } catch (error) {
                        console.warn("No se pudo cargar el fondo:", error);
                    }
                }

                if (found?.boss?.url) {
                    try {
                        boss = await loadCanvasImage(found.boss.url);
                    } catch (error) {
                        console.warn("No se pudo cargar la imagen del jefe:", error);
                    }
                }

                if (!background && !boss) {
                    imageWarning = "No se encontraron imágenes compatibles para esta actividad.";
                }
            } catch (error) {
                console.warn("Imágenes de Dofuspedia no disponibles:", error);
                imageWarning = error.message;
            }

            const canvas = drawCard(event, participants, background, boss);
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(value => value ? resolve(value) : reject(new Error("No se pudo generar el PNG.")), "image/png");
            });

            const filename = ("evento-" + cleanText(event.name))
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "")
                .toLowerCase() + ".png";

            const file = new File([blob], filename, { type: "image/png" });
            const shareText = makeShareText(event);

            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                await navigator.share({ files: [file], title: event.name, text: shareText });
            } else {
                downloadBlob(blob, filename);
                const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(shareText);
                window.open(whatsappUrl, "_blank", "noopener");
                alert("La imagen se ha descargado. Adjunta el PNG en el grupo de WhatsApp.\n\n" +
                    (background && boss ? "Se utilizaron el fondo y la imagen del jefe de Dofuspedia." :
                    background ? "Se utilizó el fondo de Dofuspedia." :
                    boss ? "Se utilizó la imagen del jefe de Dofuspedia." :
                    "No se pudieron incorporar imágenes de Dofuspedia; se generó la tarjeta con fondo oscuro." +
                    (imageWarning ? "\nMotivo: " + imageWarning : "")));
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error compartiendo evento:", error);
                alert("No se pudo preparar la imagen: " + error.message);
            }
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    function addShareButtons() {
        const list = document.getElementById("eventsList");
        if (!list || typeof events === "undefined" || !Array.isArray(events)) return;

        list.querySelectorAll(".event-card").forEach(card => {
            if (card.querySelector(".share-event-button")) return;
            const eventId = String(card.dataset.eventId);
            const event = events.find(item => String(item.id) === String(card.dataset.eventId));
            if (!event) return;

            const actions = card.querySelector(".event-actions");
            if (!actions) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "share-event-button";
            button.textContent = "🖼️ Compartir";
            button.addEventListener("click", () => shareEvent(event, button));
            actions.appendChild(button);
        });
    }

    const list = document.getElementById("eventsList");
    if (list) {
        new MutationObserver(addShareButtons).observe(list, { childList: true, subtree: true });
    }
    document.addEventListener("DOMContentLoaded", addShareButtons);
    window.addEventListener("load", () => setTimeout(addShareButtons, 500));
    setTimeout(addShareButtons, 1200);
    console.log("🖼️ Compartir eventos preparado.");
})();
