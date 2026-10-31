// qwq-share — QWQ Builder қосымшаларын қысқа сілтемемен бөлісуге арналған бөлек Cloudflare Worker.
// Маршруттар: POST /api/share {html, title?} → {id, url}   ·   GET /s/:id → сақталған HTML
// KV байланысы: SHARES (wrangler.toml). QWQ 5 негізгі Worker-мен байланысы жоқ.

const MAX_BYTES = 1_000_000;          // бір қосымшаның ең көп көлемі
const TTL = 60 * 60 * 24 * 30;        // 30 күн сақталады
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";   // оқуға ыңғайлы (0/o, 1/l жоқ)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function withShim(html) {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + SHIM);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + SHIM + "</head>");
  return SHIM + html;
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
      await env.SHARES.put(id, html, { expirationTtl: TTL, metadata: { title, at: Date.now() } });
      return json({ id, url: `${url.origin}/s/${id}`, expiresInDays: 30 });
    }

    const m = url.pathname.match(/^\/s\/([a-z0-9]{4,12})\/?$/);
    if (m && req.method === "GET") {
      const html = env.SHARES ? await env.SHARES.get(m[1]) : null;
      if (html === null) return new Response("Қосымша табылмады немесе мерзімі өтті", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS } });
      return new Response(withShim(html), {
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

    if (url.pathname === "/") return json({ name: "qwq-share", endpoints: { "POST /api/share": "{html, title?}", "GET /s/:id": "HTML" } });
    return json({ error: "Табылмады" }, 404);
  },
};
