/* QWQ Builder · интерактивті нұсқаулық (QWQ роботы).
   Тек алғаш кірген адамға өздігінен шығады (localStorage белгісі; Google арқылы кірсе — Firestore users/{uid}/builderMeta/prefs).
   Нұсқаулық нақты API шақырмайды: уақытша демо чат көрсетіледі, ештеңе сақталмайды, соңында бәрі бұрынғы қалпына қайтады.
   Біткен соң робот төменгі бұрыштағы «?» батырмасына айналады; баптауларда «Нұсқаулықты қайта көру» бар. */
(function (Q) {
  const { $, esc } = Q;
  const S = Q.store;
  const STEPS = Q.onboardingSteps || [];
  const K_DONE = "qwq.tour.done", K_MUTE = "qwq.tour.muted";
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mobile = () => innerWidth <= 600;
  const nn = (i) => String(i + 1).padStart(2, "0");

  let T = null, help = null;

  /* ---------- демо деректер (сабақ кестесі) ---------- */
  function demoChat() {
    const BODY = `<header class="top"><h1>Сабақ <span class="grad">кестесі</span></h1><p class="muted">7«А» сынып · бүгін сейсенбі</p></header>
<section class="screen on" id="today"><div class="chips"><button class="chip">Дс</button><button class="chip on">Сс</button><button class="chip">Ср</button><button class="chip">Бс</button><button class="chip">Жм</button></div>
<div class="list"><div class="item"><div class="grow"><b>Математика</b><span>08:30 · 204 каб.</span></div><span class="badge ok">қазір</span></div>
<div class="item"><div class="grow"><b>Қазақ тілі</b><span>09:25 · 112 каб.</span></div></div><div class="item"><div class="grow"><b>Информатика</b><span>10:20 · 301 каб.</span></div></div>
<div class="item"><div class="grow"><b>Дене шынықтыру</b><span>11:15 · спортзал</span></div></div></div><button class="btn primary block" style="margin-top:12px">Еске салу</button></section>
<section class="screen" id="week"><div class="card"><h2>Апта</h2><p class="muted">30 сабақ · 5 күн</p></div></section>
<nav class="tabbar"><button class="tab on" data-go="today">Бүгін</button><button class="tab" data-go="week">Апта</button></nav>`;
    const html = Q.template.build("Сабақ кестесі", BODY, "", "");
    const t = Date.now();
    return {
      id: "tour-demo", title: "Сабақ кестесі", auto: false, created: t, updated: t, demo: true,
      messages: [
        { role: "user", content: "Маған сабақ кестесін көрсететін қосымша керек" },
        { role: "assistant", content: "Керемет идея! Нақтылап алайық:\n\n- **Сабақтар:** қай сынып, аптасына неше күн?\n- **Еске салғыш:** сабақ басталар алдында хабарлау керек пе?\n- **Дизайн:** қандай түс ұнайды?\n\nСонымен қатар бүгінгі сабақты белгілеп, апталық көріністі қосуды ұсынамын." },
      ],
      idea: { title: "Сабақ кестесі", summary: "Сынып кестесін күн бойынша көрсетіп, сабақ алдында еске салатын қосымша.", prompt: "Сынып кестесін көрсететін қосымша жаса: күндер бойынша қойындылар, бүгінгі сабақ белгіленеді, сабақ уақыты мен кабинеті, еске салу, апталық көрініс. Қараңғы дизайн, көгілдір акцент." },
      files: {
        plan: "## Мақсат\nСынып кестесін ыңғайлы көрсету.\n\n## Экрандар\n- Бүгін\n- Апта\n",
        info: "# Жиналған мәлімет\n\n- Сабақ кестесі — оқушылардың апта бойындағы дәрістерінің жоспары.\n\n## Дереккөздер\n- [Сабақ кестесі — Wikipedia](https://kk.wikipedia.org/wiki/Сабақ_кестесі)\n",
        html,
      },
      versions: [{ html, note: "Автотүзетілген нұсқа", t }], verIdx: 0, share: null,
      agent: { total: "01:24.6", steps: [
        { k: "plan", s: "done", d: "", t: "8.1 с" }, { k: "search", s: "done", d: "2 дереккөз: Сабақ кестесі, Мектеп", t: "9.4 с" },
        { k: "code", s: "done", d: "212 жол · 14,8 КБ", t: "52.3 с" }, { k: "verify", s: "done", d: "Түзетілді ✓", t: "14.2 с" }, { k: "done", s: "done", d: "", t: "84.6 с" }] },
      report: { t, sec: 14.2, fixes: 1, rounds: 2, clicked: 6,
        btns: [{ l: "Дс", ok: true }, { l: "Ср", ok: true }, { l: "Бс", ok: true }, { l: "Жм", ok: true }, { l: "Еске салу", ok: true }, { l: "Апта", ok: true }],
        found: ["Өлі батырма: «Еске салу» (button.btn) — басқанда ештеңе өзгермейді (өңдегіш тағылмаған)"],
        fixed: ["Өлі батырма: «Еске салу» (button.btn) — басқанда ештеңе өзгермейді (өңдегіш тағылмаған)"], left: [], shots: [] },
    };
  }

  /** Демо чатқа уақытша ауысу: сақтау өшіріледі, нақты чаттар өзгермейді */
  function enterDemo() {
    T.orig = { cur: S.cur, view: Q.view, input: $("#input").value, save: S.save };
    S.save = () => {};
    S.cur = demoChat();
    Q.chat.renderAll(); Q.code.render(); Q.result.refresh();
  }
  function exitDemo() {
    if (!T || !T.orig) return;
    const o = T.orig; T.orig = null;
    S.save = o.save; S.cur = o.cur;
    $("#input").value = o.input; $("#input").dispatchEvent(new Event("input"));
    Q.chat.renderAll(); Q.code.render(); Q.result.refresh();
    Q.go(o.view || "chat");
  }

  /* ---------- көпіршік және басқару ---------- */
  function buildUI() {
    const block = document.createElement("div");
    block.className = "qwq-block";                         // нұсқаулық кезінде сайтты кездейсоқ басып, нақты сұрау жібермеу үшін
    const skip = document.createElement("button");
    skip.className = "qwq-skip"; skip.type = "button"; skip.textContent = "Өткізіп жіберу";
    skip.onclick = () => end(true);
    const b = document.createElement("div");
    b.className = "qwq-bubble"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "QWQ нұсқаулығы");
    b.innerHTML = `<div class="qb-step" id="qb-step"></div><div class="qb-text" id="qb-t" aria-live="polite"></div>
      <div class="qb-ctl">
        <button id="qb-pause" type="button">⏸ Тоқтату</button><button id="qb-mute" type="button" aria-pressed="false"></button>
        <button id="qb-prev" type="button">← Алдыңғысы</button><button id="qb-again" type="button">↻ Қайта түсіндір</button><button id="qb-next" class="qb-main" type="button">Әрі қарай →</button>
      </div>`;
    document.body.append(block, skip, b);
    T.ui = { block, skip, b, t: b.querySelector("#qb-t"), step: b.querySelector("#qb-step"), pause: b.querySelector("#qb-pause"), mute: b.querySelector("#qb-mute"), prev: b.querySelector("#qb-prev"), again: b.querySelector("#qb-again"), next: b.querySelector("#qb-next") };
    const u = T.ui;
    u.pause.onclick = () => { const sp = T.sp; if (!sp) return; if (sp.paused) { sp.resume(); u.pause.textContent = "⏸ Тоқтату"; } else { sp.pause(); u.pause.textContent = "▶ Жалғастыру"; } };
    u.mute.onclick = () => { T.muted = !T.muted; ls.set(K_MUTE, T.muted ? "1" : "0"); muteLabel(); if (T.sp) T.sp.setMuted(T.muted); };
    u.prev.onclick = () => go(T.i - 1);
    u.again.onclick = () => go(T.i);
    u.next.onclick = () => (T.i >= STEPS.length - 1 ? end(false) : go(T.i + 1));
    muteLabel();
  }
  const muteLabel = () => { const m = T.ui.mute; m.textContent = T.muted ? "🔇 Дыбыссыз" : "🔊 Дыбыс"; m.setAttribute("aria-pressed", String(T.muted)); m.setAttribute("aria-label", T.muted ? "Дыбысты қосу" : "Дыбысты өшіру"); };
  function controls(speaking) {
    const u = T.ui, last = T.i >= STEPS.length - 1;
    u.pause.hidden = !speaking; u.mute.hidden = false;
    u.prev.hidden = speaking || T.i === 0; u.again.hidden = speaking; u.next.hidden = speaking;
    u.pause.textContent = "⏸ Тоқтату";
    u.next.textContent = last ? "Бастау!" : "Әрі қарай →";
    if (!speaking) u.next.focus({ preventScroll: true });
  }
  function setText(s) {
    const t = T.ui.t;
    t.style.opacity = 0;
    setTimeout(() => { t.textContent = s; t.style.opacity = 1; layout(T.el, false); }, 120);
  }

  /* ---------- орналасу: нысананы жаппайтындай ---------- */
  function layout(el, move = true) {
    if (!T) return;
    const R = T.robot, s = R.size(), b = T.ui.b, bw = b.offsetWidth, bh = b.offsetHeight, W = innerWidth, H = innerHeight, m = 16;
    const r = el && el.isConnected ? el.getBoundingClientRect() : null;
    let rx, ry, bx, by;
    if (mobile()) {
      // телефон: робот пен көпіршік төменде; нысана төменгі аймақта болса — жоғарыда
      const groupH = bh + s * 0.95, safeB = 12;
      const overlapBottom = r ? Math.max(0, r.bottom - (H - groupH - safeB)) : 0, overlapTop = r ? Math.max(0, groupH + m + 50 - r.top) : 0;
      const top = r && overlapBottom > 0 && overlapBottom > overlapTop && r.height < H * 0.6;
      bx = (W - bw) / 2;
      if (top) { ry = 56 + s * 0.5; by = 56 + s * 0.95; }
      else { by = H - bh - safeB; ry = by - s * 0.42; }
      rx = bx + s * 0.55;
    } else {
      const gap = 12, gw = s + gap + bw, gh = Math.max(s * 1.1, bh);
      const mt = 68;   // жоғарғы оң бұрышта «Өткізіп жіберу» тұр
      const fit = (x, y) => x >= m && x + gw <= W - m && y >= mt && y + gh <= H - m;
      const clampY = (y) => Math.max(mt, Math.min(H - m - gh, y));
      const clampX = (x) => Math.max(m, Math.min(W - m - gw, x));
      let x, y, robotLeft = true;
      if (!r) { x = (W - gw) / 2; y = (H - gh) / 2; }
      else {
        const c = [
          [r.right + 28, clampY(r.top + r.height / 2 - gh / 2), true],
          [r.left - 28 - gw, clampY(r.top + r.height / 2 - gh / 2), false],
          [clampX(r.left), r.bottom + 24, true],
          [clampX(r.left), r.top - 24 - gh, true],
        ].find(([cx, cy]) => fit(cx, cy));
        if (c) [x, y, robotLeft] = c; else { x = W - m - gw; y = H - m - gh - 90; }
      }
      by = y + (gh - bh) / 2; ry = y + gh / 2;
      if (robotLeft) { rx = x + s / 2; bx = x + s + gap; } else { bx = x; rx = x + bw + gap + s / 2; }
    }
    b.style.left = Math.round(bx) + "px"; b.style.top = Math.round(by) + "px";
    if (move) return R.el.style.opacity === "1" ? R.moveTo(rx, ry) : R.appear(rx, ry);
    T.home = { x: rx, y: ry };
    if (mobile()) R.place(rx, ry);   // телефонда көпіршік биіктігі өзгерсе, робот оның үстінде қалады
  }

  /** «a|b» — бірінші көрінетін элемент; null — экран ортасы */
  const resolve = (sel) => {
    if (!sel) return null;
    for (const q of sel.split("|")) { const e = document.querySelector(q); if (e && e.getBoundingClientRect().width > 0) return e; }
    return document.querySelector(sel.split("|")[0]);
  };
  function inView(el) { const r = el.getBoundingClientRect(); return r.top >= 60 && r.bottom <= innerHeight - 40; }

  async function focus(step, ti, tok) {
    const sel = (step.target || [])[ti];
    let el = resolve(sel);
    if (el && el.closest("#drawer") && !$("#drawer").classList.contains("on")) { Q.chats.open(); await sleep(450); el = resolve(sel); }
    if (tok !== T.tok) return;
    if (el && !inView(el)) { el.scrollIntoView({ block: "center", behavior: "smooth" }); await sleep(450); }
    if (tok !== T.tok) return;
    T.el = el; T.ti = ti;
    T.ui.block.classList.toggle("dim", !el);
    T.robot.relax();
    T.robot.highlight(el);
    // «Өткізіп жіберу» нысананы жаппасын: тиіп тұрса, сол жақ бұрышқа ауысады
    const sk = T.ui.skip; sk.classList.remove("alt");
    if (el) { const a = sk.getBoundingClientRect(), r = el.getBoundingClientRect(); if (!(a.right < r.left || r.right < a.left || a.bottom < r.top || r.bottom < a.top)) sk.classList.add("alt"); }
    await layout(el);
    if (tok !== T.tok) return;
    if (el) await T.robot.pointAt(el);
  }

  /* ---------- қадам ---------- */
  async function go(i) {
    if (!T || i < 0 || i >= STEPS.length) return;
    const tok = ++T.tok, st = STEPS[i], R = T.robot;
    T.i = i; T.typed = false;
    if (T.sp) { T.sp.stop(); T.sp = null; }
    R.unhighlight(); R.relax();
    if (!st.drawer && $("#drawer").classList.contains("on")) Q.chats.close();
    if (st.view && Q.view !== st.view) { Q.go(st.view); await sleep(350); }
    if (i === 1) { $("#input").value = ""; $("#input").dispatchEvent(new Event("input")); }
    if (tok !== T.tok) return;
    T.ui.step.textContent = `${i + 1} / ${STEPS.length} · ${st.t}`;
    // демода қосымша дайын тұрғандықтан батырма «Қайта жасау» деп жазылады; нұсқаулықта ол «Агентке жіберу» болып көрінсін
    if (st.demo === "idea") { const g = $("#go-agent"); if (g) g.innerHTML = `${Q.ic("spark")}Агентке жіберу`; }
    T.ui.t.textContent = "";
    controls(true);
    R.emotion(st.emotion || "normal");
    await focus(st, 0, tok);
    if (tok !== T.tok) return;
    const targets = (st.target || []).length;
    T.sp = R.speak({
      audio: `audio/onboarding/${nn(i)}.mp3`, vtt: `audio/onboarding/${nn(i)}.vtt`, text: st.text, muted: T.muted,
      onCue: (c, j, n) => {
        if (tok !== T.tok) return;
        setText(c.text);
        // мәтін бойымен келесі нысанаға өту («сосын …»)
        const ti = targets > 1 ? Math.min(targets - 1, Math.floor((j / n) * targets)) : 0;
        if (ti !== T.ti) focus(st, ti, tok);
        if (st.emotion2 && j >= n / 2) R.emotion(st.emotion2);
        if (st.act === "type" && !T.typed && /Маған сабақ/.test(c.text)) { T.typed = true; R.typeInto($("#input"), st.typeText); }
      },
      onEnd: () => { if (tok !== T.tok) return; T.sp = null; controls(false); if (st.act === "bye") R.wave(1); },
    });
  }

  /* ---------- бастау / аяқтау ---------- */
  function start() {
    if (T || !STEPS.length || !window.QWQRobot) return;
    if (Q.chat.isBusy() || Q.code.isRunning()) { Q.toast("Жұмыс аяқталғанша күте тұр", "err", 3000); return; }
    if (help) { help.remove(); help = null; }
    document.querySelectorAll(".scrim.on").forEach((x) => x.classList.remove("on"));
    T = { i: 0, tok: 0, muted: ls.get(K_MUTE) === "1", robot: QWQRobot.create(document.body), sp: null };
    enterDemo();
    buildUI();
    T.key = (e) => { if (e.key === "Escape") end(true); };
    document.addEventListener("keydown", T.key);
    T.rs = () => layout(T.el, false) || (T.home && T.robot.place(T.home.x, T.home.y));
    addEventListener("resize", T.rs);
    go(0);
  }

  async function end(skipped) {
    if (!T || T.ending) return;
    const t = T; t.ending = true; t.tok++;
    if (t.sp) t.sp.stop();
    document.removeEventListener("keydown", t.key); removeEventListener("resize", t.rs);
    t.ui.b.remove(); t.ui.skip.remove();
    t.robot.unhighlight();
    if ($("#drawer").classList.contains("on")) Q.chats.close();
    const hp = helpPos();
    await t.robot.bye(hp.x, hp.y);
    t.ui.block.remove();
    exitDemo();
    T = null;
    markDone();
    showHelp(true);
  }

  /* ---------- «?» батырмасы ---------- */
  function helpPos() { return { x: innerWidth - 16 - 24, y: innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-h")) || 150) - 14 - 24 }; }
  function showHelp(anim) {
    if (help || T) return;
    help = document.createElement("button");
    help.className = "qwq-help"; help.type = "button"; help.textContent = "?";
    help.setAttribute("aria-label", "Нұсқаулықты қайта бастау"); help.title = "Нұсқаулық";
    help.onclick = start;
    document.body.appendChild(help);
    if (anim && !matchMedia("(prefers-reduced-motion: reduce)").matches) help.animate([{ transform: "scale(0)" }, { transform: "scale(1.15)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }

  /* ---------- белгі: localStorage + Firestore (Google арқылы кірсе) ---------- */
  async function remoteRef() {
    const u = Q.cloud && Q.cloud.user; if (!u) return null;
    const f = await Q.cloud.getFb();
    return { f, ref: f.F.doc(f.db, "users", u.uid, "builderMeta", "prefs") };
  }
  async function markDone() {
    ls.set(K_DONE, "1");
    try { const r = await remoteRef(); if (r) await r.f.F.setDoc(r.ref, { tourDone: true, at: Date.now() }, { merge: true }); } catch (e) { /* ереже қойылмаса — тек осы браузерде */ }
  }
  async function remoteDone() {
    try { const r = await remoteRef(); if (!r) return false; const d = await r.f.F.getDoc(r.ref); return d.exists() && d.data().tourDone === true; } catch (e) { return false; }
  }

  async function auto() {
    if (ls.get(K_DONE) === "1") { showHelp(false); return; }
    // бұрыннан чаттары бар қолданушы — жаңа емес
    if (S.list().length) { ls.set(K_DONE, "1"); showHelp(false); return; }
    // бұрын Google арқылы кірген болса, сессия қалпына келгенше күтіп, бұлттағы белгіні тексереміз
    if (ls.get("qwq.cloud") === "1") {
      for (let i = 0; i < 20 && !(Q.cloud && Q.cloud.user); i++) await sleep(200);
      if (await remoteDone()) { ls.set(K_DONE, "1"); showHelp(false); return; }
    }
    if (Q.demo && Q.demo.active) { showHelp(false); return; }
    start();
  }

  function init() {
    const b = $("#set-tour");
    if (b) b.onclick = () => { $("#settings").classList.remove("on"); start(); };
    // Google арқылы кіргенде: бұлтта белгі болса, локалға да жазамыз
    let seen = null;   // әр кірген қолданушы үшін бір рет қана
    if (Q.cloud && Q.cloud.onState) Q.cloud.onState(async () => {
      const u = Q.cloud.user; if (!u || seen === u.uid) return; seen = u.uid;
      if (ls.get(K_DONE) === "1") markDone(); else if (!T && (await remoteDone())) { ls.set(K_DONE, "1"); showHelp(false); }
    });
    setTimeout(auto, 900);
  }

  // goto/skipSpeech — сынау мен консоль үшін
  Q.tour = { init, start, end, goto: (i) => go(i), skipSpeech: () => T && T.sp && T.sp.stop(), get active() { return !!T; }, get step() { return T ? T.i : -1; } };
})(window.QWQ);
