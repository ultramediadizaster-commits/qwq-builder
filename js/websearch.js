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

  const brief = (idea) => `Атауы: ${idea.title}
Сипаттама: ${idea.summary}
Тапсырма: ${String(idea.prompt || "").slice(0, 900)}`;

  /** Gemini: тапсырмадан 2–3 қысқа, нақты іздеу сөзін шығарады (қате болса — null) */
  async function aiQueries(idea, signal) {
    try {
      const r = await Q.api.chat({ signal, web: false, stream: false, tries: 1, agent: true, model: "gemini-3.1-flash-lite", thinking: "low",
        message: `Мына қосымшаны жасау үшін Wikipedia-дан пайдалы мәлімет іздейміз. Тапсырмадан 2–3 ҚЫСҚА (1–3 сөз), нақты іздеу сөзін шығар: тақырыптың өзегі (зат есім, ұғым), қажет болса қазақша немесе орысша. Жалпы сөздер («қосымша», «жасау») болмасын.

${brief(idea)}

Жауап тек JSON: {"queries":["...","..."]}` });
      const j = Q.api.parseJSON(r.answer);
      const qs = ((j && j.queries) || []).map((x) => String(x).replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim()).filter((x) => x.length > 2).slice(0, 3);
      return qs.length ? qs : null;
    } catch (e) { if (e.code === "abort") throw e; return null; }
  }

  /** Gemini: тақырыпқа сай беттердің нөмірлерін қалдырады (қате болса — null: эвристика қолданылады) */
  async function aiFilter(idea, pick, signal) {
    try {
      const list = pick.map((p, i) => `${i}. ${p.title}: ${p.text.replace(/\s+/g, " ").slice(0, 220)}`).join("\n");
      const r = await Q.api.chat({ signal, web: false, stream: false, tries: 1, agent: true, model: "gemini-3.1-flash-lite", thinking: "low",
        message: `Қосымша тапсырмасы:
${brief(idea)}

Табылған Wikipedia беттері:
${list}

Тақырыбы осы қосымшаның пәніне тікелей қатысты беттердің нөмірлерін қалдыр (мысалы, ауа райы қосымшасына «Ауа райы», «Ауа райын болжау»; қаржы қосымшасына «Бюджет», «Қаржы» сәйкес келеді). Тек анық қатысы жоқ беттерді (басқа тақырып, адам аты, кездейсоқ атау) таста. Жауап тек JSON: {"keep":[0,2]}` });
      const j = Q.api.parseJSON(r.answer);
      if (!j || !Array.isArray(j.keep)) return null;
      return j.keep.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < pick.length);
    } catch (e) { if (e.code === "abort") throw e; return null; }
  }

  /** run(idea, {signal, budget}) → { text, sources:[{title,url}], read:n } немесе null */
  async function run(idea, o = {}) {
    const ac = new AbortController();
    const link = () => ac.abort();
    if (o.signal) { if (o.signal.aborted) throw new Q.api.QErr("Тоқтатылды.", "abort"); o.signal.addEventListener("abort", link, { once: true }); }
    const timer = setTimeout(() => ac.abort(), o.budget || 25000);
    try {
      // Wikipedia іздеуі сөздерді "және" арқылы біріктіреді, сондықтан: атау, көрші сөз жұптары, ұзын жеке сөздер (бәрі параллель)
      const kw = keywords(idea);
      const title = String(idea.title || "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
      const pairs = kw.slice(0, 4).map((w, i) => (kw[i + 1] ? w + " " + kw[i + 1] : "")).filter(Boolean).slice(0, 3);
      const ai = await aiQueries(idea, ac.signal);
      const qs0 = ai ? ai : [...new Set([title, ...pairs, ...kw.filter((w) => w.length > 5).slice(0, 2)].filter(Boolean))].slice(0, 5);
      // Wikipedia барлық сөзді талап етеді: әр сұрауға оның ұзын жеке сөздерін де қосамыз (сүзгіні Gemini жасайды)
      const qs = [...new Set(ai ? qs0.flatMap((q) => [q, ...q.split(" ").filter((w) => w.length > 4).slice(0, 2)]) : qs0)].slice(0, 8);
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
      // тақырыпқа сай келмейтін беттерді тастаймыз (Gemini; ол жауап бермесе — сөз сәйкестігі бойынша)
      const keep = await aiFilter(idea, pick, ac.signal);
      Q.websearch.last = { queries: qs, candidates: pick.map((p) => p.title), keep };
      const rel = keep ? pick.filter((_, i) => keep.includes(i)) : pick.filter((h) => sc(h) > 0);
      pick.length = 0; pick.push(...rel);
      if (!pick.length) return null;
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
