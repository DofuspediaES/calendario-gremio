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

    function normalizeTitle(value) {
        return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .replace(/^(file|archivo):/i, "").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    }
    function getImagePlan(event) {
        const name = normalizeTitle(event.name);
        if (name.includes("reina amirukam")) return { background:["Recuerdo de Imagiro"], bosses:["Reina Amirukam"] };
        if (name.includes("sombra")) return { background:["Piramide de Sombra"], bosses:["Sombra"] };
        if (name.includes("vortex") && name.includes("kontatras")) return { background:["Ojo de Vortex"], bosses:["Vortex","Conde Kontatras"] };
        const terms = cleanText(event.name).split(/\s+(?:y|&|\+)\s+/i).map(cleanText).filter(Boolean);
        return { background:[cleanText(event.name)], bosses:terms.length>1?terms:[cleanText(event.name)] };
    }
    async function searchPages(term) {
        const params = new URLSearchParams({action:"query",generator:"search",gsrsearch:term,gsrnamespace:"6",gsrlimit:"30",prop:"imageinfo",iiprop:"url|size",iiurlwidth:"1200",format:"json",origin:"*"});
        const response = await fetch(API+"?"+params.toString());
        if (!response.ok) throw new Error("No se pudo consultar Dofuspedia (HTTP "+response.status+").");
        const data = await response.json();
        return Object.values(data.query?.pages||{});
    }
    function scoreImage(page, term, role) {
        const title=normalizeTitle(page.title), query=normalizeTitle(term), info=page.imageinfo?.[0]||{};
        const width=info.thumbwidth||info.width||0, height=info.thumbheight||info.height||0, ratio=width&&height?width/height:0;
        const excluded=/\b(lana|piel|hueso|cola|cuerno|ojo|diente|pluma|escama|recurso|ingrediente|capa|sombrero|amuleto|anillo|botas|cinturon|escudo|espada|martillo|set|conjunto|receta|pocima|gema|runa|llave|ficha|moneda|interfaz|inventario|icono|miniatura|thumb)\b/i;
        let score=title===query?24:title.includes(query)?15:0;
        for(const word of query.split(/\s+/).filter(w=>w.length>2))if(title.includes(word))score+=4;
        if(excluded.test(title))score-=30;
        if(role==="background"){
            if(ratio>=1.35)score+=12;else if(ratio>=1.1)score+=5;else score-=8;
            if(/dungeon rusher|captura|zona|mazmorra|mapa|paisaje|fondo|sala|entorno|recuerdo|piramide/i.test(title))score+=10;
            if(/monstruo|boss|jefe|personaje|npc/i.test(title))score-=3;
            if(width>=900)score+=5;
        }else{
            if(ratio>=.75&&ratio<=1.25)score+=10;else if(ratio<.75)score+=4;else score-=8;
            if(/monstruo|boss|jefe|personaje|reina|vortex|kontatras|sombra/i.test(title))score+=8;
            if(/dungeon rusher|captura|zona|mazmorra|mapa|paisaje|fondo|sala/i.test(title))score-=5;
            if(width>=300)score+=3;
        }
        return score;
    }
    async function findBestImage(terms,role) {
        const all=[],seen=new Set();
        for(const term of terms){if(!term)continue;for(const page of await searchPages(term)){if(!seen.has(page.pageid)){seen.add(page.pageid);all.push(page);}}}
        const ranked=all.map(page=>({page,score:Math.max(...terms.map(term=>scoreImage(page,term,role)))})).sort((a,b)=>b.score-a.score);
        const page=ranked.find(item=>item.score>=(role==="background"?15:18))?.page,info=page?.imageinfo?.[0];
        return info?{url:info.thumburl||info.url,title:page.title}:null;
    }
    async function searchDofuspediaImages(event) {
        const plan=getImagePlan(event),background=await findBestImage(plan.background,"background"),bosses=[];
        for(const term of plan.bosses){const image=await findBestImage([term],"boss");if(image)bosses.push(image);}
        return {background,bosses};
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

    function drawCard(event, participants, background, bosses) {
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

        if (bosses?.length) {
            const maxHeight=270,count=bosses.length,slotWidth=count>1?118:245;
            bosses.forEach((boss,index)=>{
                if(!boss)return;
                const scale=Math.min(slotWidth/boss.width,maxHeight/boss.height),width=boss.width*scale,height=boss.height*scale;
                const x=count>1?550+index*125+(slotWidth-width)/2:770-width;
                ctx.save();ctx.shadowColor="rgba(0,0,0,.65)";ctx.shadowBlur=22;ctx.shadowOffsetY=8;
                ctx.drawImage(boss,x,218-height/2,width,height);ctx.restore();
            });
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
        ctx.fillText(truncate(ctx, event.name || "Actividad del gremio", bosses?.length ? 460 : 680), 60, 166);

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

    function showPreview(canvas,filename,shareText,eventName,imageSummary,selected) {
        const old=document.querySelector(".share-preview-modal");if(old)old.remove();
        const modal=document.createElement("div");modal.className="share-preview-modal";
        modal.innerHTML='<div class="share-preview-panel" role="dialog" aria-modal="true" aria-label="Vista previa para compartir"><button type="button" class="share-preview-close" aria-label="Cerrar">×</button><h2>Vista previa</h2><p class="share-preview-subtitle"></p><img class="share-preview-image" alt="Tarjeta del evento"><p class="share-preview-note"></p><details class="share-image-search"><summary>Buscar imágenes en Dofuspedia</summary><div class="share-image-search-form"><input type="search" class="share-image-query" placeholder="Ej. Recuerdo de Imagiro, Reina Amirukam…"><button type="button" class="share-image-search-button">Buscar</button></div><p class="share-image-help">Busca una imagen y elige si quieres usarla como fondo o como imagen de jefe. Puedes añadir más de un jefe.</p><div class="share-image-results"></div></details><div class="share-preview-actions"><button type="button" class="share-preview-download">⬇️ Descargar PNG</button><button type="button" class="share-preview-whatsapp">🟢 WhatsApp Web</button><button type="button" class="share-preview-native">↗ Compartir…</button></div></div>';
        const image=modal.querySelector(".share-preview-image"),note=modal.querySelector(".share-preview-note"),query=modal.querySelector(".share-image-query"),results=modal.querySelector(".share-image-results"),searchButton=modal.querySelector(".share-image-search-button");
        modal.querySelector(".share-preview-subtitle").textContent=eventName;
        let imageUrl=null,currentBlob=null;
        const update=async()=>{
            currentBlob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error("No se pudo generar el PNG.")),"image/png"));
            if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(currentBlob);image.src=imageUrl;
        };
        const close=()=>{modal.remove();if(imageUrl)URL.revokeObjectURL(imageUrl);};
        modal.querySelector(".share-preview-close").addEventListener("click",close);
        modal.addEventListener("click",e=>{if(e.target===modal)close();});
        modal.querySelector(".share-preview-download").addEventListener("click",()=>downloadBlob(currentBlob,filename));
        modal.querySelector(".share-preview-whatsapp").addEventListener("click",()=>{downloadBlob(currentBlob,filename);window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(shareText),"_blank");});
        const native=modal.querySelector(".share-preview-native");
        const updateNative=()=>{const file=currentBlob?new File([currentBlob],filename,{type:"image/png"}):null;native.hidden=!file||!navigator.share||!navigator.canShare||!navigator.canShare({files:[file]});};
        native.addEventListener("click",async()=>{try{const file=new File([currentBlob],filename,{type:"image/png"});const promise=navigator.share({files:[file],title:eventName,text:shareText});await promise;}catch(error){if(error.name!=="AbortError")alert("No se pudo compartir: "+error.message);}});
        const doSearch=async()=>{
            const term=cleanText(query.value);if(!term)return;
            searchButton.disabled=true;searchButton.textContent="Buscando…";results.innerHTML="";
            try{
                const pages=await searchPages(term);
                pages.sort((a,b)=>scoreImage(b,term,"boss")-scoreImage(a,term,"boss"));
                if(!pages.length){results.textContent="No se encontraron imágenes. Prueba con otro término.";return;}
                pages.slice(0,18).forEach(page=>{
                    const info=page.imageinfo?.[0],url=info?.thumburl||info?.url;if(!url)return;
                    const item=document.createElement("div");item.className="share-image-result";
                    const img=document.createElement("img");img.src=url;img.alt=page.title;img.loading="lazy";
                    const title=document.createElement("span");title.textContent=page.title.replace(/^(File|Archivo):/i,"");
                    const bg=document.createElement("button");bg.type="button";bg.textContent="Usar de fondo";
                    bg.addEventListener("click",async()=>{bg.disabled=true;try{selected.background=await loadCanvasImage(url);canvas.width=WIDTH;canvas.height=HEIGHT;drawCard(window.__shareEventData.event,window.__shareEventData.participants,selected.background,selected.bosses);await update();note.textContent="Fondo seleccionado: "+title.textContent;}catch(e){alert("No se pudo usar esta imagen: "+e.message);}bg.disabled=false;});
                    const boss=document.createElement("button");boss.type="button";boss.textContent="Añadir como jefe";
                    boss.addEventListener("click",async()=>{boss.disabled=true;try{selected.bosses.push(await loadCanvasImage(url));canvas.width=WIDTH;canvas.height=HEIGHT;drawCard(window.__shareEventData.event,window.__shareEventData.participants,selected.background,selected.bosses);await update();note.textContent="Jefe añadido: "+title.textContent+" ("+selected.bosses.length+").";}catch(e){alert("No se pudo usar esta imagen: "+e.message);}boss.disabled=false;});
                    item.append(img,title,bg,boss);results.appendChild(item);
                });
            }catch(error){results.textContent="No se pudo buscar en Dofuspedia: "+error.message;}
            finally{searchButton.disabled=false;searchButton.textContent="Buscar";}
        };
        searchButton.addEventListener("click",doSearch);query.addEventListener("keydown",e=>{if(e.key==="Enter")doSearch();});
        document.body.appendChild(modal);note.textContent=imageSummary;update().then(updateNative).catch(e=>note.textContent=e.message);
    }

    async function shareEvent(event,button) {
        const original=button.textContent;button.disabled=true;button.textContent="⏳ Preparando imagen…";
        try{
            const participants=typeof getEventParticipants==="function"?getEventParticipants(event.id):[];
            const selected={background:null,bosses:[]};let warning="";
            try{
                const found=await searchDofuspediaImages(event);
                if(found.background?.url){try{selected.background=await loadCanvasImage(found.background.url);}catch(e){console.warn("No se pudo cargar el fondo:",e);}}
                for(const boss of found.bosses||[]){try{selected.bosses.push(await loadCanvasImage(boss.url));}catch(e){console.warn("No se pudo cargar jefe:",e);}}
                if(!selected.background&&!selected.bosses.length)warning="No se encontraron imágenes compatibles para esta actividad.";
            }catch(e){console.warn("Imágenes de Dofuspedia no disponibles:",e);warning=e.message;}
            const canvas=drawCard(event,participants,selected.background,selected.bosses);
            const filename=("evento-"+cleanText(event.name)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-]+/g,"-").replace(/^-|-$/g,"").toLowerCase()+".png";
            const summary=selected.background&&selected.bosses.length?"Se utilizó el fondo y "+selected.bosses.length+" imagen(es) de jefe. Puedes cambiarlos o añadir otros."
                :selected.background?"Se utilizó el fondo de Dofuspedia. Puedes buscar y añadir jefes."
                :selected.bosses.length?"Se utilizaron "+selected.bosses.length+" imagen(es) de jefe. Puedes buscar un fondo."
                :"La tarjeta se generó sin imágenes. Puedes buscarlas manualmente. "+warning;
            window.__shareEventData={event,participants};
            showPreview(canvas,filename,makeShareText(event),event.name,summary,selected);
        }catch(error){console.error("Error preparando evento:",error);alert("No se pudo preparar la imagen: "+error.message);}
        finally{button.disabled=false;button.textContent=original;}
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
