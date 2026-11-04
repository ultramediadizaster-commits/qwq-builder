/* QWQ Builder · интерактивті нұсқаулық (QWQ роботы).
   Алғаш кірген адамнан бір рет қана сұрайды: «Жаңадан бастайсыз ба?» (localStorage белгісі; Google арқылы кірсе — Firestore users/{uid}/builderMeta/prefs).
   Нұсқаулық нақты API шақырмайды: уақытша демо чат көрсетіледі, ештеңе сақталмайды, соңында бәрі бұрынғы қалпына қайтады.
   Кейін қайта көру: Баптаулар → «Қалай жұмыс істейді?» (бірінші батырма). */
(function (Q) {
  const { $, esc } = Q;
  const S = Q.store;
  const STEPS = Q.onboardingSteps || [];
  const K_DONE = "qwq.tour.done", K_MUTE = "qwq.tour.muted";
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const sleep = (ms) => (window.QWQRobot ? QWQRobot.sleep(ms) : new Promise((r) => setTimeout(r, ms)));   // «тоқтату» кезінде бірге тоқтайды
  const mobile = () => innerWidth <= 600;
  const nn = (i) => String(i + 1).padStart(2, "0");

  let T = null;

  /* ---------- демо деректер (сабақ кестесі) ---------- */
  function demoChat() {
    const BODY = `<div class="app"><header class="top"><h1>Сабақ <span class="grad">кестесі</span></h1><p class="muted">7«А» сынып · бүгін сейсенбі</p></header>
<section class="screen on" id="today"><div class="chips"><button class="chip">Дс</button><button class="chip on">Сс</button><button class="chip">Ср</button><button class="chip">Бс</button><button class="chip">Жм</button></div>
<div class="list"><div class="item"><div class="grow"><b>Математика</b><span>08:30 · 204 каб.</span></div><span class="badge ok">қазір</span></div>
<div class="item"><div class="grow"><b>Қазақ тілі</b><span>09:25 · 112 каб.</span></div></div><div class="item"><div class="grow"><b>Информатика</b><span>10:20 · 301 каб.</span></div></div>
<div class="item"><div class="grow"><b>Дене шынықтыру</b><span>11:15 · спортзал</span></div></div></div><button class="btn primary block" style="margin-top:12px">Еске салу</button></section>
<section class="screen" id="week"><div class="card"><h2>Апта</h2><p class="muted">30 сабақ · 5 күн</p></div></section>
<nav class="tabbar"><button class="tab on" data-go="today">Бүгін</button><button class="tab" data-go="week">Апта</button></nav></div>`;
    const html = Q.template.build("Сабақ кестесі", BODY, Q.demo.css + "\n.chips{display:flex;gap:8px;margin-bottom:12px}.chip{min-height:38px;padding:0 15px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font:600 13px/1 inherit}.chip.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}", "");
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
        html,
      },
      versions: [{ html, note: "Автотүзетілген нұсқа", t }], verIdx: 0, share: null,
      agent: { total: "01:24.6", steps: [
        { k: "plan", s: "done", d: "", t: "8.1 с" }, { k: "code", s: "done", d: "212 жол · 14,8 КБ", t: "52.3 с" }, { k: "verify", s: "done", d: "Түзетілді ✓", t: "14.2 с" }, { k: "done", s: "done", d: "", t: "84.6 с" }] },
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

  /* ---------- дыбыс: алдын ала жүктеу (10 MP3 + VTT) ---------- */
  const PRE = { mp3: [], vtt: [] };   // беттің өмір бойы сақталады: қайта көргенде қайта жүктелмейді
  function preload() {
    STEPS.forEach((_, i) => {
      if (!PRE.mp3[i]) PRE.mp3[i] = fetch(`audio/onboarding/${nn(i)}.mp3`).then((r) => (r.ok ? r.blob() : null)).then((b) => (b ? URL.createObjectURL(b) : null)).catch(() => null);
      if (!PRE.vtt[i]) PRE.vtt[i] = fetch(`audio/onboarding/${nn(i)}.vtt`).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    });
  }

  /* ---------- тоқтату: дыбыс, AudioContext, субтитр сағаты, күтулер мен анимациялар бірге ---------- */
  function hold() {
    if (!T || T.paused) return;
    T.paused = true;
    if (T.sp) T.sp.pause();
    QWQRobot.hold(true);
    // көпіршіктің өз батырмаларынан басқа барлық анимация (ұшу, жарқыл, белгілеу, із)
    T.held = document.getAnimations().filter((a) => a.playState === "running" && !(a.effect && a.effect.target && T.ui.b.contains(a.effect.target)));
    T.held.forEach((a) => a.pause());
    document.documentElement.classList.add("qwq-paused");
    pauseLabel();
  }
  function unhold() {
    if (!T || !T.paused) return;
    T.paused = false;
    document.documentElement.classList.remove("qwq-paused");
    (T.held || []).forEach((a) => { try { a.play(); } catch (e) {} });
    T.held = null;
    QWQRobot.hold(false);
    if (T.sp) T.sp.resume();
    pauseLabel();
  }

  /* ---------- көпіршік және басқару ---------- */
  const ICON_PAUSE = `<svg class="ico ico--sm" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/></svg>`;
  const ICON_PLAY = `<svg class="ico ico--sm" viewBox="0 0 24 24"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.4-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z" fill="currentColor" stroke="none"/></svg>`;
  const ICON_SPK = `<svg class="ico ico--sm" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/></svg>`;
  function buildUI() {
    const block = document.createElement("div");
    block.className = "qwq-block";                         // нұсқаулық кезінде сайтты кездейсоқ басып, нақты сұрау жібермеу үшін
    const skip = document.createElement("button");
    skip.className = "qwq-skip btn btn--sm glass glass--dark"; skip.type = "button"; skip.textContent = "Өткізіп жіберу";
    skip.onclick = () => end(true);
    const b = document.createElement("div");
    b.className = "qwq-bubble glass"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "QWQ нұсқаулығы");
    b.innerHTML = `<div class="qb-step" id="qb-step"></div><div class="qb-text" id="qb-t" aria-live="polite"></div>
      <div class="qb-ctl">
        <button id="qb-pause" class="btn glass glass--flat qb-b" type="button"><span class="qb-ic qb-pp">${ICON_PAUSE}${ICON_PLAY}</span><span class="qb-l">Тоқтату</span></button>
        <button id="qb-mute" class="btn glass glass--flat qb-b" type="button" aria-pressed="false"><span class="qb-ic qb-snd">${ICON_SPK}<span class="qb-wave"><i></i><i></i><i></i></span><svg class="ico ico--sm qb-x" viewBox="0 0 24 24"><path d="M15 9.5l5 5M20 9.5l-5 5"/></svg></span><span class="qb-l"></span></button>
        <button id="qb-unmute" class="btn btn--primary glass qb-b" type="button" hidden>🔊 Дыбысты қосу</button>
        <button id="qb-prev" class="btn glass glass--flat qb-b" type="button">← Алдыңғысы</button>
        <button id="qb-again" class="btn glass glass--flat qb-b" type="button">↻ Қайта түсіндір</button>
        <button id="qb-next" class="btn btn--primary glass lens qb-b qb-main" type="button">Әрі қарай →</button>
      </div>`;
    document.body.append(block, skip, b);
    T.ui = { block, skip, b, t: b.querySelector("#qb-t"), step: b.querySelector("#qb-step"), pause: b.querySelector("#qb-pause"), mute: b.querySelector("#qb-mute"), unmute: b.querySelector("#qb-unmute"), prev: b.querySelector("#qb-prev"), again: b.querySelector("#qb-again"), next: b.querySelector("#qb-next") };
    const u = T.ui;
    // сөйлеу басталмай тұрып та (робот ұшып келе жатқанда) тоқтатуға болады
    u.pause.onclick = () => { QWQRobot.unlock(); if (T.paused) unhold(); else hold(); };
    u.mute.onclick = () => {
      QWQRobot.unlock();                                     // басқан сәтте: дыбысты қосса, бірден ойнай алады
      T.muted = !T.muted; ls.set(K_MUTE, T.muted ? "1" : "0"); muteLabel();
      u.unmute.hidden = true;
      if (T.sp) T.sp.setMuted(T.muted);
    };
    u.unmute.onclick = () => { QWQRobot.unlock(); T.muted = false; ls.set(K_MUTE, "0"); u.unmute.hidden = true; muteLabel(); if (T.sp) T.sp.setMuted(false); layout(T.el, false); };
    // жылдам басқанда: әр батырма алдымен тоқтатуды алып тастайды, go() ескі сөйлемді толық тоқтатады
    const nav = (f) => () => { QWQRobot.unlock(); unhold(); f(); };
    u.prev.onclick = nav(() => go(T.i - 1));
    u.again.onclick = nav(() => go(T.i));
    u.next.onclick = nav(() => (T.i >= STEPS.length - 1 ? end(false) : go(T.i + 1)));
    muteLabel();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) b.animate([{ opacity: 0, transform: "scale(.82) translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }
  const muteLabel = () => {
    const m = T.ui.mute;
    m.classList.toggle("is-muted", T.muted);
    m.querySelector(".qb-l").textContent = T.muted ? "Дыбыссыз" : "Дыбыс";
    m.setAttribute("aria-pressed", String(T.muted)); m.setAttribute("aria-label", T.muted ? "Дыбысты қосу" : "Дыбысты өшіру");
  };
  const pauseLabel = () => {
    const p = T.ui.pause;
    p.classList.toggle("is-paused", !!T.paused);
    p.querySelector(".qb-l").textContent = T.paused ? "Жалғастыру" : "Тоқтату";
    p.setAttribute("aria-label", T.paused ? "Жалғастыру" : "Тоқтату");
    T.ui.b.classList.toggle("is-paused", !!T.paused);
  };
  function controls(speaking) {
    const u = T.ui, last = T.i >= STEPS.length - 1;
    u.pause.hidden = !speaking; u.mute.hidden = false;
    u.prev.hidden = speaking || T.i === 0; u.again.hidden = speaking; u.next.hidden = speaking;
    if (!speaking) u.unmute.hidden = true;
    u.b.classList.toggle("is-speaking", speaking);
    pauseLabel();
    u.next.textContent = last ? "Бастау!" : "Әрі қарай →";
    if (!speaking) u.next.focus({ preventScroll: true });
    layout(T.el, false);   // батырмалар шыққанда көпіршік биіктейді — орнын қайта есептейміз
  }
  // жаңа сөйлем: жұмсақ fade (әріп-әріп емес)
  function setText(s) {
    const t = T.ui.t, id = (T.txt = (T.txt || 0) + 1);
    t.classList.add("out");
    setTimeout(() => { if (!T || T.txt !== id) return; t.textContent = s; t.classList.remove("out"); layout(T.el, false); }, 180);
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
  const visible = (e) => e && e.getBoundingClientRect().width > 0;
  const resolve = (sel) => {
    if (!sel) return null;
    for (const q of sel.split("|")) { const e = document.querySelector(q); if (visible(e)) return e; }
    return null;
  };
  function inView(el) { const r = el.getBoundingClientRect(); return r.top >= 60 && r.bottom <= innerHeight - 40; }

  /* ---------- бөлімдерді ашу/жабу (нұсқаулық сөзіне қарай) ---------- */
  function demoQr() {
    const url = "https://qwq-share.mirasnrmatov.workers.dev/s/demo";
    try {
      const qr = qrcode(0, "M"); qr.addData(url); qr.make();
      const n = qr.getModuleCount(), m = 4, size = n + m * 2; let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
      $("#qr-img").innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR код"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    } catch (e) {}
    $("#qr-url").textContent = url;
    $("#qr-load").hidden = true; $("#qr-body").hidden = false;
    $("#qr").classList.add("on");
  }
  async function open(what) {
    if (!what) return;
    if (what === "drawer" && !$("#drawer").classList.contains("on")) { Q.chats.open(); await sleep(420); }
    else if (what === "settings" && !$("#settings").classList.contains("on")) { $("#settings").classList.add("on"); await sleep(420); }   // openSettings емес: ол кілт өрісіне фокус береді (телефонда пернетақта ашылады)
    else if (what === "qr" && !$("#qr").classList.contains("on")) { demoQr(); await sleep(420); }
    else if (what === "prompt") { const tp = $("#tp"); if (tp && tp.getAttribute("aria-expanded") !== "true") { tp.click(); await sleep(200); } }
    else if (what.startsWith("more")) {
      const need = what.split(":")[1];
      if (need && visible($(need))) return;
      const mm = $("#more-menu"); if (mm && mm.hidden) { $("#t-more").click(); await sleep(250); }
    }
  }
  function closeAll() {
    if ($("#drawer").classList.contains("on")) Q.chats.close();
    ["#settings", "#qr"].forEach((s) => { const e = $(s); if (e) e.classList.remove("on"); });
    const mm = $("#more-menu"); if (mm && !mm.hidden) { mm.hidden = true; $("#t-more").setAttribute("aria-expanded", "false"); }
    const tp = $("#tp"); if (tp && tp.getAttribute("aria-expanded") === "true") tp.click();
  }

  /** Бір сәт: керек экран/бөлім → нысанаға ұшу → (жаңа болса) таңғалу → көрсету → эмоция */
  async function beat(b, step, tok) {
    const R = T.robot;
    if (b.close) closeAll();
    if (b.view && Q.view !== b.view) { closeAll(); Q.go(b.view); await sleep(320); }
    if (b.label) for (const [sel, txt] of Object.entries(b.label)) { const e = $(sel); if (e) { const icon = e.querySelector("svg"); e.innerHTML = (icon ? icon.outerHTML : "") + esc(txt); } }
    await open(b.open);
    if (tok !== T.tok) return;
    const el = resolve(b.t);
    T.log.push({ i: T.i, c: b.c, t: b.t, found: !b.t || !!el, at: Math.round(b.at * 10) / 10 });   // сынау журналы (Q.tour.log)
    if (el !== T.el || !el) {
      if (el && !inView(el)) { el.scrollIntoView({ block: "center", behavior: "auto" }); await sleep(120); }
      T.el = el;
      T.ui.block.classList.toggle("dim", !el);
      R.relax();
      R.highlight(el);
      // «Өткізіп жіберу» нысананы жаппасын: тиіп тұрса, сол жақ бұрышқа ауысады
      const sk = T.ui.skip; sk.classList.remove("alt");
      if (el && !el.classList.contains("qwq-skip")) { const a = sk.getBoundingClientRect(), r = el.getBoundingClientRect(); if (!(a.right < r.left || r.right < a.left || a.bottom < r.top || r.bottom < a.top)) sk.classList.add("alt"); }
      await layout(el);
      if (tok !== T.tok) return;
      if (b.wow) { await R.emotion("surprised"); await sleep(650); if (tok !== T.tok) return; }
      if (el) { await R.pointAt(el); await sleep(650); if (tok !== T.tok) return; R.relax(); }
    } else if (b.wow) { await R.emotion("surprised"); await sleep(600); }
    if (tok !== T.tok) return;
    // сөйлеп тұрғанда «қалыпты» күй — түсіндіріп тұрған қимыл (talk)
    R.emotion(b.e === "normal" || !b.e ? (T.sp ? "talk" : "normal") : b.e);
    if (b.act === "type") R.typeInto($("#input"), step.typeText, { signal: T.abort && T.abort.signal });
    if (b.act === "wave") R.wave(1);
  }

  /* ---------- қадам ---------- */
  const LEAD = 1.1;   // жаңа нысанаға сөйлемнен бұрын ұшып жетеді (секунд)
  async function go(i) {
    if (!T || i < 0 || i >= STEPS.length) return;
    const tok = ++T.tok, st = STEPS[i], R = T.robot;
    const beats = ((Q.onboardingBeats || [])[i] || [{ c: 0, t: null, e: st.emotion || "normal" }]).map((b) => Object.assign({ done: false }, b));
    T.i = i;
    if (T.sp) { T.sp.stop(); T.sp = null; }
    if (T.abort) T.abort.abort();                     // алдыңғы қадамның әріп-әріп жазуы (шерту дыбыстары) тоқтайды
    T.abort = new AbortController();
    R.unhighlight(); R.relax();
    closeAll();
    if (i === 1) { $("#input").value = ""; $("#input").dispatchEvent(new Event("input")); }
    T.ui.step.textContent = `${i + 1} / ${STEPS.length} · ${st.t}`;
    T.ui.t.textContent = "";
    T.ui.unmute.hidden = true;
    controls(true);
    // сөйлем уақыттары (VTT) — сәттерді дәл сөйлемге байлау үшін (алдын ала жүктелген)
    preload();
    let cues = null;
    try { cues = QWQRobot.parseVtt(await PRE.vtt[i]); } catch (e) {}
    if (!cues || !cues.length) cues = QWQRobot.splitText(st.text);
    const url = (await PRE.mp3[i]) || `audio/onboarding/${nn(i)}.mp3`;
    if (tok !== T.tok) return;
    beats.forEach((b) => {
      const c = cues[Math.min(b.c, cues.length - 1)];
      b.at = Math.max(0, c.start - (b.t !== undefined ? LEAD : 0));
    });
    // алғашқы сәт сөйлеу басталмай тұрып орындалады
    const first = beats.filter((b) => b.c === 0);
    first.forEach((b) => (b.done = true));
    for (const b of first) { await beat(b, st, tok); if (tok !== T.tok) return; }
    // қалғандары: уақыты келгенде кезекпен; бірнешеуі қатар келсе — бөлімдерін ашып, соңғысына ғана ұшады
    let chain = Promise.resolve();
    const due = (t) => {
      const ready = beats.filter((b) => !b.done && t >= b.at);
      if (!ready.length) return;
      ready.forEach((b) => (b.done = true));
      chain = chain.then(async () => {
        if (tok !== T.tok) return;
        for (const b of ready.slice(0, -1)) { if (b.view && Q.view !== b.view) { closeAll(); Q.go(b.view); } await open(b.open); }
        await beat(ready[ready.length - 1], st, tok);
      });
    };
    T.sp = R.speak({
      audio: url, cues, text: st.text, muted: T.muted, pose: false,
      rate: T.rate || 1,
      onBlocked: () => { if (tok !== T.tok) return; T.ui.unmute.hidden = false; layout(T.el, false); },
      onLevel: (lv) => { if (tok === T.tok) T.ui.mute.style.setProperty("--lv", lv.toFixed(2)); },
      onTick: (t) => { if (tok === T.tok) due(t); },
      onCue: (c) => { if (tok === T.tok) setText(c.text); },
      onEnd: () => {
        if (tok !== T.tok) return;
        T.sp = null; due(1e9);
        chain.then(() => { if (tok !== T.tok) return; controls(false); if (R.state === "talk") R.emotion("normal"); });
      },
    });
    if (T.paused) T.sp.pause();   // тоқтатылған кезде басталса — сол күйінде күтеді
    if (R.state === "idle") R.emotion("talk");
  }

  /* ---------- бастау / аяқтау ---------- */
  function start() {
    if (T || !STEPS.length || !window.QWQRobot) return;
    if (Q.chat.isBusy() || Q.code.isRunning()) { Q.toast("Жұмыс аяқталғанша күте тұр", "err", 3000); return; }
    QWQRobot.unlock();   // батырма басылған оқиғаның ішінде: AudioContext + ойнатқыш «ашылады» (autoplay шектеуі)
    preload();
    document.querySelectorAll(".scrim.on").forEach((x) => x.classList.remove("on"));
    T = { i: 0, tok: 0, log: [], muted: ls.get(K_MUTE) === "1", robot: QWQRobot.create(document.body), sp: null };
    enterDemo();
    buildUI();
    T.key = (e) => { if (e.key === "Escape") end(true); else if (e.key === " " && T.sp && e.target === document.body) { e.preventDefault(); T.ui.pause.click(); } };
    document.addEventListener("keydown", T.key);
    T.rs = () => layout(T.el, false) || (T.home && T.robot.place(T.home.x, T.home.y));
    addEventListener("resize", T.rs);
    go(0);
  }

  async function end(skipped) {
    if (!T || T.ending) return;
    unhold();
    const t = T; t.ending = true; t.tok++;
    if (t.sp) t.sp.stop();
    if (t.abort) t.abort.abort();
    document.removeEventListener("keydown", t.key); removeEventListener("resize", t.rs);
    t.ui.b.remove(); t.ui.skip.remove();
    t.robot.unhighlight();
    closeAll();
    // робот баптаулар батырмасына «кіріп» кетеді: нұсқаулық сонда қалады
    const sb = $("#btn-settings").getBoundingClientRect();
    await t.robot.bye(sb.left + sb.width / 2, sb.top + sb.height / 2);
    t.ui.block.remove();
    exitDemo();
    T = null;
    markDone();
  }

  /* ---------- алғаш кіргенде: «Жаңадан бастайсыз ба?» ---------- */
  function ask() {
    markDone();   // сұрақ тек бір рет шығады — жауап бермей жапса да
    const d = document.createElement("div");
    d.className = "scrim qwq-ask"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "qa-t");
    d.innerHTML = `<div class="sheet glass glass--dark">
      <img src="images/robot/wave.webp" alt="" width="120" height="120">
      <h2 id="qa-t">Сәлем! QWQ Құрастырды бұрын қолдандыңыз ба?</h2>
      <p>Жаңадан бастасаңыз, мен бәрін 10 қысқа қадаммен көрсетіп шығамын.</p>
      <button class="btn btn--primary glass" id="qa-new" type="button">Жаңадан бастаймын — көрсетіңіз</button>
      <button class="btn glass glass--flat" id="qa-know" type="button">Бұрыннан қолданамын</button></div>`;
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add("on"));
    const close = (tour) => {
      document.removeEventListener("keydown", key);
      d.classList.remove("on"); setTimeout(() => d.remove(), 320);
      if (tour) start();
      else Q.toast("Нұсқаулықты кейін «Баптаулар → Қалай жұмыс істейді?» арқылы көре аласыз.", "ok", 5000);
    };
    const key = (e) => { if (e.key === "Escape") close(false); };
    document.addEventListener("keydown", key);
    d.querySelector("#qa-new").onclick = () => close(true);
    d.querySelector("#qa-know").onclick = () => close(false);
    d.onclick = (e) => { if (e.target === d) close(false); };
    setTimeout(() => d.querySelector("#qa-new").focus(), 60);
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
    if (ls.get(K_DONE) === "1") return;
    // бұрыннан чаттары бар қолданушы — жаңа емес
    if (S.list().length) { ls.set(K_DONE, "1"); return; }
    // бұрын Google арқылы кірген болса, сессия қалпына келгенше күтіп, бұлттағы белгіні тексереміз
    if (ls.get("qwq.cloud") === "1") {
      for (let i = 0; i < 20 && !(Q.cloud && Q.cloud.user); i++) await sleep(200);
      if (await remoteDone()) { ls.set(K_DONE, "1"); return; }
    }
    if (Q.demo && Q.demo.active) return;
    ask();
  }

  function init() {
    const b = $("#set-tour");
    if (b) b.onclick = () => { $("#settings").classList.remove("on"); start(); };
    // Google арқылы кіргенде: бұлтта белгі болса, локалға да жазамыз
    let seen = null;   // әр кірген қолданушы үшін бір рет қана
    if (Q.cloud && Q.cloud.onState) Q.cloud.onState(async () => {
      const u = Q.cloud.user; if (!u || seen === u.uid) return; seen = u.uid;
      if (ls.get(K_DONE) === "1") markDone(); else if (!T && (await remoteDone())) ls.set(K_DONE, "1");
    });
    setTimeout(auto, 900);
  }

  // goto/skipSpeech — сынау мен консоль үшін
  Q.tour = { init, start, end, goto: (i) => go(i), setRate: (r) => { if (T) T.rate = r; }, skipSpeech: () => T && T.sp && T.sp.stop(), get active() { return !!T; }, get time() { return T && T.sp ? T.sp.time : -1; }, get log() { return T ? T.log : []; }, get step() { return T ? T.i : -1; } };
})(window.QWQ);
