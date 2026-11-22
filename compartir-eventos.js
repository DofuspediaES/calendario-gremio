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

    const TIMEZONES = [
        {flag:"🇵🇪",zone:"America/Lima"},{flag:"🇨🇴",zone:"America/Bogota"},
        {flag:"🇪🇨",zone:"America/Guayaquil"},{flag:"🇻🇪",zone:"America/Caracas"},
        {flag:"🇧🇴",zone:"America/La_Paz"},{flag:"🇨🇱",zone:"America/Santiago"},
        {flag:"🇦🇷",zone:"America/Argentina/Buenos_Aires"},{flag:"🇺🇾",zone:"America/Montevideo"},
        {flag:"🇵🇾",zone:"America/Asuncion"},{flag:"🇧🇷",zone:"America/Sao_Paulo"},
        {flag:"🇲🇽",zone:"America/Mexico_City"},{flag:"🇲🇽",zone:"America/Cancun"},
        {flag:"🇨🇷",zone:"America/Costa_Rica"},{flag:"🇵🇦",zone:"America/Panama"},
        {flag:"🇩🇴",zone:"America/Santo_Domingo"},{flag:"🇺🇸",zone:"America/New_York"},
        {flag:"🇺🇸",zone:"America/Los_Angeles"},{flag:"🇨🇦",zone:"America/Toronto"},
        {flag:"🇪🇸",zone:"Europe/Madrid"},{flag:"🇫🇷",zone:"Europe/Paris"},
        {flag:"🇬🇧",zone:"Europe/London"}
    ];

    function getEventInstant(event) {
        if (typeof eventDateTimeToDate === "function") return eventDateTimeToDate(event.event_date,event.event_time,event.timezone||"America/Lima");
        const [year,month,day]=String(event.event_date||"").split("-").map(Number);
        const [hours,minutes]=String(event.event_time||"").split(":").map(Number);
        if (![year,month,day,hours,minutes].every(Number.isFinite)) return null;
        const approximate=new Date(Date.UTC(year,month-1,day,hours,minutes));
        const zone=event.timezone||"America/Lima";
        const parts=new Intl.DateTimeFormat("en-US",{timeZone:zone,timeZoneName:"longOffset"}).formatToParts(approximate);
        const offset=parts.find(part=>part.type==="timeZoneName")?.value||"GMT";
        const match=offset.match(/GMT([+-])(\d{2}):(\d{2})/);
        if(!match)return approximate;
        const mins=(Number(match[2])*60+Number(match[3]))*(match[1]==="+"?1:-1);
        return new Date(approximate.getTime()-mins*60000);
    }

    function getEventTime(event,timezone) {
        const instant=getEventInstant(event);
        if(!instant)return String(event.event_time||"").slice(0,5);
        return new Intl.DateTimeFormat("es-PE",{timeZone:timezone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(instant);
    }

    function getEventTypeLabel(type) {
        return ({dungeon:"MAZMORRA",quest:"MISIONES",infinite_dreams:"SUEÑOS INFINITOS",commission:"ENCARGO",raid:"RAID",farm:"DROP / FARM",wanted:"BUSCA Y CAPTURA",other:"OTRA ACTIVIDAD"})[type]||"ACTIVIDAD";
    }

    function wrapCanvasText(ctx,text,maxWidth) {
        const words=String(text||"").split(/\s+/),lines=[];
        let line="";
        for(const word of words){const candidate=line?line+" "+word:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;}
        if(line)lines.push(line);
        return lines;
    }

    function getImagePlan(event) {
        const original = cleanText(event.name);
        const normalized = normalizeTitle(original).replace(/\([^)]*\)|\[[^\]]*\]/g," ").replace(/\s+/g," ").trim();
        const core = normalized.replace(/^(expedicion|mazmorra|dungeon|raid|grupo|salida)\s+(de|del|para)\s+/i,"").trim();
        if (normalized.includes("reina amirukam")) return { background:["Recuerdo de Imagiro"], bosses:["Reina Amirukam"] };
        if (normalized.includes("sombra")) return { background:["Piramide de Sombra"], bosses:["Sombra"] };
        if (normalized.includes("vortex") && normalized.includes("kontatras")) return { background:["Ojo de Vórtex","Ojo de Vortex"], bosses:["Vórtex","Vortex","Conde Kontatrás","Conde Kontatras"] };
        if (normalized.includes("minotot")) return {
            background:["Laberinto del Minotauroro","Mazmorra del Minotot","Minotot"],
            bosses:["Minotot"]
        };
        const terms = core.split(/\s+(?:y|&|\+)\s+/i).map(cleanText).filter(Boolean);
        const bosses = terms.length>1 ? terms : [core || normalized || original];
        return { background:[...new Set([original,normalized,core].filter(Boolean))], bosses };
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
        const excluded=/\b(lana|piel|hueso|cola|cuerno|diente|pluma|escama|recurso|ingrediente|capa|sombrero|amuleto|anillo|botas|cinturon|escudo|espada|martillo|set|conjunto|receta|pocima|gema|runa|llave|ficha|moneda|interfaz|inventario|icono|miniatura|thumb)\b/i;
        const queryWords=query.split(/\s+/).filter(w=>w.length>2);
        let score=title===query?32:title.includes(query)?22:0;
        for(const word of queryWords)if(title.includes(word))score+=6;
        if(queryWords.length===1 && title.split(" ").some(word=>word===queryWords[0]))score+=10;
        if(excluded.test(title))score-=30;
        if(role==="background"){
            if(ratio>=1.35)score+=12;else if(ratio>=1.1)score+=5;else score-=8;
            if(/dungeon rusher|captura|zona|mazmorra|mapa|paisaje|fondo|sala|entorno|recuerdo|piramide/i.test(title))score+=10;
            if(/monstruo|boss|jefe|personaje|npc|minotot|amirukam|vortex|kontatras|sombra/i.test(title))score-=40;
            if(width>=900)score+=5;
        }else{
            if(ratio>=.75&&ratio<=1.25)score+=10;else if(ratio<.75)score+=4;else score-=8;
            if(/monstruo|boss|jefe|personaje|reina|minotot|vortex|kontatras|sombra/i.test(title))score+=8;
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

    function drawCard(event,participants,background,bosses) {
        const canvas=document.createElement("canvas");canvas.width=WIDTH;canvas.height=HEIGHT;
        const ctx=canvas.getContext("2d");
        ctx.fillStyle="#24272b";ctx.fillRect(0,0,WIDTH,HEIGHT);
        if(background)drawCover(ctx,background,0,0,WIDTH,HEIGHT);
        const overlay=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
        overlay.addColorStop(0,"rgba(25,27,30,.96)");overlay.addColorStop(.58,"rgba(25,27,30,.86)");overlay.addColorStop(1,"rgba(25,27,30,.68)");
        ctx.fillStyle=overlay;ctx.fillRect(0,0,WIDTH,HEIGHT);
        if(bosses?.length){
            const maxHeight=250,count=bosses.length,slotWidth=count>1?Math.min(245,(260-(count-1)*4)/count):245;
            bosses.forEach((boss,index)=>{if(!boss)return;const scale=Math.min(slotWidth/boss.width,maxHeight/boss.height),w=boss.width*scale,h=boss.height*scale,x=count>1?520+index*(slotWidth+4)+(slotWidth-w)/2:770-w;ctx.save();ctx.shadowColor="rgba(0,0,0,.65)";ctx.shadowBlur=22;ctx.shadowOffsetY=8;ctx.drawImage(boss,x,215-h/2,w,h);ctx.restore();});
        }
        ctx.strokeStyle="#f73d00";ctx.lineWidth=3;ctx.strokeRect(16,16,WIDTH-32,HEIGHT-32);
        ctx.fillStyle="#f73d00";ctx.fillRect(42,45,5,43);
        ctx.textAlign="left";ctx.fillStyle="#f73d00";ctx.font="bold 16px Tahoma,sans-serif";ctx.fillText("AVENTUWEWOS DEL WEY WABBIT",60,63);

        const titleWidth=bosses?.length?440:675;
        let fontSize=39,lines=[];
        do{ctx.font="bold "+fontSize+"px Tahoma,sans-serif";lines=wrapCanvasText(ctx,event.name||"Actividad del gremio",titleWidth);if(lines.length<=5||fontSize<=20)break;fontSize-=2;}while(fontSize>18);
        ctx.font="bold "+fontSize+"px Tahoma,sans-serif";ctx.fillStyle="#fff";
        const lineHeight=Math.round(fontSize*1.12),startY=lines.length>2?105:151;
        lines.forEach((line,i)=>ctx.fillText(line,60,startY+i*lineHeight));
        const typeLabel=getEventTypeLabel(event.type);

        ctx.strokeStyle="rgba(247,61,0,.72)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,250);ctx.lineTo(740,250);ctx.stroke();
        const blocks=[
            {x:62,label:"FECHA",value:formatEventDate(event.event_date)},
            {x:300,label:"TIPO DE ACTIVIDAD",value:typeLabel},
            {x:540,label:"PARTICIPANTES",value:participants.length+" / "+(Number(event.capacity)||0)}
        ];
        blocks.forEach(block=>{ctx.fillStyle="#f73d00";ctx.font="bold 12px Tahoma,sans-serif";ctx.fillText(block.label,block.x,280);ctx.fillStyle="#fff";ctx.font="bold 19px Tahoma,sans-serif";ctx.fillText(truncate(ctx,block.value,block.x===540?190:215),block.x,307);});
        ctx.fillStyle="#f73d00";ctx.font="bold 12px Tahoma,sans-serif";ctx.fillText("HORARIOS",62,341);
        TIMEZONES.forEach((item,index)=>{const col=index%5,row=Math.floor(index/5),x=62+col*135,y=369+row*23;ctx.textAlign="left";ctx.font="16px Tahoma,sans-serif";ctx.fillStyle="#fff";ctx.fillText(item.flag,x,y);ctx.font="bold 13px Tahoma,sans-serif";ctx.fillStyle="#e4e6e8";ctx.fillText(getEventTime(event,item.zone),x+31,y);});
        ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="11px Tahoma,sans-serif";ctx.fillText("CALENDARIO DEL GREMIO · TAL KASHA",738,438);
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
        const times=TIMEZONES.map(item=>item.flag+" "+getEventTime(event,item.zone)).join("  ·  ");
        return "⚔️ "+event.name+" ["+getEventTypeLabel(event.type)+"]\\n📅 "+formatEventDate(event.event_date)+"\\n"+times+"\\n\\nCalendario del gremio: "+location.href.split("#")[0];
    }

    function showPreview(canvas,filename,shareText,eventName,imageSummary,selected) {
        const old=document.querySelector(".share-preview-modal");if(old)old.remove();
        const modal=document.createElement("div");modal.className="share-preview-modal";
        modal.innerHTML='<div class="share-preview-panel" role="dialog" aria-modal="true" aria-label="Vista previa para compartir"><button type="button" class="share-preview-close" aria-label="Cerrar">×</button><h2>Vista previa</h2><p class="share-preview-subtitle"></p><img class="share-preview-image" alt="Tarjeta del evento"><p class="share-preview-note"></p><details class="share-image-search"><summary>Buscar imágenes en Dofuspedia</summary><div class="share-image-search-form"><input type="search" class="share-image-query" placeholder="Ej. Recuerdo de Imagiro, Reina Amirukam…"><button type="button" class="share-image-search-button">Buscar</button></div><p class="share-image-help">Busca una imagen y elige si quieres usarla como fondo o como imagen de jefe. Puedes añadir más de un jefe.</p><div class="share-image-results"></div></details><div class="share-preview-actions"><button type="button" class="share-preview-download">⬇️ Descargar PNG</button><button type="button" class="share-preview-whatsapp">🟢 WhatsApp Web</button><button type="button" class="share-preview-native">↗ Compartir…</button></div></div>';
        const image=modal.querySelector(".share-preview-image"),note=modal.querySelector(".share-preview-note"),query=modal.querySelector(".share-image-query"),results=modal.querySelector(".share-image-results"),searchButton=modal.querySelector(".share-image-search-button");
        modal.querySelector(".share-preview-subtitle").textContent=eventName;
        let imageUrl=null,currentBlob=null,currentCanvas=canvas,currentShareText=shareText;
        const updateNative=()=>{const file=currentBlob?new File([currentBlob],filename,{type:"image/png"}):null;native.hidden=!file||!navigator.share||!navigator.canShare||!navigator.canShare({files:[file]});};
        const update=async()=>{
            currentBlob=await new Promise((resolve,reject)=>currentCanvas.toBlob(v=>v?resolve(v):reject(new Error("No se pudo generar el PNG.")),"image/png"));
            if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(currentBlob);image.src=imageUrl;updateNative();
        };
        const redraw=async()=>{
            currentCanvas=drawCard(window.__shareEventData.event,window.__shareEventData.participants,selected.background,selected.bosses);
            currentShareText=makeShareText(window.__shareEventData.event);
            await update();
        };
        const close=()=>{modal.remove();if(imageUrl)URL.revokeObjectURL(imageUrl);};
        modal.querySelector(".share-preview-close").addEventListener("click",close);
        modal.addEventListener("click",e=>{if(e.target===modal)close();});
        modal.querySelector(".share-preview-download").addEventListener("click",()=>downloadBlob(currentBlob,filename));
        modal.querySelector(".share-preview-whatsapp").addEventListener("click",()=>{downloadBlob(currentBlob,filename);window.open("https://web.whatsapp.com/send?text="+encodeURIComponent(currentShareText),"_blank");});
        const native=modal.querySelector(".share-preview-native");
        native.addEventListener("click",async()=>{try{const file=new File([currentBlob],filename,{type:"image/png"});const promise=navigator.share({files:[file],title:eventName,text:currentShareText});await promise;}catch(error){if(error.name!=="AbortError")alert("No se pudo compartir: "+error.message);}});
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
                    bg.addEventListener("click",async()=>{bg.disabled=true;try{selected.background=await loadCanvasImage(url);await redraw();note.textContent="Fondo seleccionado y añadido a la vista previa: "+title.textContent;}catch(e){alert("No se pudo usar esta imagen: "+e.message);}bg.disabled=false;});
                    const boss=document.createElement("button");boss.type="button";boss.textContent="Añadir como jefe";
                    boss.addEventListener("click",async()=>{boss.disabled=true;try{selected.bosses.push(await loadCanvasImage(url));await redraw();note.textContent="Jefe añadido y mostrado en la vista previa: "+title.textContent+" ("+selected.bosses.length+").";}catch(e){alert("No se pudo usar esta imagen: "+e.message);}boss.disabled=false;});
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
