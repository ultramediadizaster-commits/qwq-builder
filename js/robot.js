/* QWQ · нұсқаулық роботы: суреттер (images/robot/*.webp) + CSS + Web Animations API (сыртқы кітапханасыз).
   Күйлер суреттерді жұмсақ ауыстыру арқылы (crossfade + шағын scale): idle, happy, thinking, surprised, point, wave, talk, fly, type.
   window.QWQRobot.create(parent, {base}) → robot: {el, emotion(e), appear(x,y), moveTo(x,y), place(x,y), pointAt(el), relax(),
     highlight(el), unhighlight(), speak({audio, vtt, text, muted, onCue, onEnd}), stopSpeak(), typeInto(input, text), wave(), bye(x,y), destroy()}
   Эмоциялар: normal | happy | thinking | surprised. */
(function () {
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPRING = "cubic-bezier(.34,1.56,.64,1)";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const STATES = ["idle", "happy", "thinking", "surprised", "point", "wave", "talk", "fly", "type"];
  const EMO = { normal: "idle", happy: "happy", thinking: "thinking", surprised: "surprised" };

  /* ---------- дыбыс: пернетақта шерту (WebAudio, файлсыз) ---------- */
  let AC = null;
  const ac = () => (AC = AC || new (window.AudioContext || window.webkitAudioContext)());
  function click() {
    try {
      const c = ac(), t = c.currentTime, n = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      const b = c.createBuffer(1, c.sampleRate * 0.03, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      n.buffer = b; f.type = "highpass"; f.frequency.value = 1800; g.gain.value = 0.18;
      n.connect(f).connect(g).connect(c.destination); n.start(t);
    } catch (e) {}
  }

  /** VTT/SRT мәтінін сөйлем-уақыт тізіміне айналдыру */
  function parseVtt(txt) {
    const ts = (s) => { const m = s.trim().replace(",", ".").split(":"); return m.length === 3 ? +m[0] * 3600 + +m[1] * 60 + +m[2] : +m[0] * 60 + +m[1]; };
    return String(txt).replace(/\r/g, "").split(/\n\n+/).map((b) => {
      const ls = b.split("\n").filter(Boolean), i = ls.findIndex((l) => l.includes("-->"));
      if (i < 0) return null;
      const [a, z] = ls[i].split("-->");
      let text = ls.slice(i + 1).join(" ").trim();
      // edge-tts сөйлем басындағы «-ді кейде жоғалтады: тырнақшаны теңестіреміз
      const o = (text.match(/«/g) || []).length, c = (text.match(/»/g) || []).length;
      if (c > o) text = "«" + text;
      return { start: ts(a), end: ts(z), text };
    }).filter((x) => x && x.text);
  }
  /** Дыбыссыз режим: мәтінді сөйлемдерге бөліп, оқу жылдамдығымен уақыт береміз */
  function splitText(text) {
    const parts = String(text).match(/[^.!?]+[.!?»]*\s*/g) || [text];
    let t = 0;
    return parts.map((p) => p.trim()).filter(Boolean).map((p) => { const d = Math.max(1.8, p.length * 0.062); const c = { start: t, end: t + d, text: p }; t += d; return c; });
  }

  function create(parent = document.body, opt = {}) {
    const dir = (opt.base || "images/robot/").replace(/\/?$/, "/");
    const src = (s) => dir + s + ".webp";
    STATES.forEach((s) => { const i = new Image(); i.src = src(s); });   // алдын ала жүктеу: ауысу кідірмейді

    const root = document.createElement("div");
    root.className = "qwq-robot";
    root.setAttribute("role", "img"); root.setAttribute("aria-label", "QWQ роботы");
    root.innerHTML = `<div class="qwq-floor"><i class="qwq-shadow"></i><i class="qwq-glow"></i><i class="qwq-ring"></i></div>
      <div class="qwq-float"><div class="qwq-stage"><img class="qwq-img on" alt="" draggable="false" src="${src("idle")}"><img class="qwq-img" alt="" draggable="false"></div></div>`;
    parent.appendChild(root);
    const stage = root.querySelector(".qwq-stage"), imgs = [...root.querySelectorAll(".qwq-img")];
    const glow = root.querySelector(".qwq-glow"), ring = root.querySelector(".qwq-ring");
    let pos = { x: innerWidth / 2, y: innerHeight / 2 }, spot = null, speaking = null;
    let base = "idle", action = null, shown = "idle", front = 0, swapId = 0;

    const size = () => root.getBoundingClientRect().width || 140;
    const place = (x, y) => { pos = { x, y }; root.style.transform = `translate(${x - size() / 2}px, ${y - size() * 0.55}px)`; };

    /** Суретті жұмсақ ауыстыру: жаңасы шағын scale-мен пайда болады, ескісі сөнеді */
    // ауысулар кезекпен орындалады (қатар сұралса — тек соңғысы көрсетіледі), сондықтан екі сурет бір мезгілде «on» болмайды
    let chain = Promise.resolve(), want = "idle";
    function show(name, o = {}) {
      want = name;
      const id = ++swapId;
      chain = chain.then(async () => {
        if (id !== swapId || (name === shown && !o.force)) return;
        const cur = imgs[front], next = imgs[1 - front];
        if (next.getAttribute("src") !== src(name)) next.src = src(name);
        try { await next.decode(); } catch (e) {}
        if (id !== swapId) return;
        shown = name; front = 1 - front;
        cur.getAnimations().forEach((a) => a.cancel()); next.getAnimations().forEach((a) => a.cancel());
        next.classList.add("on"); cur.classList.remove("on");
        if (!RM()) {
          const fromY = o.rise ? "translateY(26%) scale(.9)" : "scale(.96)";
          next.animate([{ opacity: 0, transform: fromY }, { opacity: 1, transform: "none" }], { duration: o.rise ? 520 : 280, easing: o.rise ? SPRING : "cubic-bezier(.22,1,.36,1)" });
          cur.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.03)" }], { duration: 240, easing: "ease-out" });
        }
      });
      return chain;
    }
    const refresh = () => show(action || base);

    function emotion(e) {
      base = EMO[e] || "idle";
      root.dataset.emo = e;
      return refresh();
    }

    async function wave(times = 2) {
      const prev = action; action = "wave"; await show("wave");
      if (!RM()) await stage.animate([{ transform: "rotate(0)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(3deg)" }, { transform: "rotate(-3deg)" }, { transform: "rotate(0)" }], { duration: 650 * times, easing: "ease-in-out" }).finished.catch(() => {});
      else await sleep(900);
      if (action === "wave") { action = prev; await refresh(); }
    }

    function pulseRing() { ring.animate([{ opacity: 0.9, transform: "translateX(-50%) scale(.35)" }, { opacity: 0, transform: "translateX(-50%) scale(1.9)" }], { duration: 900, easing: "ease-out" }); }

    async function appear(x, y) {
      root.style.opacity = "1";
      place(x, y);
      if (RM()) { await root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished; return; }
      await root.animate([{ transform: `translate(${x - size() / 2}px, ${y - size() * 0.55 - 220}px)`, opacity: 0 }, { transform: `translate(${x - size() / 2}px, ${y - size() * 0.55}px)`, opacity: 1 }], { duration: 750, easing: SPRING }).finished;
      pulseRing();
      await wave(2);
    }

    /** Иілген жолмен ұшу: fly суреті, бағытқа қарай қисаяды (солға — айнадай аударылады), артында жарық ізі */
    async function moveTo(x, y) {
      const from = { ...pos };
      if (RM()) {
        await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).finished;
        place(x, y);
        await root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "forwards" }).finished;
        return;
      }
      const s = size(), dx = x - from.x, dy = y - from.y, dist = Math.hypot(dx, dy);
      if (dist < 4) return;
      const prev = action; action = "fly";
      root.classList.toggle("flip", dx < 0);   // fly.png оңға ұшады, солға ұшқанда аударамыз
      await show("fly");
      const tilt = Math.max(-16, Math.min(16, dx / 14));
      const cx = (from.x + x) / 2 - dy * 0.25, cy = (from.y + y) / 2 - Math.min(120, dist * 0.3);
      const pt = (t) => ({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cx + t * t * x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cy + t * t * y });
      const kf = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, p = pt(t), r = i === 0 || i === 12 ? 0 : tilt * Math.sin(Math.PI * t);
        kf.push({ transform: `translate(${p.x - s / 2}px, ${p.y - s * 0.55}px) rotate(${r}deg)`, offset: t });
      }
      trail(pt, s);
      const dur = Math.min(1100, 420 + dist * 0.9);
      await root.animate(kf, { duration: dur, easing: "cubic-bezier(.45,0,.2,1)" }).finished.catch(() => {});
      place(x, y);
      // қонғанда серпімді тербеліс (spring)
      root.animate([{ transform: root.style.transform + ` rotate(${-tilt * 0.4}deg)` }, { transform: root.style.transform + ` rotate(${tilt * 0.2}deg)` }, { transform: root.style.transform }], { duration: 500, easing: SPRING });
      root.classList.remove("flip");
      if (action === "fly") { action = prev; await refresh(); }
    }
    function trail(pt, s) {
      for (let i = 1; i < 12; i++) {
        const p = pt(i / 12), d = document.createElement("i");
        d.className = "qwq-trail";
        d.style.left = p.x + "px"; d.style.top = p.y + s * 0.05 + "px";
        root.parentNode.appendChild(d);
        d.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 0.9, transform: "translate(-50%,-50%) scale(1)", offset: 0.25 }, { opacity: 0, transform: "translate(-50%,-50%) scale(.2)" }], { duration: 900, delay: i * 50, easing: "ease-out" }).finished.then(() => d.remove());
      }
    }

    /** Нысананы жарқыратып белгілеу, қалған экран күңгірттенеді */
    function highlight(el) {
      unhighlight();
      if (!el) return null;
      const r = el.getBoundingClientRect(), pad = 8;
      spot = document.createElement("div");
      spot.className = "qwq-spot";
      Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      document.body.appendChild(spot);
      spot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" });
      return r;
    }
    function unhighlight() { if (spot) { const s = spot; spot = null; s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).finished.then(() => s.remove()); } }

    /** Нысанаға қарай бұрылып, саусағымен көрсетеді (point.png оңға көрсетеді, солға керек болса — аударылады) */
    async function pointAt(el) {
      const r = el.getBoundingClientRect(), tx = r.left + r.width / 2;
      root.classList.toggle("flip", tx < pos.x);
      action = "point";
      await show("point");
      if (!RM()) stage.animate([{ transform: "translateX(0)" }, { transform: "translateX(5%)" }, { transform: "translateX(0)" }], { duration: 500, easing: SPRING });
      await sleep(300);
    }
    function relax() { root.classList.remove("flip"); if (action === "point") { action = null; refresh(); } }

    /** Сөйлеу: MP3 + VTT; talk суреті, робот астындағы жарқыл дыбысқа сай жыпылықтайды (Web Audio AnalyserNode).
        muted — дыбыссыз, субтитр өз жылдамдығымен. Қайтарады: {pause(), resume(), paused, muted, setMuted(m), stop(), done} */
    function speak(o) {
      stopSpeak();
      root.classList.add("speaking");
      const prevAction = action;
      if (!action || action === "talk") { action = o.pose === false ? null : "talk"; refresh(); }
      let cues = o.cues || null, idx = -1, raf = 0, paused = false, stopped = false, muted = !!o.muted, t0 = 0, acc = 0;
      const audio = o.audio ? new Audio(o.audio) : null;
      let analyser = null, data = null;
      if (audio) audio.preload = "auto";
      let resolveDone; const done = new Promise((r) => (resolveDone = r));
      const finish = () => {
        if (stopped) return; stopped = true; cancelAnimationFrame(raf);
        root.classList.remove("speaking"); glow.style.setProperty("--lv", 0);
        if (audio) audio.pause();
        if (action === "talk") { action = prevAction === "talk" ? null : prevAction; refresh(); }
        o.onEnd && o.onEnd(); resolveDone();
      };
      const now = () => (audio && !muted ? audio.currentTime : acc + (paused ? 0 : (performance.now() - t0) / 1000));
      const tick = () => {
        if (stopped) return;
        const t = now();
        if (cues) {
          const i = cues.findIndex((c) => t >= c.start && t < c.end + 0.05);
          const j = i < 0 ? cues.filter((c) => c.start <= t).length - 1 : i;
          if (j !== idx && j >= 0) { idx = j; o.onCue && o.onCue(cues[j], j, cues.length); }
          if (muted && t > cues[cues.length - 1].end + 0.3) return finish();
        }
        // жарқыл: дыбыс бар болса — нақты қаттылық, жоқ болса — жұмсақ «сөйлеу» толқыны
        let lv = 0;
        if (analyser && !muted && !paused) { analyser.getByteFrequencyData(data); let s = 0; for (let k = 1; k < 24; k++) s += data[k]; lv = Math.min(1, s / (23 * 170)); }
        else if (!paused) { const s = performance.now() / 120; lv = 0.35 + 0.3 * Math.sin(s) * Math.sin(s * 0.63); }
        glow.style.setProperty("--lv", lv.toFixed(3));
        raf = requestAnimationFrame(tick);
      };
      const begin = async () => {
        if (!cues && o.vtt) { try { cues = parseVtt(await (await fetch(o.vtt)).text()); } catch (e) { cues = null; } }
        if (!cues || !cues.length) cues = splitText(o.text || "");
        if (audio && !muted) {
          try {
            const c = ac(); if (c.state === "suspended") await c.resume();
            const s = c.createMediaElementSource(audio); analyser = c.createAnalyser(); analyser.fftSize = 64; data = new Uint8Array(analyser.frequencyBinCount);
            s.connect(analyser); analyser.connect(c.destination);
          } catch (e) { analyser = null; }
          audio.onended = finish;
          try { await audio.play(); } catch (e) { muted = true; }   // автоойнату бұғатталса — субтитр өз жылдамдығымен
        }
        t0 = performance.now();
        tick();
      };
      begin();
      speaking = {
        get paused() { return paused; },
        get muted() { return muted; },
        pause() { if (paused || stopped) return; paused = true; acc = now(); if (audio) audio.pause(); root.classList.remove("speaking"); glow.style.setProperty("--lv", 0); },
        resume() { if (!paused || stopped) return; paused = false; t0 = performance.now(); if (audio && !muted) audio.play().catch(() => {}); root.classList.add("speaking"); },
        setMuted(m) {
          if (m === muted || stopped) return;
          const t = now(); muted = m;
          if (audio) { if (m) audio.pause(); else { audio.currentTime = t; if (!paused) audio.play().catch(() => { muted = true; }); } }
          acc = t; t0 = performance.now();
        },
        stop: finish, done,
      };
      return speaking;
    }
    function stopSpeak() { if (speaking) { speaking.stop(); speaking = null; } }

    /** Жазу: тек жазу кезінде type суреті (төменнен серпіліп шығады), робот сәл тербеледі, мәтін әріп-әріп енгізіледі */
    async function typeInto(input, text, o = {}) {
      const prev = action; action = "type";
      await show("type", { rise: true });
      root.classList.add("typing");
      if (input) { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
      for (let i = 0; i < text.length; i++) {
        if (o.signal && o.signal.aborted) break;
        if (input) { input.value = text.slice(0, i + 1); input.dispatchEvent(new Event("input", { bubbles: true })); }
        if (!o.silent && text[i] !== " ") click();
        await sleep(RM() ? 20 : 55 + Math.random() * 45);
      }
      root.classList.remove("typing");
      // жазу кезінде сөйлеу біткен болса, talk-қа қайтпаймыз
      if (action === "type") { action = prev === "talk" && !root.classList.contains("speaking") ? null : prev; await refresh(); }
    }

    /** Қоштасу: қол бұлғап, кішірейіп, (x,y) нүктесіндегі «?» батырмасына айналады */
    async function bye(x, y) {
      stopSpeak(); unhighlight(); await emotion("happy");
      await wave(2);
      const s = size();
      if (RM()) { await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished; root.remove(); return; }
      await root.animate([{ transform: root.style.transform, opacity: 1 }, { transform: `translate(${x - s / 2}px, ${y - s * 0.55}px) scale(.18)`, opacity: 0.2 }], { duration: 650, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" }).finished;
      root.remove();
    }

    function destroy() { stopSpeak(); unhighlight(); root.remove(); }
    return { el: root, emotion, show, appear, moveTo, place, pointAt, relax, highlight, unhighlight, speak, stopSpeak, typeInto, wave, bye, destroy, parseVtt, get pos() { return pos; }, get state() { return shown; }, size };
  }

  window.QWQRobot = { create, parseVtt, splitText, STATES };
})();
