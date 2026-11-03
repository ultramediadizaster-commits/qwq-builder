/* QWQ Builder · QWQ 5 API клиенті (stream, өздігінен қайта жіберу, қатені қазақшалау) */
(function (Q) {
  class QErr extends Error {
    constructor(msg, code, retry, retryAfter) { super(msg); this.code = code || "err"; this.retry = !!retry; this.retryAfter = retryAfter || 0; }
  }
  const MAX_TRIES = 20, BACKOFF_CAP = 15;

  function statusMsg(st, body) {
    let detail = "";
    try { const j = JSON.parse(body); detail = j.error?.message || j.error || j.message || ""; } catch (e) {}
    if (typeof detail !== "string") detail = "";
    switch (true) {
      case st === 401 || st === 403: return "API кілті қате немесе қолданыста емес. Баптаулардан кілтті тексер.";
      case st === 402: return "QWQ квотасы бітті немесе төлем қажет (402). Кейінірек байқап көр не демо режимін қос.";
      case st === 404: return "Сервер мекенжайы табылмады (404). Баптаулардағы мекенжайды тексер.";
      case st === 413: return "Сұрау тым үлкен (413). Хабарламаны қысқартып көр.";
      case st === 429: return "Сұраулар лимиті біткен сияқты (429). Сәл күтіп, қайта байқап көр.";
      case st >= 500: return `QWQ сервері жауап бермеді (${st}). Кейінірек қайталап көр.${detail ? " " + detail.slice(0, 120) : ""}`;
      default: return `Сұрау орындалмады (${st}).${detail ? " " + detail.slice(0, 160) : ""}`;
    }
  }

  function parseRetryAfter(h) {
    if (!h) return 0;
    const n = Number(h);
    if (!isNaN(n)) return Math.min(Math.max(n, 0), 60);
    const d = Date.parse(h);
    return isNaN(d) ? 0 : Math.min(Math.max((d - Date.now()) / 1000, 0), 60);
  }

  function wait(ms, signal) {
    return new Promise((res, rej) => {
      if (signal && signal.aborted) return rej(new QErr("Тоқтатылды.", "abort"));
      const t = setTimeout(() => { signal && signal.removeEventListener("abort", ab); res(); }, ms);
      const ab = () => { clearTimeout(t); rej(new QErr("Тоқтатылды.", "abort")); };
      signal && signal.addEventListener("abort", ab, { once: true });
    });
  }

  /** Бір әрекет */
  async function once(o) {
    const S = Q.store;
    if (!S.key) throw new QErr("API кілті керек. Баптаулардан енгіз.", "nokey");
    const stream = o.stream !== false;
    // жауап тоқтап қалса (үнсіз қатып қалу), әрекет үзіліп қайта жіберіледі
    const ac = new AbortController();
    let stalled = false, timer;
    const arm = (ms) => { clearTimeout(timer); timer = setTimeout(() => { stalled = true; ac.abort(); }, ms); };
    if (o.signal) { if (o.signal.aborted) ac.abort(); else o.signal.addEventListener("abort", () => ac.abort(), { once: true }); }
    try { return await attempt(); } finally { clearTimeout(timer); }

    async function attempt() {
    let res;
    arm(stream ? 60000 : 120000);
    try {
      res = await fetch(S.base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.key },
        body: JSON.stringify({ message: o.message, history: o.history || [], user: S.uid, web: !!o.web, stream, ...(o.agent ? { agent: true } : {}), ...(o.model ? { model: o.model } : {}) }),
        signal: ac.signal,
      });
    } catch (e) {
      if (stalled) throw new QErr("QWQ жауап бермей қатып қалды.", "stall", true);
      if (e.name === "AbortError") throw new QErr("Тоқтатылды.", "abort");
      throw new QErr(navigator.onLine ? "QWQ серверіне қосылу мүмкін болмады. Интернетті тексер." : "Интернет жоқ. Байланысты тексер немесе демо режимін қос.", navigator.onLine ? "net" : "offline", true);
    }
    if (!res.ok) {
      const retry = res.status === 429 || res.status === 408 || res.status >= 500;
      throw new QErr(statusMsg(res.status, await res.text().catch(() => "")), "http", retry, parseRetryAfter(res.headers.get("retry-after")));
    }
    S.usage.inc();
    arm(stream ? 45000 : 120000);

    const ct = res.headers.get("content-type") || "";
    let answer = "", sources = [], tools = [];

    if (!stream || !ct.includes("text/event-stream")) {
      let j;
      try { j = await res.json(); } catch (e) { throw new QErr(stalled ? "QWQ жауап бермей қатып қалды." : "Сервер түсініксіз жауап қайтарды.", stalled ? "stall" : "parse", true); }
      answer = j.answer ?? j.text ?? j.choices?.[0]?.message?.content ?? "";
      if (!answer) throw new QErr("QWQ бос жауап қайтарды.", "empty", true);
      if (o.onDelta) o.onDelta(answer, answer);
      return { answer, sources: j.sources || [], tools: j.tools || [] };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const handle = (line) => {
      line = line.trim();
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") return;
      let ev;
      try { ev = JSON.parse(data); } catch (e) { return; }
      if (ev.type === "delta" && ev.text) { answer += ev.text; o.onDelta && o.onDelta(ev.text, answer); }
      else if (ev.type === "done") { if (ev.sources) sources = ev.sources; if (ev.tools) tools = ev.tools; if (!answer && ev.answer) { answer = ev.answer; o.onDelta && o.onDelta(answer, answer); } }
      else if (ev.type === "sources" && ev.sources) sources = ev.sources;
      else if (ev.type === "error") throw new QErr("QWQ қате қайтарды: " + String(ev.message || ev.error || "белгісіз").slice(0, 200), "stream", true);
      else if (ev.choices?.[0]?.delta?.content) { const t = ev.choices[0].delta.content; answer += t; o.onDelta && o.onDelta(t, answer); }
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        arm(45000);
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        lines.forEach(handle);
      }
      if (buf) handle(buf);
    } catch (e) {
      if (e instanceof QErr) throw e;
      if (e.name === "AbortError" && !stalled) throw new QErr("Тоқтатылды.", "abort");
      if (answer) return { answer, sources, tools, partial: true };
      throw new QErr(stalled ? "QWQ жауап бермей қатып қалды." : "Жауап жолда үзілді.", stalled ? "stall" : "stream", true);
    }
    if (!answer) throw new QErr("QWQ бос жауап қайтарды.", "empty", true);
    return { answer, sources, tools };
    }
  }

  /**
   * chat({message, history, web, stream, onDelta, signal})
   * Сәтсіз сұрау қолданушыға көрсетілмей 20 ретке дейін қайта жіберіледі.
   */
  async function chat(o) {
    if (Q.demo && Q.demo.active) return Q.demo.chat(o);
    let last;
    const max = o.tries || MAX_TRIES;     // міндетті емес сұраулар (мысалы, іздеу) үшін азырақ әрекет
    for (let i = 0; i < max; i++) {
      try { const t0 = performance.now(); const r = await once(o); Q.demo && Q.demo.record && Q.demo.record(o, r, performance.now() - t0); return r; }
      catch (e) {
        if (!(e instanceof QErr)) throw e;
        last = e;
        if (!e.retry || i === max - 1) throw e;
        const back = Math.min(Math.pow(2, i), BACKOFF_CAP);
        await wait(Math.max(back, e.retryAfter || 0) * 1000, o.signal);
      }
    }
    throw last;
  }

  /** Сөйлесуден {title, summary, prompt} JSON алу */
  async function extractIdea(history, signal) {
    const ask = `Жоғарыдағы әңгіме негізінде қолданушының қосымша идеясын қорытындыла. Жауапты ТЕК таза JSON пішімінде қайтар (markdown, түсініктеме қоспа):
{"title":"қысқа атау (3–5 сөз)","summary":"бір сөйлемдік сипаттама","prompt":"веб-әзірлеушіге арналған толық тапсырма: мақсаты, экрандар, негізгі функциялар, деректер, дизайн қалауы. Қазақша, 150–350 сөз"}`;
    for (let i = 0; i < 3; i++) {
      // Gemini жолы (agent + модель): Gemma-дан әлдеқайда жылдам; тек соңғы 10 хабарлама жіберіледі
      const r = await chat({ message: ask + (i ? "\nЕскерту: тек жарамды JSON объектісі керек." : ""), history: history.slice(-10), web: false, stream: false, signal, agent: true, model: "gemini-3.1-flash-lite" });
      const j = parseJSON(r.answer);
      if (j && j.title && j.prompt) {
        const p = Array.isArray(j.prompt) ? j.prompt.join("\n") : typeof j.prompt === "object" ? JSON.stringify(j.prompt, null, 2) : String(j.prompt);
        return { title: String(j.title).slice(0, 80), summary: String(j.summary || "").slice(0, 240), prompt: p };
      }
    }
    throw new QErr("QWQ идеяны дұрыс пішімде қайтара алмады. Қайта бас.", "json");
  }

  function parseJSON(t) {
    if (!t) return null;
    t = t.replace(/```(?:json)?/gi, "");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
    try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001f]+/g, " ")); } catch (e) { return null; }
  }

  Q.api = { chat, extractIdea, QErr, parseJSON };
})(window.QWQ);
