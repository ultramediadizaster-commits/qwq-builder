/* QWQ Builder · кілтсіз резерв іздеу: Wikipedia (kk, ru) + Jina Reader. Worker іздеуі жауап бермесе іске қосылады */
(function (Q) {
  const STOP = new Set("кім не деген туралы қандай қашан қайда неше маған керек қосымша жасау жасап бер үшін және мен сен the app for что такое кто как для или".split(" "));

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
    const t = (await r.text()).split("\n").map((l) => l.trim()).filter((l) => l.length >= 50).join("\n");
    return t.slice(0, 1800);
  }

  /** run(idea, {signal, budget}) → { text, sources:[{title,url}], read:n } немесе null */
  async function run(idea, o = {}) {
    const ac = new AbortController();
    const link = () => ac.abort();
    if (o.signal) { if (o.signal.aborted) throw new Q.api.QErr("Тоқтатылды.", "abort"); o.signal.addEventListener("abort", link, { once: true }); }
    const timer = setTimeout(() => ac.abort(), o.budget || 10000);
    try {
      // Wikipedia іздеуі сөздерді "және" арқылы біріктіреді, сондықтан қысқа сұраулардан бастаймыз: атау → 2 сөз → 1 сөз
      const kw = keywords(idea);
      const qs = [...new Set([String(idea.title || "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim(), kw.slice(0, 2).join(" "), kw[0]].filter(Boolean))];
      let hits = [];
      for (const q of qs) {
        const lists = await Promise.allSettled([wiki("kk", q, ac.signal), wiki("ru", q, ac.signal)]);
        lists.forEach((l) => l.status === "fulfilled" && hits.push(...l.value));
        if (hits.length) break;
      }
      if (!hits.length) return null;
      // әр тілден үздік 2 бет, қайталанбайтындай
      const seen = new Set(), pick = [];
      for (const h of hits) if (!seen.has(h.url) && pick.filter((x) => x.lang === h.lang).length < 2) { seen.add(h.url); pick.push(h); }
      // Jina Reader арқылы табылған беттерді оқу (табылмаса, Wikipedia үзіндісі қалады)
      const full = await Promise.allSettled(pick.map((p) => read(p.url, ac.signal)));
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
