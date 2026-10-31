/* QWQ Builder · QWQ 5 API клиенті (stream + қатені қазақшалау) */
(function (Q) {
  class QErr extends Error {
    constructor(msg, code) { super(msg); this.code = code || "err"; }
  }

  function statusMsg(st, body) {
    let detail = "";
    try { const j = JSON.parse(body); detail = j.error?.message || j.error || j.message || ""; } catch (e) {}
    if (typeof detail !== "string") detail = "";
    switch (true) {
      case st === 401 || st === 403: return "API кілті қате немесе қолданыста емес. Баптаулардан кілтті тексеріп, қайта енгіз.";
      case st === 404: return "Сервер мекенжайы табылмады (404). Баптаулардағы мекенжайды тексер.";
      case st === 413: return "Сұрау тым үлкен болды (413). Хабарламаны немесе кодты қысқартып көр.";
      case st === 429: return "Сұраулар тым көп (429). Бір минут күтіп, қайта байқап көр.";
      case st >= 500: return `QWQ сервері уақытша жауап бере алмады (${st}). Бірнеше секундтан соң қайталап көр.${detail ? " Мәлімет: " + detail.slice(0, 120) : ""}`;
      default: return `Сұрау орындалмады (${st}).${detail ? " " + detail.slice(0, 160) : ""}`;
    }
  }

  /**
   * chat({message, history, web, stream, onDelta, signal})
   * → { answer, sources, tools }
   */
  async function chat(o) {
    if (Q.demo && Q.demo.active) return Q.demo.chat(o);
    const S = Q.store;
    if (!S.key) throw new QErr("API кілті енгізілмеген. Баптаулардан (жоғарғы оң жақ белгі) кілтті енгіз.", "nokey");
    if (!navigator.onLine) throw new QErr("Интернет жоқ сияқты. Байланысты тексер немесе демо режимін қос.", "offline");

    const stream = o.stream !== false;
    let res;
    try {
      res = await fetch(S.base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.key },
        body: JSON.stringify({ message: o.message, history: o.history || [], user: S.uid, web: !!o.web, stream }),
        signal: o.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") throw new QErr("Тоқтатылды.", "abort");
      throw new QErr("QWQ серверіне қосылу мүмкін болмады. Интернетті тексер; мәселе жалғасса, Worker-де CORS рұқсаты өшірулі болуы мүмкін.", "net");
    }
    if (!res.ok) throw new QErr(statusMsg(res.status, await res.text().catch(() => "")), "http");

    const ct = res.headers.get("content-type") || "";
    let answer = "", sources = [], tools = [];

    if (!stream || !ct.includes("text/event-stream")) {
      let j;
      try { j = await res.json(); } catch (e) { throw new QErr("Сервер түсініксіз жауап қайтарды. Қайта байқап көр.", "parse"); }
      answer = j.answer ?? j.text ?? j.choices?.[0]?.message?.content ?? "";
      if (o.onDelta && answer) o.onDelta(answer, answer);
      return { answer, sources: j.sources || [], tools: j.tools || [] };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", done = false;
    const handle = (line) => {
      line = line.trim();
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") { if (data === "[DONE]") done = true; return; }
      let ev;
      try { ev = JSON.parse(data); } catch (e) { return; }
      if (ev.type === "delta" && ev.text) { answer += ev.text; o.onDelta && o.onDelta(ev.text, answer); }
      else if (ev.type === "done") { done = true; if (ev.sources) sources = ev.sources; if (ev.tools) tools = ev.tools; if (!answer && ev.answer) { answer = ev.answer; o.onDelta && o.onDelta(answer, answer); } }
      else if (ev.type === "sources" && ev.sources) sources = ev.sources;
      else if (ev.type === "error") throw new QErr("QWQ қате қайтарды: " + String(ev.message || ev.error || "белгісіз қате").slice(0, 200), "stream");
      else if (ev.choices?.[0]?.delta?.content) { const t = ev.choices[0].delta.content; answer += t; o.onDelta && o.onDelta(t, answer); }
    };
    try {
      for (;;) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        lines.forEach(handle);
      }
      if (buf) handle(buf);
    } catch (e) {
      if (e instanceof QErr) throw e;
      if (e.name === "AbortError") throw new QErr("Тоқтатылды.", "abort");
      if (answer) { return { answer, sources, tools, partial: true }; }
      throw new QErr("Жауап жолда үзілді. Байланысты тексеріп, қайта байқап көр.", "stream");
    }
    if (!answer) throw new QErr("QWQ бос жауап қайтарды. Сұрауды басқаша жазып көр.", "empty");
    return { answer, sources, tools };
  }

  /** Сөйлесуден {title, summary, prompt} JSON алу */
  async function extractIdea(history, signal) {
    const ask = `Жоғарыдағы әңгіме негізінде қолданушының қосымша идеясын қорытындыла. Жауапты ТЕК таза JSON пішімінде қайтар (markdown, түсініктеме қоспа):
{"title":"қысқа атау (3–5 сөз)","summary":"бір сөйлемдік сипаттама","prompt":"веб-әзірлеушіге арналған толық тапсырма: мақсаты, экрандар, негізгі функциялар, деректер, дизайн қалауы. Қазақша, 150–350 сөз"}`;
    let last;
    for (let i = 0; i < 2; i++) {
      const r = await chat({ message: ask + (i ? "\nЕскерту: тек жарамды JSON объектісі керек." : ""), history, web: false, stream: false, signal });
      const j = parseJSON(r.answer);
      if (j && j.title && j.prompt) {
        const p = Array.isArray(j.prompt) ? j.prompt.join("\n") : typeof j.prompt === "object" ? JSON.stringify(j.prompt, null, 2) : String(j.prompt);
        return { title: String(j.title).slice(0, 80), summary: String(j.summary || "").slice(0, 240), prompt: p };
      }
      last = r.answer;
    }
    throw new QErr("QWQ идеяны дұрыс пішімде қайтара алмады. «Осыдан қосымша жасау» батырмасын қайта бас.", "json");
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
