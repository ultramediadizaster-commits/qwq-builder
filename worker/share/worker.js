// qwq-share — QWQ Builder қосымшаларын қысқа сілтемемен бөлісуге арналған бөлек Cloudflare Worker.
// Маршруттар:
//   POST /api/share {html, title?} → {id, url}
//   GET /s/:id            → PWA орамасы (manifest, service worker, «Телефонға орнату»), ішінде sandbox iframe
//   GET /s/:id/raw        → қосымшаның өзі (CSP sandbox, opaque origin)
//   GET /s/:id/manifest.json · /s/:id/sw.js · /s/:id/icon.svg
//   GET|PUT|DELETE /api/data/:appId[/:key] → қосымшалардың ортақ бұлттық деректері (KV, ≤100 КБ/қосымша)
// KV байланысы: SHARES (wrangler.toml). QWQ 5 негізгі Worker-мен байланысы жоқ.

const MAX_BYTES = 1_000_000;          // бір қосымшаның ең көп көлемі
const TTL = 60 * 60 * 24 * 30;        // 30 күн сақталады
const DATA_MAX = 100 * 1024;          // бір қосымшаның бұлттық деректері ≤ 100 КБ
const DATA_TTL = 60 * 60 * 24 * 90;   // деректер соңғы жазудан кейін 90 күн сақталады
// бір IP + бір қосымша үшін минутына. Лимит isolate жадында (шамамен); қатаң лимит үшін README-дегі Rate Limiting байланысын қос
const LIMIT = { read: 120, write: 30 };
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";   // оқуға ыңғайлы (0/o, 1/l жоқ)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });

// sandbox-та localStorage қате шығармасын деп жадыдағы алмастырғыш
const SHIM = `<script>(function(){try{localStorage.getItem("x");return}catch(e){}function mk(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}try{Object.defineProperty(window,"localStorage",{value:mk(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true})}catch(e){}})()</script>`;

function newId(len = 7) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join("");
}

function withShim(html, extra = "") {
  const p = SHIM + extra;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + p);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + p + "</head>");
  return p + html;
}

