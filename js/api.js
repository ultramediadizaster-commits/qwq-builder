/* QWQ Builder · QWQ 5 API клиенті (stream, өздігінен қайта жіберу, қатені қазақшалау) */
(function (Q) {
  class QErr extends Error {
    constructor(msg, code, retry, retryAfter) { super(msg); this.code = code || "err"; this.retry = !!retry; this.retryAfter = retryAfter || 0; }
  }
  // Жылдам режим (әдепкі): қысқа күту шектері, модельді бірден ауыстыру. localStorage "qwq.fast"="0" — ескі мінез (өлшеу үшін)
  const fast = () => { try { return localStorage.getItem("qwq.fast") !== "0"; } catch (e) { return true; } };
  const MAX_TRIES = 20, BACKOFF_CAP = 15;
  const FIRST_MS = 20000, IDLE_MS = 15000;   // бірінші токенге 20 с, ағын үнсіз тұрса 15 с
  // Чат/код үшін модель тізбегі: әр сәтсіз әрекеттен кейін келесі модельге бірден өтеді
  const CHAIN = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];

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

  /** Ұзындық шегіне жеткенде жауапты соңғы толық сөйлемге дейін қысқарту */
  function trimEnd(t) {
    const m = t.match(/^[\s\S]*[.!?…»)](?=\s|$)/);
    return m && m[0].length > t.length * 0.6 ? m[0].trimEnd() : t.trimEnd();
  }

  /** Worker кейде «⚠️ Интернеттен іздеу қазір қолжетімсіз…» жолын жауапқа өзі қосады (басында не соңында) — пайдаланушы оны көрмейді.
   *  final=false (ағын): жолдың әлі толық келмеген басын да (мысалы «⚠️ Интер») уақытша жасырады */
  const NOTICE = "Интернеттен іздеу қазір қолжетімсіз";
  function stripNotice(t, final) {
    t = String(t || "").replace(/(?:^|\n+)[ \t]*⚠️?[ \t]*Интернеттен іздеу қазір қолжетімсіз[^\n]*/g, "");
    if (!final) {
      const m = t.match(/(?:^|\n+)[ \t]*(⚠️?[ \t]*[^\n]*)$/);
      if (m && /^⚠️?[ \t]*(.*)$/.test(m[1]) && NOTICE.startsWith(m[1].replace(/^⚠️?[ \t]*/, ""))) t = t.slice(0, m.index);
    }
    return final ? t.trim() : t.replace(/^\s+/, "");
  }

  /** Бір әрекет */
  async function once(o) {
    const S = Q.store;
    if (!S.key) throw new QErr("API кілті керек. Баптаулардан енгіз.", "nokey");
    const stream = o.stream !== false;
    // жауап тоқтап қалса (үнсіз қатып қалу), әрекет үзіліп қайта жіберіледі
    const ac = new AbortController();
    let stalled = false, capped = false, timer, gotDelta = false, tStart = performance.now(), ttft = 0;
    const F = fast();
    const arm = (ms) => { clearTimeout(timer); timer = setTimeout(() => { stalled = true; ac.abort(); }, ms); };
    if (o.signal) { if (o.signal.aborted) ac.abort(); else o.signal.addEventListener("abort", () => ac.abort(), { once: true }); }
    try { return await attempt(); } finally { clearTimeout(timer); }

    async function attempt() {
    let res;
    arm(stream ? (F ? (o.firstMs || FIRST_MS) : 60000) : (F ? (o.totalMs || 60000) : 120000));
    try {
      res = await fetch(S.base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.key },
        body: JSON.stringify({ message: o.message, history: o.history || [], user: S.uid, web: !!o.web, stream, ...(o.agent ? { agent: true } : {}), ...(o.model ? { model: o.model } : {}), ...(F && (o.thinkingLevel || o.thinking) ? { thinkingLevel: o.thinkingLevel || o.thinking } : {}) }),
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
    arm(stream ? (F ? (o.firstMs || FIRST_MS) : 45000) : (F ? (o.totalMs || 60000) : 120000));

    const ct = res.headers.get("content-type") || "";
    let answer = "", sources = [], tools = [];

    if (!stream || !ct.includes("text/event-stream")) {
      let j;
      try { j = await res.json(); } catch (e) { throw new QErr(stalled ? "QWQ жауап бермей қатып қалды." : "Сервер түсініксіз жауап қайтарды.", stalled ? "stall" : "parse", true); }
      answer = j.answer ?? j.text ?? j.choices?.[0]?.message?.content ?? "";
      if (!answer) throw new QErr("QWQ бос жауап қайтарды.", "empty", true);
      if (o.onDelta) o.onDelta(answer, answer);
      return { answer, sources: j.sources || [], tools: j.tools || [], ttft: performance.now() - tStart };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const handle = (line) => {
      if (capped) return;     // ұзындық шегіне жеттік — қалған бөліктер алынбайды
      line = line.trim();
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") return;
      let ev;
      try { ev = JSON.parse(data); } catch (e) { return; }
      if (ev.type === "delta" && ev.text) { if (!gotDelta) { gotDelta = true; ttft = performance.now() - tStart; } answer += ev.text; o.onDelta && o.onDelta(ev.text, answer); if (o.maxChars && answer.length >= o.maxChars) { capped = true; ac.abort(); } }
      else if (ev.type === "done") { if (ev.sources) sources = ev.sources; if (ev.tools) tools = ev.tools; if (!answer && ev.answer) { answer = ev.answer; o.onDelta && o.onDelta(answer, answer); } }
      else if (ev.type === "sources" && ev.sources) sources = ev.sources;
      else if (ev.type === "error") throw new QErr("QWQ қате қайтарды: " + String(ev.message || ev.error || "белгісіз").slice(0, 200), "stream", true);
      else if (ev.choices?.[0]?.delta?.content) { const t = ev.choices[0].delta.content; if (!gotDelta) { gotDelta = true; ttft = performance.now() - tStart; } answer += t; o.onDelta && o.onDelta(t, answer); }
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        arm(F ? (gotDelta ? IDLE_MS : (o.firstMs || FIRST_MS)) : 45000);
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        lines.forEach(handle);
      }
      if (buf) handle(buf);
    } catch (e) {
      if (e instanceof QErr) throw e;
      if (capped && answer) return { answer: trimEnd(answer), sources, tools, partial: false, ttft, capped: true };
      if (e.name === "AbortError" && !stalled) throw new QErr("Тоқтатылды.", "abort");
      if (answer) return { answer, sources, tools, partial: true };
      throw new QErr(stalled ? "QWQ жауап бермей қатып қалды." : "Жауап жолда үзілді.", stalled ? "stall" : "stream", true);
    }
    if (!answer) throw new QErr("QWQ бос жауап қайтарды.", "empty", true);
    if (capped) answer = trimEnd(answer);
    return { answer, sources, tools, ttft };
    }
  }

  /**
   * chat({message, history, web, stream, onDelta, signal})
   * Сәтсіз сұрау қолданушыға көрсетілмей 20 ретке дейін қайта жіберіледі.
   */
  async function chat(o) {
    if (Q.demo && Q.demo.active) return Q.demo.chat(o);
    let last;
    const F = fast();
    const max = o.tries || (F ? 6 : MAX_TRIES);     // міндетті емес сұраулар (мысалы, іздеу) үшін азырақ әрекет
    const chain = F && o.models && o.models.length ? o.models : null;
    for (let i = 0; i < max; i++) {
      const oi = chain ? Object.assign({}, o, { model: chain[Math.min(i, chain.length - 1)] }) : Object.assign({}, o);
      if (o.onDelta) {   // ескерту жолы ағында да көрінбейді
        let shown = "";
        oi.onDelta = (d, full) => { const c = stripNotice(full, false); if (c.startsWith(shown)) { if (c.length > shown.length) o.onDelta(c.slice(shown.length), c); } else o.onDelta("", c); shown = c; };
      }
      try { const t0 = performance.now(); const r = await once(oi); if (r && r.answer) { r.answer = stripNotice(r.answer, true); if (!r.answer) throw new QErr("QWQ бос жауап қайтарды.", "empty", true); } Q.demo && Q.demo.record && Q.demo.record(o, r, performance.now() - t0); return r; }
      catch (e) {
        if (!(e instanceof QErr)) throw e;
        last = e;
        if (!e.retry || i === max - 1) throw e;
        // жылдам режим: қатып қалу/бос жауап/үзіліс кезінде күтпей, келесі модельмен бірден қайталаймыз
        const back = F ? (/^(stall|empty|stream)$/.test(e.code) ? 0 : Math.min(Math.pow(2, i), 3)) : Math.min(Math.pow(2, i), BACKOFF_CAP);
        await wait(Math.max(back, e.retryAfter || 0) * 1000, o.signal);
      }
    }
    throw last;
  }

  /** Сөйлесуден {title, summary, prompt} JSON алу */
  async function extractIdea(history, signal) {
    const ask = `Жоғарыдағы әңгіме негізінде қолданушының қосымша идеясын қорытындыла. Жауапты ТЕК таза JSON пішімінде қайтар (markdown, түсініктеме қоспа):
{"title":"қысқа атау (3–5 сөз)","summary":"бір сөйлемдік сипаттама","prompt":"веб-әзірлеушіге арналған толық тапсырма: мақсаты, экрандар, негізгі функциялар, деректер, дизайн қалауы. Қазақша, 150–350 сөз; әңгіменің БАСЫНАН соңына дейінгі барлық талаптар мен қолданушы таңдаған нұсқалар міндетті түрде кірсін","decisions":["чаттағы шешім не таңдау (3–10 сөз), мысалы: Стиль: қараңғы"],"questions":[{"q":"қысқа сұрақ","options":["нұсқа","нұсқа","нұсқа"]}]}
decisions — чатта келісілген барлық шешімдер мен таңдаулар (стиль, мүмкіндіктер, аудитория, қолданушы таңдаған нұсқа), 0–10 қысқа жол.
questions — код жазбас бұрын қолданушыға қойылатын 2–4 нақтылау сұрағы, әрқайсысында 2–4 қысқа нұсқа (1–3 сөз), бәрі қазақша. Бірі — дизайн стилі (мысалы: Қараңғы / Жарық / Түрлі-түсті); қалғаны идеяға қарай: кімге арналған (мысалы: Бастауыш / Орта сынып / Мұғалім), қиындық, басқару, негізгі мүмкіндіктер. Әңгімеде нақты айтылған нәрсе туралы сұрама. Тапсырма өте нақты болса (стиль, кімге арналғаны, негізгі мүмкіндіктер айтылған) — "questions":[] қайтар.`;
    for (let i = 0; i < 3; i++) {
      // Gemini жолы (agent + модель): Gemma-дан әлдеқайда жылдам; тек соңғы 10 хабарлама жіберіледі
      const r = await chat({ message: ask + (i ? "\nЕскерту: тек жарамды JSON объектісі керек." : ""), history, web: false, stream: false, signal, agent: true, model: "gemini-3.1-flash-lite" });
      const j = parseJSON(r.answer);
      if (j && j.title && j.prompt) {
        const p = Array.isArray(j.prompt) ? j.prompt.join("\n") : typeof j.prompt === "object" ? JSON.stringify(j.prompt, null, 2) : String(j.prompt);
        // нақтылау сұрақтары: ең көбі 4, әрқайсысында 2–4 нұсқа («Өзің шеш» клиентте қосылады)
        const questions = (Array.isArray(j.questions) ? j.questions : [])
          .map((x) => ({ q: String((x && x.q) || "").trim().replace(/\s*:+\s*$/, "").slice(0, 80), options: (Array.isArray(x && x.options) ? x.options : []).map((v) => String(v).trim().slice(0, 40)).filter((v) => v && !/^өзің шеш/i.test(v)).slice(0, 4) }))
          .filter((x) => x.q && x.options.length >= 2).slice(0, 4);
        // чаттағы шешімдер (стиль, мүмкіндіктер, аудитория, таңдалған нұсқа) — промпт картасында көрінеді
        const decisions = (Array.isArray(j.decisions) ? j.decisions : []).map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 10);
        return { title: String(j.title).slice(0, 80), summary: String(j.summary || "").slice(0, 240), prompt: p, questions, decisions };
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

  Q.api = { chat, extractIdea, QErr, parseJSON, fast, CHAIN, stripNotice };
})(window.QWQ);
