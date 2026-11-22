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

    function normalizeTitle(value) {
        return cleanText(value).replace(/\.(png|jpe?g|gif|webp|svg)$/i, "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            .replace(/^(file|archivo):/i, "").replace(/[_-]+/g, " ").replace(/[^a-z0-9 ]/g, " ")
            .replace(/\s+/g, " ").trim();
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
        {flag:"🇵🇪",code:"pe",zone:"America/Lima"},
        {flag:"🇨🇴",code:"co",zone:"America/Bogota"},
        {flag:"🇪🇨",code:"ec",zone:"America/Guayaquil"},
        {flag:"🇻🇪",code:"ve",zone:"America/Caracas"},
        {flag:"🇧🇴",code:"bo",zone:"America/La_Paz"},
        {flag:"🇨🇱",code:"cl",zone:"America/Santiago"},
        {flag:"🇦🇷",code:"ar",zone:"America/Argentina/Buenos_Aires"},
        {flag:"🇺🇾",code:"uy",zone:"America/Montevideo"},
        {flag:"🇵🇾",code:"py",zone:"America/Asuncion"},
        {flag:"🇲🇽",code:"mx",zone:"America/Tijuana"},
        {flag:"🇲🇽",code:"mx",zone:"America/Hermosillo"},
        {flag:"🇲🇽",code:"mx",zone:"America/Mexico_City"},
        {flag:"🇲🇽",code:"mx",zone:"America/Cancun"},
        {flag:"🇨🇷",code:"cr",zone:"America/Costa_Rica"},
        {flag:"🇵🇦",code:"pa",zone:"America/Panama"},
        {flag:"🇩🇴",code:"do",zone:"America/Santo_Domingo"},
        {flag:"🇪🇸",code:"es",zone:"Europe/Madrid"}
    ];
    const flagCache = new Map();

    async function loadFlag(code) {
        if (!flagCache.has(code)) {
            const points = [...code.toUpperCase()].map(ch => (0x1f1e6 + ch.charCodeAt(0) - 65).toString(16)).join("-");
            flagCache.set(code, loadCanvasImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/" + points + ".png").catch(() => null));
        }
        return flagCache.get(code);
    }

    function groupTimes(event) {
        const groups = new Map();
        TIMEZONES.forEach(item => {
            const time = getEventTime(event, item.zone);
            if (!groups.has(time)) groups.set(time, []);
            if (!groups.get(time).some(country => country.zone === item.zone)) groups.get(time).push(item);
        });
        return [...groups.entries()].map(([time, countries]) => ({time, countries}))
            .sort((a,b)=>a.time.localeCompare(b.time));
    }

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

    function stripEventAnnotations(value) {
        let text=cleanText(value);
        // Quita aclaraciones entre paréntesis/corchetes, incluso si hay más de una.
        let previous;
        do {
            previous=text;
            text=text.replace(/\([^()]*\)|\[[^\[\]]*\]/g," ");
        } while(text!==previous);
        return text.replace(/\s+/g," ").trim();
    }
    function cleanBossTerm(value) {
        return stripEventAnnotations(value)
            .replace(/^(expedicion|mazmorra|dungeon|raid|grupo|salida|actividad|evento)\s+(?:de|del|para)\s+/i,"")
            .replace(/\b(?:con|sin|sans|com)\s+(?:idolo|idol|idole)s?\b/gi," ")
            .replace(/\b(?:duo|trio|score|logro|exito|exitos|hardcore|estatua|especial|primer[oa]?)\b/gi," ")
            .replace(/\s+/g," ").trim();
    }
    function getImagePlan(event) {
        const original=cleanText(event.name);
        const withoutNotes=stripEventAnnotations(original);
        const normalized=normalizeTitle(withoutNotes);
        const core=cleanBossTerm(withoutNotes);
        if(normalized.includes("reina amirukam"))return {background:["Recuerdo de Imagiro"],bosses:["Reina Amirukam"]};
        if(normalized.includes("sombra"))return {background:["Piramide de Sombra"],bosses:["Sombra"]};
        if(normalized.includes("vortex")&&normalized.includes("kontatras"))return {background:["Ojo de Vórtex","Ojo de Vortex"],bosses:["Vórtex","Vortex","Conde Kontatrás","Conde Kontatras"]};
        if(normalized.includes("minotot"))return {background:["Laberinto del Minotauroro","Mazmorra del Minotot","Minotot"],bosses:["Minotot"]};
        const terms=core.split(/\s+(?:y|&|\+)\s+/i).map(cleanBossTerm).filter(Boolean);
        return {background:[...new Set([original,withoutNotes,normalized,core].filter(Boolean))],bosses:terms.length>1?terms:[core||normalized||original]};
    }
    function getSearchVariants(term) {
        const clean=cleanText(term);
        const noNotes=cleanBossTerm(clean);
        const normalized=normalizeTitle(noNotes);
        const variants=new Set([clean,noNotes,normalized].filter(Boolean));
        // Prueba variantes con una vocal acentuada cada vez; evita la explosión combinatoria.
        const accentOptions={a:"á",e:"é",i:"í",o:"ó",u:"ú"};
        const words=normalized.split(/\s+/).filter(Boolean);
        words.forEach((word,wordIndex)=>{
            [...word].forEach((char,charIndex)=>{
                const accented=accentOptions[char];
                if(!accented)return;
                const changed=word.slice(0,charIndex)+accented+word.slice(charIndex+1);
                const phrase=words.map((part,index)=>index===wordIndex?changed:part).join(" ");
                variants.add(phrase);
            });
        });
        return [...variants].filter(Boolean).slice(0,10);
    }
    async function searchPages(term) {
        const variants=getSearchVariants(term);
        const extensions=[".png",".jpg",".jpeg",".webp",".gif"];
        const searchTerms=new Set();
        variants.forEach(value=>{
            searchTerms.add(value);
            if(!/\.(png|jpe?g|webp|gif|svg)$/i.test(value)){
                extensions.forEach(extension=>searchTerms.add(value+extension));
            }
        });
        const terms=[...searchTerms].slice(0,50);
        const searchExpression=terms.map(value=>'"'+value.replace(/"/g,"")+'"').join(" OR ");
        const params=new URLSearchParams({action:"query",list:"search",srsearch:searchExpression,srnamespace:"6",srlimit:"50",format:"json",origin:"*"});
        const response=await fetch(API+"?"+params.toString());
        if(!response.ok)throw new Error("No se pudo consultar Dofuspedia (HTTP "+response.status+").");
        const data=await response.json();
        const searchPages=data.query?.search||[];
        // La consulta de títulos exactos incluye las extensiones: algunos archivos solo aparecen así.
        const exactParams=new URLSearchParams({action:"query",titles:terms.map(value=>"File:"+value).join("|"),prop:"info",format:"json",origin:"*"});
        const exactResponse=await fetch(API+"?"+exactParams.toString());
        if(!exactResponse.ok)throw new Error("No se pudieron consultar los nombres exactos de archivos.");
        const exactData=await exactResponse.json();
        const exactPages=Object.values(exactData.query?.pages||{}).filter(page=>page.pageid);
        const matches=new Map();
        [...searchPages,...exactPages].forEach(page=>matches.set(page.pageid,page));
        const ids=[...matches.keys()];
        if(!ids.length)return [];
        const pages=[];
        for(let i=0;i<ids.length;i+=50){
            const imageParams=new URLSearchParams({action:"query",pageids:ids.slice(i,i+50).join("|"),prop:"imageinfo",iiprop:"url|size",iiurlwidth:"900",format:"json",origin:"*"});
            const imageResponse=await fetch(API+"?"+imageParams.toString());
            if(!imageResponse.ok)throw new Error("No se pudieron recuperar las imágenes de Dofuspedia (HTTP "+imageResponse.status+").");
            const imageData=await imageResponse.json();
            pages.push(...Object.values(imageData.query?.pages||{}));
        }
        return pages;
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
        const searches=await Promise.all(terms.filter(Boolean).map(term=>searchPages(term)));
        const all=[],seen=new Set();
        searches.flat().forEach(page=>{if(!seen.has(page.pageid)){seen.add(page.pageid);all.push(page);}});
        const ranked=all.map(page=>({page,score:Math.max(...terms.map(term=>scoreImage(page,term,role)))})).sort((a,b)=>b.score-a.score);
        const candidates=ranked.filter(item=>{
            const title=normalizeTitle(item.page.title);
            if(role==="background" && terms.some(term=>normalizeTitle(term)==="piramide de sombra")){
                return title.includes("piramide") && title.includes("sombra") && (item.page.imageinfo?.[0]?.thumbwidth||item.page.imageinfo?.[0]?.width||0)>=500;
            }
            if(role==="background"){
                const words=normalizeTitle(terms[0]).split(" ").filter(word=>word.length>2);
                // Un fondo debe corresponder al nombre buscado; evita elegir por accidente el PNG del jefe.
                return words.length>0 && words.every(word=>title.split(" ").includes(word));
            }
            if(role==="boss"){
                const words=normalizeTitle(cleanBossTerm(terms[0])).split(" ").filter(word=>word.length>2);
                const titleWords=title.split(" ").filter(Boolean);
                const allowedExtraWords=new Set(["dofus","boss","monstruo","monster","jefe","creature","creatura","png","jpg","jpeg","webp","gif","web","hd","190","200","illustration","artwork","official"]);
                // Exige el nombre completo, pero tolera sufijos habituales de archivos y versiones del juego.
                return words.length>0 &&
                    words.every(word=>titleWords.includes(word)) &&
                    titleWords.every(word=>words.includes(word)||allowedExtraWords.has(word));
            }
            return true;
        });
        const page=candidates.find(item=>item.score>=(role==="background"?15:18))?.page,info=page?.imageinfo?.[0];
        return info?{url:info.thumburl||info.url,title:page.title}:null;
    }
    async function searchDofuspediaImages(event) {
        const plan=getImagePlan(event);
        const [background,bossResults]=await Promise.all([
            findBestImage(plan.background,"background"),
            Promise.all(plan.bosses.map(term=>findBestImage([term],"boss")))
        ]);
        return {background,bosses:bossResults.filter(Boolean)};
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

    async function drawCard(event,participants,background,bosses) {
        const canvas=document.createElement("canvas");canvas.width=WIDTH;canvas.height=HEIGHT;
        const ctx=canvas.getContext("2d");
        ctx.save();
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
            {x:540,label:Number(event.capacity)===1?"CUPO":"CUPOS",value:Number(event.capacity)>0?String(Math.trunc(Number(event.capacity))):"Sin límite"}
        ];
        blocks.forEach(block=>{ctx.fillStyle="#f73d00";ctx.font="bold 12px Tahoma,sans-serif";ctx.fillText(block.label,block.x,280);ctx.fillStyle="#fff";ctx.font="bold 19px Tahoma,sans-serif";ctx.fillText(truncate(ctx,block.value,block.x===540?190:215),block.x,307);});
        ctx.fillStyle="#f73d00";ctx.font="bold 12px Tahoma,sans-serif";ctx.fillText("HORARIOS",62,341);
        const groups=groupTimes(event);
        const flagImages=await Promise.all([...new Set(groups.flatMap(group=>group.countries.map(item=>item.code)))].map(async code=>[code,await loadFlag(code)]));
        const flags=new Map(flagImages);
        let gx=62,gy=371;
        groups.forEach(group=>{
            const mexico=group.countries.find(country=>country.code==="mx");
            const city=mexico?({
                "America/Tijuana":"Tijuana",
                "America/Hermosillo":"Hermosillo",
                "America/Mexico_City":"Ciudad de México",
                "America/Cancun":"Cancún"
            })[mexico.zone]:"";
            const groupWidth=group.countries.length*18+43+(city?38:0);
            if(gx+groupWidth>742){gx=62;gy+=city?34:23;}
            let cx=gx;
            group.countries.forEach(country=>{
                const flag=flags.get(country.code);
                if(flag)ctx.drawImage(flag,cx,gy-12,15,11);
                cx+=18;
            });
            ctx.fillStyle="#fff";ctx.font="bold 13px Tahoma,sans-serif";ctx.textAlign="left";
            ctx.fillText(group.time,cx+2,gy);
            if(city){
                ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="10px Tahoma,sans-serif";
                ctx.fillText(city,gx,gy+13);
            }
            gx+=groupWidth+12;
        });
        ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="11px Tahoma,sans-serif";ctx.fillText("CALENDARIO DEL GREMIO · TAL KASHA",738,438);
        ctx.restore();
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

    function showPreview(canvas,filename,eventName,imageSummary,selected) {
        const old=document.querySelector(".share-preview-modal");if(old)old.remove();
        const modal=document.createElement("div");modal.className="share-preview-modal";
        modal.innerHTML='<div class="share-preview-panel" role="dialog" aria-modal="true" aria-label="Vista previa para compartir"><button type="button" class="share-preview-close" aria-label="Cerrar">×</button><h2>Vista previa</h2><p class="share-preview-subtitle"></p><img class="share-preview-image" alt="Tarjeta del evento"><p class="share-preview-note"></p><details class="share-image-search"><summary>Buscar imágenes en Dofuspedia</summary><div class="share-image-search-form"><input type="search" class="share-image-query" placeholder="Ej. Recuerdo de Imagiro, Reina Amirukam…"><button type="button" class="share-image-search-button">Buscar</button></div><p class="share-image-help">Busca una imagen y elige si quieres usarla como fondo o como imagen de jefe. Puedes añadir más de un jefe.</p><div class="share-image-results"></div></details><div class="share-preview-actions"><button type="button" class="share-preview-download">⬇️ Descargar PNG</button><button type="button" class="share-preview-whatsapp">🟢 WhatsApp Web</button><button type="button" class="share-preview-native">↗ Compartir imagen</button></div></div>';
        const image=modal.querySelector(".share-preview-image"),note=modal.querySelector(".share-preview-note"),query=modal.querySelector(".share-image-query"),results=modal.querySelector(".share-image-results"),searchButton=modal.querySelector(".share-image-search-button");
        modal.querySelector(".share-preview-subtitle").textContent=eventName;
        let imageUrl=null,currentBlob=null,currentCanvas=canvas;
        const updateNative=()=>{native.hidden=!currentBlob;};
        const update=async()=>{
            currentBlob=await new Promise((resolve,reject)=>currentCanvas.toBlob(v=>v?resolve(v):reject(new Error("No se pudo generar el PNG.")),"image/png"));
            if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(currentBlob);image.src=imageUrl;updateNative();
        };
        const redraw=async()=>{
            currentCanvas=await drawCard(window.__shareEventData.event,window.__shareEventData.participants,selected.background,selected.bosses);
            await update();
        };
        const close=()=>{modal.remove();if(imageUrl)URL.revokeObjectURL(imageUrl);};
        modal.querySelector(".share-preview-close").addEventListener("click",close);
        modal.addEventListener("click",e=>{if(e.target===modal)close();});
        modal.querySelector(".share-preview-download").addEventListener("click",()=>downloadBlob(currentBlob,filename));
        modal.querySelector(".share-preview-whatsapp").addEventListener("click",()=>{
            const whatsappWindow=window.open("https://web.whatsapp.com/","_blank");
            downloadBlob(currentBlob,filename);
            if(!whatsappWindow)alert("La imagen se descargó. Permite las ventanas emergentes para abrir WhatsApp Web.");
        });
        const native=modal.querySelector(".share-preview-native");
        native.addEventListener("click",async()=>{
            try{
                const file=new File([currentBlob],filename,{type:"image/png"});
                if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
                    await navigator.share({files:[file],title:eventName});
                }else{
                    downloadBlob(currentBlob,filename);
                    alert("Este navegador no permite compartir archivos directamente. La imagen se descargó; adjúntala en WhatsApp o en la aplicación que prefieras.");
                }
            }catch(error){
                if(error.name!=="AbortError"){
                    downloadBlob(currentBlob,filename);
                    alert("No se pudo abrir el menú para compartir. La imagen se descargó para que puedas adjuntarla manualmente.");
                }
            }
        });
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
            const canvas=await drawCard(event,participants,selected.background,selected.bosses);
            const filename=("evento-"+cleanText(event.name)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-]+/g,"-").replace(/^-|-$/g,"").toLowerCase()+".png";
            const summary=selected.background&&selected.bosses.length?"Se utilizó el fondo y "+selected.bosses.length+" imagen(es) de jefe. Puedes cambiarlos o añadir otros."
                :selected.background?"Se utilizó el fondo de Dofuspedia. Puedes buscar y añadir jefes."
                :selected.bosses.length?"Se utilizaron "+selected.bosses.length+" imagen(es) de jefe. Puedes buscar un fondo."
                :"La tarjeta se generó sin imágenes. Puedes buscarlas manualmente. "+warning;
            window.__shareEventData={event,participants};
            showPreview(canvas,filename,event.name,summary,selected);
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
