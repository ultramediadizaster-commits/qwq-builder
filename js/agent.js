/* QWQ Builder · КОД бөлімі және АГЕНТ */
(function (Q) {
  const { $, el, ic, esc, toast, fmtSize, byteLen, fmtTime, throttleRaf } = Q;
  const S = Q.store;
  const root = () => $("#code-root");

  const STEPS = [
    { k: "plan", t: "Жоспар құру", i: "list", d: "" },
    { k: "search", t: "Интернеттен іздеу", i: "globe", d: "" },
    { k: "code", t: "Кодты жазу", i: "code", d: "" },
    { k: "verify", t: "Тексеру", i: "shield", d: "" },
    { k: "done", t: "Дайын", i: "flag", d: "" },
  ];
  const FILES = {
    plan: { name: "жоспар.md", i: "file" }, info: { name: "мәлімет.md", i: "globe" },
    body: { name: "құрылым.html", i: "code" }, css: { name: "стиль.css", i: "code" }, js: { name: "логика.js", i: "code" },
    html: { name: "index.html", i: "code" },
  };

  const R = { active: false, ctrl: null, t0: 0, tick: 0, hide: false, auto: false, open: null, ui: {}, stepT: {} };

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
    const u = R.ui = { steps: $("#steps"), timer: $("#timer"), live: $("#live"), liveCode: $("#live-code"), liveM: $("#live-m"), liveName: $("#live-name"), files: $("#files"), viewer: $("#viewer"), peek: $("#peek"), go: $("#go-agent"), stop: $("#stop-agent"), card: $("#agent-card") };
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
    const li = R.ui.steps.querySelector(`[data-k="${k}"]`);
    if (!li) return;
    li.classList.remove("active", "done", "warn");
    if (state) li.classList.add(state === "warn" ? "done" : state, ...(state === "warn" ? ["warn"] : []));
    const s = STEPS.find((x) => x.k === k);
    li.querySelector(".s-ic").innerHTML = ic(state === "done" || state === "warn" ? "check" : s.i, "ico ico--sm");
    if (detail != null) li.querySelector(".s-d").textContent = detail;
    if (state === "active") { R.stepT[k] = performance.now(); li.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
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

  /* ---------- серверге сұраулар ---------- */
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

  /** Код </html>-мен аяқталмаса, үзілген жерінен жалғастыруды сұрайды (ең көбі 4 рет) */
  async function ensureComplete(code, sig, say, paint) {
    let tries = 0;
    while (!complete(code) && tries < 4) {
      tries++;
      say(`Жалғастыру ${tries}/4`);
      const r = await Q.api.chat({
        signal: sig, web: false, stream: true,
        message: `Төмендегі HTML коды жауап ұзындығына байланысты үзіліп қалды. Дәл үзілген жерден жалғастыр: ТЕК қалған кодты жаз, қайталама, түсініктеме қоспа, \`\`\` белгісін қоспа. Код </html> тегімен аяқталсын.\n\nСоңғы бөлік:\n${code.slice(-1500)}`,
        onDelta: (_, full) => paint(code + full),
      });
      const piece = dedupe(code, stripFence(r.answer.replace(/^\s*```[a-zA-Z]*\s*\n?/, "")));
      code = (code + piece).trim();
      const e = code.toLowerCase().lastIndexOf("</html>");
      if (e >= 0) code = code.slice(0, e + 7);
    }
    if (!complete(code)) code += "\n</script></body></html>";
    return code;
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
    const sig = R.ctrl.signal;
    let cur = "plan";
    try {
      /* 1. Жоспар */
      setStep("plan", "active", "");
      const planTick = throttleRaf((_, full) => setStep("plan", "active", `Жазылды: ${full.length} таңба`));
      const p = await Q.api.chat({
        signal: sig, web: false, stream: true,
        message: `Сен тәжірибелі веб-әзірлеушісің. Мына қосымша үшін қысқа әзірлеу жоспарын жаса.\n\n${brief(idea)}\n\nЖауапты қазақша, Markdown пішімінде бер, 30 жолдан аспасын. Бөлімдер: ## Мақсат, ## Экрандар, ## Негізгі функциялар, ## Деректер (localStorage), ## Дизайн (түстер, көңіл-күй). Код жазба. Қысқа абзацтар мен тізімдер қолдан, абзацтардың арасында бос жол қалдыр.`,
        onDelta: planTick,
      });
      planTick.cancel();
      S.data.files.plan = p.answer; addFileRow("plan");
      setStep("plan", "done", "");

      /* 2. Интернеттен іздеу (QWQ web:true) */
      cur = "search";
      setStep("search", "active", "");
      let info = "";
      try {
        const r = await Q.api.chat({
          signal: sig, web: true, stream: false, tries: 3,
          message: `Мына қосымшаны жасау үшін интернеттен пайдалы мәлімет тап: нақты деректер, ережелер, формулалар, жақсы UI үлгілері.\n\n${brief(idea)}\n\nҚысқа маркерлі тізім бер (14 жолға дейін), қазақша, Markdown пішімінде, элементтердің арасында бос жол қалдыр.`,
        });
        const src = (r.sources || []).map((s) => (typeof s === "string" ? s : s.url ? `[${s.title || s.url}](${s.url})` : s.title || "")).filter(Boolean);
        info = `# Жиналған мәлімет\n\n${r.answer}\n` + (src.length ? `\n## Дереккөздер\n${src.map((x) => "- " + x).join("\n")}\n` : "");
        S.data.files.info = info; addFileRow("info");
        // Worker кейде sources-ті бос қайтарады: сілтемелерді жауап мәтінінен санаймыз
        const urls = new Set((r.answer.match(/https?:\/\/[^\s)\]>"']+/g) || []).map((u) => u.replace(/[.,;]+$/, "")));
        const n = src.length || urls.size;
        setStep("search", "done", n ? `${n} дереккөз` : (r.tools || []).includes("web_search") ? "Іздеу орындалды" : "");
      } catch (e) {
        if (e.code === "abort") throw e;
        S.data.files.info = "# Жиналған мәлімет\n\nІздеу кезінде қате шықты, жоба жоспар бойынша жасалды.\n"; addFileRow("info");
        setStep("search", "warn", "Іздеу қолжетімсіз");
      }

      /* 3. Код жазу (stream) */
      cur = "code";
      setStep("code", "active", "");
      R.ui.live.dataset.on = "1"; R.ui.live.hidden = R.hide;
      const paint = throttleRaf((full) => {
        if (!R.ui.liveCode) return;
        const lines = full.split("\n").length;
        R.ui.liveCode.textContent = full.length > 5000 ? "…\n" + full.slice(-5000) : full;
        R.ui.liveCode.scrollTop = R.ui.liveCode.scrollHeight;
        R.ui.liveM.textContent = `${lines} жол · ${fmtSize(byteLen(full))}`;
      });
      // үш бөлікпен жазу: HTML құрылымы → CSS → JS, сосын біріктіру
      const live = (name, full) => {
        if (R.ui.liveName) R.ui.liveName.textContent = name;
        paint(full);
      };
      let code = await Q.codegen.write({
        idea, brief: brief(idea), plan: S.data.files.plan || "", info, sig,
        onPart: (k, label) => { setStep("code", "active", label); },
        onLive: live,
        onFile: (k) => addFileRow(k),
      });
      S.data.files.html = code; addFileRow("html");
      setStep("code", "done", `${code.split("\n").length} жол · ${fmtSize(byteLen(code))}`);

      /* 4. Тексеру */
      cur = "verify";
      setStep("verify", "active", "");

      // 4б. іске қосып тексеру → қате болса QWQ-ге түзеттіру (ең көбі 3 рет)
      const errBox = $("#errs");
      let best = { code, errs: null }, fixes = 0;
      for (;;) {
        setStep("verify", "active", fixes ? "Қайта тексеріп жатыр…" : "Іске қосып тексеріп жатыр…");
        const { errors } = await Q.check.run(code);
        if (best.errs === null || errors.length <= best.errs.length) best = { code, errs: errors };
        if (!errors.length) break;
        setStep("verify", "active", `${errors.length} қате табылды`);
        if (errBox) { errBox.hidden = R.hide; errBox.textContent = errors.slice(0, 4).map((x) => "• " + x.slice(0, 130)).join("\n"); }
        if (fixes >= 3) break;
        fixes++;
        await Q.sleep(1100);
        setStep("verify", "active", `Түзетіп жатыр… (${fixes}/3)`);
        const F = S.data.files;
        if (F.body && F.css && F.js) {
          // бөлікпен жазылған қосымша: тек JS бөлігін түзетеміз
          const fx = await Q.codegen.fixJs({
            title: idea.title, body: F.body, css: F.css, js: F.js, errors, sig,
            onPart: (k, label) => setStep("verify", "active", `Түзетіп жатыр… (${fixes}/3)`),
            onLive: live,
          });
          if (fx) { F.js = fx.js; addFileRow("js"); code = fx.html; F.html = code; addFileRow("html"); }
        } else {
          const r = await Q.api.chat({
            signal: sig, web: false, stream: true,
            message: `Төмендегі HTML қосымшаны іске қосқанда мына қателер табылды:\n${errors.map((x) => "- " + x).join("\n")}\n\nМына қателерді түзет, толық файлды қайтар. Басқа жерін бұзба, интерфейс қазақша қалсын. Жауапта ТЕК толық түзетілген index.html кодын бір \`\`\`html блогымен бер.\n\n\`\`\`html\n${code}\n\`\`\``,
            onDelta: (_, full) => paint(full),
          });
          const fixed = await ensureComplete(extractHtml(r.answer), sig, (t) => setStep("verify", "active", t), paint);
          // QWQ кодты қысқартып жіберсе, түзетуді қабылдамаймыз
          if (byteLen(fixed) >= 0.6 * byteLen(code)) { code = fixed; F.html = code; addFileRow("html"); }
        }
      }
      if (errBox) errBox.hidden = true;
      code = best.code; S.data.files.html = code; addFileRow("html");
      const left = best.errs || [];
      setStep("verify", left.length ? "warn" : "done", left.length ? "Кей жерлері жұмыс істемеуі мүмкін" : fixes ? `Қате жоқ ✓ (${fixes} түзету)` : "Қате жоқ ✓");

      /* 5. Дайын */
      cur = "done";
      S.data.versions = [{ html: code, note: "Бастапқы нұсқа" }];
      S.save();
      setStep("done", "done", "");
      R.ui.live.hidden = true;
      R.ui.liveCode.classList.remove("caret");
      Q.result.refresh(true);
      const dot = $("#dot-result"); if (Q.view !== "result") dot.hidden = false;
      if (R.auto) Q.go("result"); else toast("Дайын!", "ok", 3500);
    } catch (e) {
      if (e.code === "abort") toast("Тоқтатылды.", "ok", 2000);
      else toast(e.message || "Агент жұмысын аяқтай алмады. Қайта байқап көр.", "err", 8000);
      const li = R.ui.steps && R.ui.steps.querySelector(`[data-k="${cur}"]`);
      if (li) { li.classList.remove("active"); li.querySelector(".s-d").textContent = e.code === "abort" ? "Тоқтатылды" : "Қате шықты"; li.querySelector(".s-ic").innerHTML = ic(STEPS.find((x) => x.k === cur).i, "ico ico--sm"); }
      S.save();
    } finally {
      clearInterval(R.tick);
      R.active = false; R.ctrl = null;
      // қадамдардың соңғы күйін чатпен бірге сақтаймыз
      if (R.ui.steps) {
        S.data.agent = {
          total: R.ui.timer.textContent,
          steps: STEPS.map((s) => {
            const li = R.ui.steps.querySelector(`[data-k="${s.k}"]`);
            return { k: s.k, s: li.classList.contains("warn") ? "warn" : li.classList.contains("done") ? "done" : "", d: li.querySelector(".s-d").textContent, t: li.querySelector(".s-time").textContent };
          }),
        };
        S.save();
      }
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