/* ---------- PWA көмекшілері ---------- */
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const HEX = /^#[0-9a-fA-F]{6}$/;
// негізгі түсті HTML-ден табамыз: --accent → --primary/--brand/--main → theme-color → әдепкі.
// Шаблонның theme-color-ы — қараңғы фон, сондықтан тым қараңғы (не тым ашық) түстер белгішеге алынбайды
const lum = (c) => [1, 3, 5].reduce((a, i, k) => a + parseInt(c.slice(i, i + 2), 16) * [0.2126, 0.7152, 0.0722][k], 0) / 255;
function pickColor(html) {
  const cands = [/--accent\s*:\s*(#[0-9a-fA-F]{3,8})/i, /--(?:primary|brand|main)\s*:\s*(#[0-9a-fA-F]{3,8})/i, /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i];
  for (const re of cands) {
    const m = html.match(re); if (!m) continue;
    let c = m[1]; if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    c = c.slice(0, 7);
    if (HEX.test(c) && lum(c) > 0.12 && lum(c) < 0.92) return c;
  }
  return "#0a84ff";
}
const firstLetter = (t) => (Array.from(String(t || "Қ").trim())[0] || "Қ").toUpperCase();
const darker = (hex, k = 0.55) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
function iconSvg(title, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${darker(color)}"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/><text x="256" y="256" text-anchor="middle" dominant-baseline="central" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="700" font-size="300" fill="#fff">${esc(firstLetter(title))}</text></svg>`;
}

function manifest(id, meta) {
  const title = meta.title || "Қосымша", color = meta.color || "#0a84ff";
  return {
    name: title, short_name: title.slice(0, 12), id: `/s/${id}`, start_url: `/s/${id}`, scope: `/s/${id}`, display: "standalone",
    background_color: "#000000", theme_color: color, lang: "kk",
    icons: [{ src: `/s/${id}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: `/s/${id}/icon.svg`, sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }],
  };
}

// Офлайн: орама мен қосымшаны алдымен желіден, болмаса кэштен береміз
function swSource(id) {
  return `const C="qwq-app-${id}-v1",URLS=["/s/${id}","/s/${id}/raw","/s/${id}/manifest.json","/s/${id}/icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("qwq-app-${id}")&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||!u.pathname.startsWith("/s/${id}"))return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("/s/${id}"))))});`;
}

// Орама бет: sandbox iframe-ге ӨЗ origin-ін бермейді (қосымша opaque origin-де), ал manifest/service worker/орнату батырмасы осында
function wrapper(id, meta) {
  const title = esc(meta.title || "Қосымша"), color = meta.color || "#0a84ff", letter = esc(firstLetter(meta.title));
  return `<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title><meta name="theme-color" content="${color}">
<link rel="manifest" href="/s/${id}/manifest.json"><link rel="icon" href="/s/${id}/icon.svg" type="image/svg+xml">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="${title}"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>html,body{margin:0;height:100%;background:#000;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff}
#inst{position:fixed;z-index:5;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));display:none;min-height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(255,255,255,.35);background:rgba(20,22,30,.72);color:#fff;font:600 14px system-ui,sans-serif;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#ios{position:fixed;z-index:6;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));display:none;padding:14px 44px 14px 16px;border-radius:18px;background:rgba(20,22,30,.9);color:#fff;font-size:14px;line-height:1.5;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
#ios button{position:absolute;right:4px;top:4px;width:40px;height:40px;border:0;background:none;color:#fff;font-size:20px;cursor:pointer}</style></head>
<body><iframe id="app" src="/s/${id}/raw" title="${title}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer"></iframe>
<button id="inst" type="button">Телефонға орнату</button>
<div id="ios" role="dialog">Орнату үшін: <b>Бөлісу</b> <span aria-hidden="true">⬆️</span> → <b>Басты экранға қосу</b><button type="button" aria-label="Жабу">×</button></div>
<script>(function(){
var standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
var inst=document.getElementById("inst"),ios=document.getElementById("ios"),dp=null;
// iOS үшін PNG белгіше: canvas-та салып, apple-touch-icon етеміз (әріп пен түс — қосымшаның атауы мен негізгі түсінен)
try{var c=document.createElement("canvas");c.width=c.height=180;var x=c.getContext("2d"),g=x.createLinearGradient(0,0,180,180);g.addColorStop(0,"${color}");g.addColorStop(1,"${darker(color)}");x.fillStyle=g;x.fillRect(0,0,180,180);x.fillStyle="#fff";x.font="700 108px system-ui,sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText("${letter}",90,96);var l=document.createElement("link");l.rel="apple-touch-icon";l.href=c.toDataURL("image/png");document.head.appendChild(l)}catch(e){}
if("serviceWorker" in navigator)navigator.serviceWorker.register("/s/${id}/sw.js",{scope:"/s/${id}"}).catch(function(){});
if(!standalone){
  addEventListener("beforeinstallprompt",function(e){e.preventDefault();dp=e;inst.style.display="block"});
  inst.onclick=function(){if(!dp)return;dp.prompt();dp.userChoice.finally(function(){dp=null;inst.style.display="none"})};
  addEventListener("appinstalled",function(){inst.style.display="none"});
  var isIos=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  var seen=false;try{seen=!!sessionStorage.getItem("iosHint")}catch(e){}
  if(isIos&&!seen){ios.style.display="block";ios.querySelector("button").onclick=function(){ios.style.display="none";try{sessionStorage.setItem("iosHint","1")}catch(e){}}}
}
})()</script></body></html>`;
}

/* ---------- ортақ бұлттық деректер ---------- */
const hits = new Map();
function limited(kind, ip, id) {
  const now = Date.now(), k = kind + "|" + ip + "|" + id, h = hits.get(k);
  if (!h || now - h.t > 60000) { hits.set(k, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  return ++h.n > LIMIT[kind];
}
const KEY_RE = /^[\w.\-:]{1,64}$/;
async function dataApi(req, env, url) {
  const m = url.pathname.match(/^\/api\/data\/([a-z0-9]{4,12})(?:\/([^/]+))?\/?$/);
  if (!m) return null;
  if (!env.SHARES) return json({ error: "KV байланысы (SHARES) бапталмаған" }, 500);
  const id = m[1], key = m[2] ? decodeURIComponent(m[2]) : null;
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const write = req.method === "PUT" || req.method === "DELETE";
  if (limited(write ? "write" : "read", ip, id)) return json({ error: "Сұраулар тым жиі. Бір минуттан кейін қайталаңыз." }, 429);
  if (key !== null && !KEY_RE.test(key)) return json({ error: "Кілт жарамсыз (әріп, сан, . _ - : ; ≤64 таңба)" }, 400);
  if (!["GET", "PUT", "DELETE"].includes(req.method)) return json({ error: "Әдіс рұқсат етілмеген" }, 405);
  // деректер тек бар қосымшаға жазылады (кездейсоқ id-ге жазуға болмайды)
  if ((await env.SHARES.get(id)) === null) return json({ error: "Қосымша табылмады" }, 404);
  const dk = "data:" + id;
  let cur = {};
  try { cur = JSON.parse((await env.SHARES.get(dk)) || "{}"); } catch (e) { cur = {}; }
  if (req.method === "GET") return key === null ? json({ data: cur }) : json({ value: key in cur ? cur[key] : null });
  if (key === null) return json({ error: "Кілт керек: /api/data/:appId/:key" }, 400);
  if (req.method === "DELETE") delete cur[key];
  else {
    let body; try { body = await req.json(); } catch (e) { return json({ error: "JSON қате" }, 400); }
    if (!body || !("value" in body)) return json({ error: "value өрісі керек" }, 400);
    cur[key] = body.value;
  }
  const out = JSON.stringify(cur);
  if (new TextEncoder().encode(out).length > DATA_MAX) return json({ error: "Қосымшаның деректері 100 КБ шегінен асады" }, 413);
  await env.SHARES.put(dk, out, { expirationTtl: DATA_TTL });
  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/api/share" && req.method === "POST") {
      if (!env.SHARES) return json({ error: "KV байланысы (SHARES) бапталмаған" }, 500);
      const len = Number(req.headers.get("content-length") || 0);
      if (len > MAX_BYTES * 1.2) return json({ error: "Қосымша тым үлкен" }, 413);
      let body;
      try { body = await req.json(); } catch (e) { return json({ error: "JSON қате" }, 400); }
      const html = body && body.html;
      if (typeof html !== "string" || html.length < 20) return json({ error: "html өрісі керек" }, 400);
      if (new TextEncoder().encode(html).length > MAX_BYTES) return json({ error: "Қосымша тым үлкен" }, 413);
      const title = typeof body.title === "string" ? body.title.slice(0, 80) : "";

      let id = newId();
      for (let i = 0; i < 4 && (await env.SHARES.get(id)) !== null; i++) id = newId(8 + i);
      await env.SHARES.put(id, html, { expirationTtl: TTL, metadata: { title, color: pickColor(html), at: Date.now() } });
      return json({ id, url: `${url.origin}/s/${id}`, expiresInDays: 30 });
    }

    const dres = await dataApi(req, env, url);
    if (dres) return dres;

    const m = url.pathname.match(/^\/s\/([a-z0-9]{4,12})(?:\/(raw|manifest\.json|sw\.js|icon\.svg))?\/?$/);
    if (m && req.method === "GET") {
      const id = m[1], part = m[2] || "";
      const rec = env.SHARES ? await env.SHARES.getWithMetadata(id) : { value: null };
      if (rec.value === null) return new Response("Қосымша табылмады немесе мерзімі өтті", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS } });
      const meta = Object.assign({}, rec.metadata);
      meta.color = pickColor(rec.value);   // әрдайым HTML-ден (ескі жазбалардағы қате түс те түзеледі)
      if (part === "manifest.json") return new Response(JSON.stringify(manifest(id, meta)), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
      if (part === "sw.js") return new Response(swSource(id), { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": `/s/${id}` } });
      if (part === "icon.svg") return new Response(iconSvg(meta.title, meta.color), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
      if (part === "raw") {
        const cloud = `<script>window.__QWQ_CLOUD={url:${JSON.stringify(url.origin + "/api/data/" + id)}}</script>`;
        return new Response(withShim(rec.value, cloud), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            // жасалған код осы доменнің ешбір деректеріне қол жеткізбейді
            "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals allow-popups",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "public, max-age=300",
          },
        });
      }
      return new Response(wrapper(id, meta), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "frame-src 'self'; object-src 'none'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-cache" },
      });
    }

    if (url.pathname === "/") return json({ name: "qwq-share", endpoints: { "POST /api/share": "{html, title?}", "GET /s/:id": "PWA", "GET|PUT|DELETE /api/data/:appId/:key": "ортақ деректер" } });
    return json({ error: "Табылмады" }, 404);
  },
};
