/* QWQ Builder · КОД бөлімі және АГЕНТ */
(function (Q) {
  const { $, el, ic, esc, toast, fmtSize, byteLen, fmtTime, throttleRaf } = Q;
  const S = Q.store;
  const root = () => $("#code-root");

  // Жоспар мен іздеу параллель; "Дайын" код жазылған бойда, ал тексеру фонда жалғасады
  const STEPS = [
    { k: "plan", t: "Жоспар құру", i: "list", d: "" },
    { k: "search", t: "Интернеттен іздеу", i: "globe", d: "" },
    { k: "code", t: "Кодты жазу", i: "code", d: "" },
    { k: "verify", t: "Тексеру", i: "shield", d: "" },
    { k: "done", t: "Дайын", i: "flag", d: "" },
  ];
  const FILES = {
    plan: { name: "жоспар.md", i: "file" }, info: { name: "мәлімет.md", i: "globe" },
    html: { name: "index.html", i: "code" },
  };

  const R = { active: false, bg: false, bgId: 0, bgCtrl: null, ctrl: null, t0: 0, tick: 0, hide: false, auto: false, open: null, ui: {}, stepT: {} };

  /* ---------- уақыт лог (консольге) ---------- */
  function perf() {
    const t0 = performance.now(), r0 = S.usage.used, stages = [];
    const log = (label, sec) => { stages.push({ label, sec }); console.log(`[QWQ] ${label}: ${sec.toFixed(1)}с (бастан ${((performance.now() - t0) / 1000).toFixed(1)}с)`); };
    return {
      begin(label) { const t = performance.now(); return () => log(label, (performance.now() - t) / 1000); },
      total(label) {
        const sec = (performance.now() - t0) / 1000, req = S.usage.used - r0;
        console.log(`[QWQ] ${label}: ЖИЫНЫ ${sec.toFixed(1)}с, сұрау саны: ${req}`);
        window.__qwqPerf = Object.assign(window.__qwqPerf || {}, { [label]: { sec: +sec.toFixed(1), requests: req, stages } });
      },
    };
  }

  /* ---------- сурет салу ---------- */
  function render() {
    const c = root();
    const idea = S.data.idea;
    if (!idea) {
      c.innerHTML = `<div class="card glass empty"><h3>Идея жоқ</h3><button class="btn btn--primary glass" type="button" id="go-chat">${ic("chat")}Чатқа өту</button></div>`;
      $("#go-chat").onclick = () => Q.go("chat");
      return;
    }
    const hasHtml = !!S.data.files.html;
    const ag = S.data.agent;     // сақталған агент қадамдары (чат ауысқанда қалпына келеді)
    const stepLi = (s) => {
      const a = ag && ag.steps && ag.steps.find((x) => x.k === s.k);
      const st = a ? a.s : (hasHtml ? "done" : "");
      const cls = st === "warn" ? "done warn" : st;
      return `<li class="step${cls ? " " + cls : ""}" data-k="${s.k}"><div class="s-ic">${ic(st === "done" || st === "warn" ? "check" : s.i, "ico ico--sm")}</div><div><div class="s-t">${s.t}</div><div class="s-d">${a ? esc(a.d || "") : (hasHtml ? "" : s.d)}</div></div><div class="s-time">${a ? esc(a.t || "") : ""}</div></li>`;
    };
    c.innerHTML = `
      <article class="card glass">
        <h2>${esc(idea.title)}</h2>
        <p class="sum">${esc(idea.summary)}</p>
        <button class="toggle-prompt" type="button" id="tp" aria-expanded="false" aria-controls="pbox">Толық промпт ${ic("chev", "ico ico--sm")}</button>
        <textarea class="prompt-box" id="pbox" hidden aria-label="Толық промпт"></textarea>
        <div class="row">
          <button class="btn btn--primary btn--lg glass lens" type="button" id="go-agent">${ic("spark")}${hasHtml ? "Қайта жасау" : "Агентке жіберу"}</button>
          <button class="btn btn--lg glass glass--flat" type="button" id="stop-agent" hidden>${ic("stop", "ico ico--sm")}Тоқтату</button>
        </div>
      </article>
      <article class="card glass" id="agent-card" ${hasHtml || R.active || ag ? "" : "hidden"}>
        <div class="agent-h"><div class="eyebrow">Агент</div><div class="timer" id="timer">00:00.0</div></div>
        <ol class="steps" id="steps">${STEPS.map(stepLi).join("")}</ol>
        <div class="mini" id="mini" hidden><iframe id="mini-frame" title="Алдын ала көрініс" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"></iframe></div>
        <div class="live glass glass--dark glass--flat" id="live" hidden>
          <div class="live-h"><span id="live-name">index.html</span><span id="live-m"></span></div>
          <pre class="codeview caret" id="live-code"></pre>
        </div>
        <pre class="errs" id="errs" hidden></pre>
        <div class="row">
          <button class="btn glass glass--flat" type="button" id="peek" ${R.active || hasHtml ? "" : "hidden"}>${ic("eye", "ico ico--sm")}${hasHtml && !R.active ? "Нәтижені ашу" : "Нәтижені бірден көру"}</button>
        </div>
      </article>
      <div class="files" id="files"></div>
      <article class="glass glass--dark glass--flat" id="viewer" hidden style="border-radius:var(--r-md);overflow:hidden">
        <div class="viewer-bar"><span id="v-name"></span><span style="display:flex;gap:4px"><button class="btn btn--icon btn--sm glass-none" id="v-copy" type="button" aria-label="Көшіру">${ic("copy", "ico ico--sm")}</button><button class="btn btn--icon btn--sm" id="v-close" type="button" aria-label="Жабу">${ic("x", "ico ico--sm")}</button></span></div>
        <pre class="codeview tall" id="v-code"></pre>
      </article>`;
    const u = R.ui = { steps: $("#steps"), timer: $("#timer"), live: $("#live"), liveCode: $("#live-code"), liveM: $("#live-m"), liveName: $("#live-name"), files: $("#files"), viewer: $("#viewer"), peek: $("#peek"), go: $("#go-agent"), stop: $("#stop-agent"), card: $("#agent-card"), mini: $("#mini"), miniFrame: $("#mini-frame") };
    const pb = $("#pbox"); pb.value = idea.prompt;
    pb.oninput = () => { idea.prompt = pb.value; S.save(); };
    $("#tp").onclick = (e) => { const x = e.currentTarget; const o = x.getAttribute("aria-expanded") !== "true"; x.setAttribute("aria-expanded", o); pb.hidden = !o; };
    u.go.onclick = run;
    u.stop.onclick = () => R.ctrl && R.ctrl.abort();
    u.peek.onclick = peek;
    $("#v-close").onclick = () => { R.open = null; u.viewer.hidden = true; $$files(); };
    $("#v-copy").onclick = async () => {
      try { await navigator.clipboard.writeText(S.data.files[R.open] || ""); toast("Көшірілді.", "ok", 2000); } catch (e) { toast("Көшіру мүмкін болмады. Мәтінді қолмен белгілеп көшір.", "err"); }
    };
    u.files.onclick = (e) => { const b = e.target.closest(".file"); if (b) openFile(b.dataset.k); };
    Object.keys(FILES).forEach((k) => S.data.files[k] && addFileRow(k, false));
    if (ag && !R.active) u.timer.textContent = ag.total || "00:00.0";
    if (R.active) { setRunUI(true); }
  }
  const $$files = () => Q.$$(".file").forEach((b) => b.setAttribute("aria-expanded", b.dataset.k === R.open));

  /* ---------- файлдар ---------- */
  function addFileRow(k, anim = true) {
    if (!R.ui.files || !FILES[k]) return;
    const f = FILES[k], txt = S.data.files[k] || "";
    let b = R.ui.files.querySelector(`[data-k="${k}"]`);
    if (!b) {
      b = el("button", { class: "file glass glass--flat", type: "button", "data-k": k, "aria-expanded": "false" });
      if (!anim) b.style.animation = "none";
      R.ui.files.appendChild(b);
    }
    b.innerHTML = `<span class="fi">${ic(f.i, "ico ico--sm")}</span><span><b>${f.name}</b></span><span class="sz">${fmtSize(byteLen(txt))}</span>`;
  }
  function openFile(k) {
    if (R.open === k) { R.open = null; R.ui.viewer.hidden = true; $$files(); return; }
    R.open = k;
    const txt = S.data.files[k] || "";
    $("#v-name").textContent = FILES[k].name;
    $("#v-code").textContent = txt.length > 150000 ? txt.slice(0, 150000) + "\n… (көрсетуге шектеу, толық кодты жүктеп ал)" : txt;
    R.ui.viewer.hidden = R.hide;
    $$files();
    if (!R.hide) R.ui.viewer.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /* ---------- қадамдар ---------- */
  function setStep(k, state, detail) {
    const li = R.ui.steps && R.ui.steps.querySelector(`[data-k="${k}"]`);
    if (!li) return;
    li.classList.remove("active", "done", "warn");
    if (state) li.classList.add(state === "warn" ? "done" : state, ...(state === "warn" ? ["warn"] : []));
    const s = STEPS.find((x) => x.k === k);
    li.querySelector(".s-ic").innerHTML = ic(state === "done" || state === "warn" ? "check" : s.i, "ico ico--sm");
    if (detail != null) li.querySelector(".s-d").textContent = detail;
    if (state === "active" && !R.stepT[k]) { R.stepT[k] = performance.now(); li.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    if (state === "done" || state === "warn") li.querySelector(".s-time").textContent = ((performance.now() - (R.stepT[k] || R.t0)) / 1000).toFixed(1) + " с";
  }
  function setRunUI(on) {
    R.ui.go.hidden = on; R.ui.stop.hidden = !on;
    R.ui.card.hidden = false;
    R.ui.peek.hidden = false;
    R.ui.peek.innerHTML = `${ic("eye", "ico ico--sm")}${R.hide ? "Кодты көрсету" : "Нәтижені бірден көру"}`;
    R.ui.timer.classList.toggle("run", on);
  }
  function peek() {
    const has = !!S.data.files.html;
    if (!R.active) { Q.go("result"); return; }
    R.hide = !R.hide; R.auto = R.hide;
    R.ui.live.hidden = R.hide || R.ui.live.dataset.on !== "1";
    R.ui.viewer.hidden = R.hide || !R.open;
    setRunUI(true);
    if (R.hide) toast("Дайын болғанда ашылады.", "ok", 2500);
    if (has && R.hide) Q.go("result");
  }
  function saveAgent() {
    if (!R.ui.steps || !R.ui.timer) return;
    S.data.agent = {
      total: R.ui.timer.textContent,
      steps: STEPS.map((s) => {
        const li = R.ui.steps.querySelector(`[data-k="${s.k}"]`);
        return { k: s.k, s: li.classList.contains("warn") ? "warn" : li.classList.contains("done") ? "done" : "", d: li.querySelector(".s-d").textContent, t: li.querySelector(".s-time").textContent };
      }),
    };
    S.save();
  }
  /** Код жазылып жатқанда алдын ала көрініс (iframe) біртіндеп жаңарады */
  function showMini(html) {
    if (!R.ui.mini) return;
    R.ui.mini.hidden = false;
    R.ui.miniFrame.srcdoc = Q.check.preview(html);
  }

  /* ---------- серверге сұраулар (қолдау функциялары) ---------- */
  const brief = (idea) => `Атауы: ${idea.title}\nСипаттама: ${idea.summary}\nТолық тапсырма:\n${idea.prompt}`;

  function stripFence(t) { return t.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, ""); }
  function extractHtml(raw) {
    let t = raw;
    const m = t.search(/<!doctype\s+html|<html[\s>]/i);
    if (m >= 0) t = t.slice(m);
    else t = stripFence(t);
    const e = t.toLowerCase().lastIndexOf("</html>");
    if (e >= 0) t = t.slice(0, e + 7);
    else t = t.replace(/\n?```[\s\S]*$/, "");
    return t.trim();
  }
  const complete = (c) => /<\/html>\s*$/i.test(c);
  function dedupe(code, piece) {
    const tail = code.slice(-400);
    for (let n = Math.min(tail.length, piece.length, 400); n >= 20; n--) {
      if (piece.startsWith(tail.slice(-n))) return piece.slice(n);
    }
    return piece;
  }

  /* ---------- ТЕКСЕРУ ("Дайын" дейін): нақты басып көру + AI тексеруі → ақауларды түзету (ең көбі 3 айналым) ---------- */
  const plural = (n, w) => `${n} ${w}`;
  // ақаулардың салмағы: JS қате/бос бет — ауыр, өлі батырма — орташа, AI ескертуі — жеңіл
  const score = (issues) => issues.reduce((a, x) => a + (/^AI тексеруі/.test(x) ? 1 : /^(JS қате|Бет|Код|Басатын)/.test(x) ? 5 : 3), 0);
  /** Ақаулардың қысқа, түсінікті жиынтығы: «3 батырма жұмыс істемейді · 1 қате» */
  function summarize(chk, aiN) {
    const parts = [];
    if (chk.dead.length) parts.push(plural(chk.dead.length, "батырма жұмыс істемейді"));
    const other = chk.issues.length - chk.dead.length - chk.stat.length;
    if (chk.stat.length) parts.push(plural(chk.stat.length, "байланыс қатесі"));
    if (other > 0) parts.push(plural(other, "қате"));
    if (aiN) parts.push(plural(aiN, "ескерту (AI)"));
    return parts.join(" · ") || "ақау табылды";
  }

  async function verify(out, T, sig) {
    const idea = S.data.idea, F = S.data.files;
    let code = out.html, body = out.body, js = out.js, fixes = 0, aiIssues = [];
    let best = { html: code, body, js, issues: null, text: "" };
    const errBox = $("#errs");
    const showIssues = (list) => {
      if (!errBox) return;
      errBox.hidden = R.hide || !list.length;
      errBox.textContent = list.slice(0, 5).map((x) => "• " + x.slice(0, 150)).join("\n");
    };
    const pickBest = (issues, text) => {
      const sc = score(issues);
      if (best.issues === null || sc <= best.score) best = { html: code, body, js, issues, text, score: sc };
    };
    setStep("verify", "active", "Іске қосып, батырмаларды басып тексеріп жатыр…");
    // 1-айналым: нақты басып көру және AI тексеруі қатар жүреді
    const endChk = T.begin("тексеру (басу + AI)");
    const [chk0, ai] = await Promise.all([
      Q.check.run(code),
      Q.codegen.review({ plan: F.plan || "", body, js, sig }).catch((e) => { if (e.code === "abort") throw e; return []; }),
    ]);
    endChk();
    aiIssues = ai;
    let chk = chk0;
    for (;;) {
      const issues = chk.issues.concat(fixes === 0 ? aiIssues : []);
      const text = summarize(chk, fixes === 0 ? aiIssues.length : 0);
      pickBest(issues, text);
      console.log(`[QWQ] тексеру ${fixes}: басылды ${chk.clicked}, өлі ${chk.dead.length}, өңдегіші жоқ ${chk.nohandler}, ақау ${issues.length}`);
      if (!issues.length) break;
      setStep("verify", "active", text);
      showIssues(issues);
      if (fixes >= 3) break;
      fixes++;
      await Q.sleep(700);
      setStep("verify", "active", `Түзетіп жатыр… (${fixes}/3)`);
      const endFix = T.begin(`түзету ${fixes}`);
      const fx = await Q.codegen.fixJs({ title: idea.title, body, css: out.css, js, errors: issues, sig });
      endFix();
      if (fx) { js = fx.js; body = fx.body; code = fx.html; }
      setStep("verify", "active", "Қайта тексеріп жатыр…");
      const endRe = T.begin(`қайта тексеру ${fixes}`);
      chk = await Q.check.run(code);
      endRe();
    }
    if (errBox) errBox.hidden = true;
    const left = best.issues || [];
    if (!left.length) {
      setStep("verify", "done", fixes ? "Түзетілді ✓" : "Қате жоқ ✓");
    } else {
      // үш айналымнан кейін де ақау қалса — ең аз ақауы бар нұсқаны көрсетіп, нақты не істемейтінін айтамыз
      const names = [...new Set(left.map((x) => (x.match(/«([^»]+)»/) || [])[1]).filter(Boolean))].slice(0, 3).map((x) => `«${x}»`).join(", ");
      setStep("verify", "warn", `${best.text}${names ? ": " + names : ""} — кей жерлері жұмыс істемеуі мүмкін`);
    }
    return { html: best.html, body: best.body, js: best.js, fixes, left };
  }

  async function run() {
    const idea = S.data.idea;
    if (!idea || R.active) return;
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
        R.active = true; R.hide = false; R.auto = false; R.open = null; R.stepT = {};
    R.ctrl = new AbortController();
    S.data.files = {}; S.data.versions = [];
    render();                       // таза күй
    R.ui.live.dataset.on = "0";
    setRunUI(true);
    STEPS.forEach((s) => setStep(s.k, "", s.d));
    R.ui.steps.querySelectorAll(".s-time").forEach((e) => (e.textContent = ""));
    S.data.agent = null; S.data.share = null;
    R.t0 = performance.now();
    R.tick = setInterval(() => { R.ui.timer && (R.ui.timer.textContent = fmtTime(performance.now() - R.t0)); }, 100);
    R.ui.card.scrollIntoView({ block: "start", behavior: "smooth" });
    const sig = R.ctrl.signal, T = perf();
    let cur = "plan";
    try {
      /* 1+2. Жоспар және интернеттен іздеу ПАРАЛЛЕЛЬ */
      setStep("plan", "active", ""); setStep("search", "active", "");
      const planP = (async () => {
        const end = T.begin("жоспар");
        const tick = throttleRaf((_, full) => setStep("plan", "active", `Жазылды: ${full.length} таңба`));
        const p = await Q.api.chat({
          signal: sig, web: false, stream: true, agent: true, model: Q.codegen.PLAN_MODEL,
          message: `Сен тәжірибелі веб-әзірлеушісің. Мына қосымша үшін қысқа әзірлеу жоспарын жаса.\n\n${brief(idea)}\n\nЖауапты қазақша, Markdown пішімінде бер, 30 жолдан аспасын. Бөлімдер: ## Мақсат, ## Экрандар, ## Негізгі функциялар, ## Деректер (localStorage), ## Дизайн (түстер, көңіл-күй). Код жазба. Қысқа абзацтар мен тізімдер қолдан, абзацтардың арасында бос жол қалдыр.`,
          onDelta: tick,
        });
        tick.cancel();
        S.data.files.plan = p.answer; addFileRow("plan");
        setStep("plan", "done", "");
        end();
      })();
      const searchP = (async () => {
        const end = T.begin("іздеу");
        // іздеу міндетті емес: 12 с-тан ұзаққа созылса (502, қайталау, үнсіздік), оны тоқтатып жалғастырамыз
        const sc = new AbortController(); let timedOut = false;
        const link = () => sc.abort(); sig.addEventListener("abort", link, { once: true });
        const timer = setTimeout(() => { timedOut = true; sc.abort(); }, 12000);
        let info = "";
        try {
          const r = await Q.api.chat({
            signal: sc.signal, web: true, stream: false, tries: 2,
            message: `Мына қосымшаны жасау үшін интернеттен пайдалы мәлімет тап: нақты деректер, ережелер, формулалар, жақсы UI үлгілері.\n\n${brief(idea)}\n\nҚысқа маркерлі тізім бер (14 жолға дейін), қазақша, Markdown пішімінде, элементтердің арасында бос жол қалдыр.`,
          });
          const src = (r.sources || []).map((s) => (typeof s === "string" ? s : s.url ? `[${s.title || s.url}](${s.url})` : s.title || "")).filter(Boolean);
          info = `# Жиналған мәлімет\n\n${r.answer}\n` + (src.length ? `\n## Дереккөздер\n${src.map((x) => "- " + x).join("\n")}\n` : "");
          S.data.files.info = info; addFileRow("info");
          const urls = new Set((r.answer.match(/https?:\/\/[^\s)\]>"']+/g) || []).map((u) => u.replace(/[.,;]+$/, "")));
          const n = src.length || urls.size;
          setStep("search", "done", n ? `${n} дереккөз` : (r.tools || []).includes("web_search") ? "Іздеу орындалды" : "");
        } catch (e) {
          if (e.code === "abort" && !timedOut) throw e;
          S.data.files.info = "# Жиналған мәлімет\n\nІздеу өткізілді, жоба жоспар бойынша жасалды.\n"; addFileRow("info");
          setStep("search", "warn", "Іздеу өткізілді");
        } finally { clearTimeout(timer); sig.removeEventListener("abort", link); end(); }
      })();
      try { await Promise.all([planP, searchP]); }
      catch (e) { R.ctrl.abort(); await Promise.allSettled([planP, searchP]); throw e; }
      const info = S.data.files.info || "";

      /* 3. Кодты БІР сұраумен жазу (дайын үлгіге мазмұн + логика) */
      cur = "code";
      setStep("code", "active", "");
      R.ui.live.dataset.on = "1"; R.ui.live.hidden = R.hide;
      if (R.ui.liveName) R.ui.liveName.textContent = "жауап";
      const paint = throttleRaf((full) => {
        if (!R.ui.liveCode) return;
        const lines = full.split("\n").length;
        R.ui.liveCode.textContent = full.length > 5000 ? "…\n" + full.slice(-5000) : full;
        R.ui.liveCode.scrollTop = R.ui.liveCode.scrollHeight;
        R.ui.liveM.textContent = `${lines} жол · ${fmtSize(byteLen(full))}`;
      });
      let lastPrev = 0, lastSig = "";
      const onPreview = (full, build) => {
        const now = performance.now();
        if (now - lastPrev < 1400) return;
        const p = Q.template.parse(full);
        const sg = p.stage + ":" + Math.floor((p.body.length + p.css.length + p.js.length) / 300);
        if (sg === lastSig || p.stage < 1 || p.body.length < 80) return;
        lastPrev = now; lastSig = sg;
        showMini(build(full));
      };
      const endCode = T.begin("код (бір сұрау)");
      const out = await Q.codegen.write({
        idea, brief: brief(idea), plan: S.data.files.plan || "", info, sig,
        onLive: (full) => paint(full), onPreview, onStage: (t) => setStep("code", "active", t),
      });
      endCode();
      const F = S.data.files;
      F.body = out.body; F.css = out.css; F.js = out.js; F.html = out.html;
      addFileRow("html");
      showMini(out.html);
      setStep("code", "done", `${out.html.split("\n").length} жол · ${fmtSize(byteLen(out.html))}`);

      /* 4. Тексеру: батырмаларды нақты басып көру + AI тексеруі, ақауларды түзету */
      cur = "verify";
      const fin = await verify(out, T, sig);
      F.body = fin.body; F.js = fin.js; F.html = fin.html; addFileRow("html");
      showMini(fin.html);

      /* 5. Дайын: тек тексеруден кейін */
      cur = "done";
      S.data.versions = [{ html: fin.html, note: fin.fixes ? "Автотүзетілген нұсқа" : "Бастапқы нұсқа" }];
      S.save();
      setStep("done", "done", "");
      clearInterval(R.tick); R.ui.timer.textContent = fmtTime(performance.now() - R.t0);
      T.total("агент (тексерумен)");
      R.ui.live.hidden = true;
      R.ui.liveCode.classList.remove("caret");
      Q.result.refresh(true);
      const dot = $("#dot-result"); if (Q.view !== "result") dot.hidden = false;
      if (R.auto) Q.go("result"); else toast(fin.left.length ? "Дайын (кей жерлері жұмыс істемеуі мүмкін)" : "Дайын!", fin.left.length ? "err" : "ok", 3500);
    } catch (e) {
      if (e.code === "abort") toast("Тоқтатылды.", "ok", 2000);
      else toast(e.message || "Агент жұмысын аяқтай алмады. Қайта байқап көр.", "err", 8000);
      const li = R.ui.steps && R.ui.steps.querySelector(`[data-k="${cur}"]`);
      if (li) { li.classList.remove("active"); li.querySelector(".s-d").textContent = e.code === "abort" ? "Тоқтатылды" : "Қате шықты"; li.querySelector(".s-ic").innerHTML = ic(STEPS.find((x) => x.k === cur).i, "ico ico--sm"); }
      R.ui.steps && R.ui.steps.querySelectorAll(".step.active").forEach((x) => x.classList.remove("active"));
      S.save();
    } finally {
      clearInterval(R.tick);
      R.active = false; R.ctrl = null;
      saveAgent();
      if (R.ui.go) {
        R.ui.go.hidden = false; R.ui.stop.hidden = true;
        R.ui.go.innerHTML = `${ic("spark")}${S.data.files.html ? "Қайта жасау" : "Қайта байқау"}`;
        R.ui.timer.classList.remove("run");
        R.ui.peek.hidden = !S.data.files.html;
        R.ui.peek.innerHTML = `${ic("eye", "ico ico--sm")}Нәтижені ашу`;
      }
    }
  }

  Q.code = { render, run, isRunning: () => R.active, extractHtml, complete, dedupe, stripFence };
})(window.QWQ);
