/* QWQ Builder · кілтсіз резерв іздеу: Wikipedia (kk, ru) + Jina Reader. Worker іздеуі жауап бермесе іске қосылады */
(function (Q) {
  const STOP = new Set("және кім не деген туралы қандай қашан қайда неше маған керек қосымша жасау жасап бер үшін және мен сен the app for что такое кто как для или".split(" "));

  // Тақырыптан іздеу сөздерін алу: атауы + сипаттамасы
  function keywords(idea) {
    const words = `${idea.title || ""} ${idea.summary || ""}`.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
    return [...new Set(words)].slice(0, 6);
  }

  async function getJSON(url, signal) {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  async function wiki(lang, q, signal) {
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&exchars=900&inprop=url&origin=*`;
    const j = await getJSON(u, signal);
    return Object.values((j.query && j.query.pages) || {}).filter((p) => p.extract)
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((p) => ({ title: p.title, url: p.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title)}`, text: p.extract, lang }));
  }

  // Jina Reader: бетті таза мәтінге айналдырады (кілтсіз)
  async function read(url, signal) {
    const r = await fetch("https://r.jina.ai/" + encodeURI(decodeURI(url)), { signal, headers: { Accept: "text/plain", "X-Return-Format": "text" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    // мәзір жолдарын тастап, тек толық сөйлемдерді (≥ 50 таңба) қалдырамыз
    const t = (await r.text()).split("\n").map((l) => l.trim()).filter((l) => l.length >= 50 && !/көрсету\/жасыру|Координаттар|Мазмұнға өту|Басқа мағыналар/.test(l)).join("\n");
    return t.slice(0, 1800);
  }

  /** run(idea, {signal, budget}) → { text, sources:[{title,url}], read:n } немесе null */
  async function run(idea, o = {}) {
    const ac = new AbortController();
    const link = () => ac.abort();
    if (o.signal) { if (o.signal.aborted) throw new Q.api.QErr("Тоқтатылды.", "abort"); o.signal.addEventListener("abort", link, { once: true }); }
    const timer = setTimeout(() => ac.abort(), o.budget || 15000);
    try {
      // Wikipedia іздеуі сөздерді "және" арқылы біріктіреді, сондықтан: атау, көрші сөз жұптары, ұзын жеке сөздер (бәрі параллель)
      const kw = keywords(idea);
      const title = String(idea.title || "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
      const pairs = kw.slice(0, 4).map((w, i) => (kw[i + 1] ? w + " " + kw[i + 1] : "")).filter(Boolean).slice(0, 3);
      const qs = [...new Set([title, ...pairs, ...kw.filter((w) => w.length > 5).slice(0, 2)].filter(Boolean))].slice(0, 5);
      const res = await Promise.allSettled(qs.flatMap((q) => [wiki("kk", q, ac.signal), wiki("ru", q, ac.signal)]));
      const hits = [];
      res.forEach((l) => l.status === "fulfilled" && hits.push(...l.value));
      if (!hits.length) return null;
      // тақырып сөздері көбірек кездесетін беттер алда тұрады
      const sc = (h) => kw.reduce((n, w) => n + (new RegExp(w.slice(0, Math.max(4, w.length - 2)), "i").test(h.title + " " + h.text) ? (new RegExp(w.slice(0, Math.max(4, w.length - 2)), "i").test(h.title) ? 2 : 1) : 0), 0);
      hits.sort((a, b) => sc(b) - sc(a));
      // әр тілден үздік 2 бет, қайталанбайтындай
      const seen = new Set(), pick = [];
      for (const h of hits) if (!seen.has(h.url) && pick.filter((x) => x.lang === h.lang).length < 2) { seen.add(h.url); pick.push(h); }
      // Jina Reader арқылы табылған беттерді оқу (табылмаса, Wikipedia үзіндісі қалады)
      // Jina — қосымша: өз 6 с шегі бар, баяу болса Wikipedia үзіндісі қалады
      const jac = new AbortController(), jt = setTimeout(() => jac.abort(), 6000);
      ac.signal.addEventListener("abort", () => jac.abort(), { once: true });
      const full = await Promise.allSettled(pick.map((p) => read(p.url, jac.signal)));
      clearTimeout(jt);
      let nRead = 0;
      pick.forEach((p, i) => { if (full[i].status === "fulfilled" && full[i].value.length > p.text.length) { p.text = full[i].value; p.jina = true; nRead++; } });
      const text = pick.map((p) => `### ${p.title} (${p.lang})\n${p.text}\nДереккөз: ${p.url}`).join("\n\n");
      return { text, sources: pick.map((p) => ({ title: p.title + " — Wikipedia", url: p.url })), read: nRead };
    } catch (e) {
      if (o.signal && o.signal.aborted) throw new Q.api.QErr("Тоқтатылды.", "abort");
      return null;
    } finally { clearTimeout(timer); o.signal && o.signal.removeEventListener("abort", link); }
  }

  Q.websearch = { run, keywords };
})(window.QWQ);
