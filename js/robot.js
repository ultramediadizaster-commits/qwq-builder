/* QWQ · нұсқаулық роботы: SVG + CSS + Web Animations API (сыртқы кітапханасыз).
   window.QWQRobot.create(parent) → robot: {el, emotion(e), appear(x,y), moveTo(x,y), pointAt(el), highlight(el), unhighlight(),
     speak({audio, vtt, text, muted, onCue, onEnd}), typeInto(input, text), wave(), bye(x,y), placeAt(x,y), destroy()}
   Эмоциялар: normal | happy | thinking | surprised. Әр бөліктің жеке id-і бар: qwq-head, qwq-eyes, qwq-arm-l/r, qwq-antenna, qwq-laptop … */
(function () {
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPRING = "cubic-bezier(.34,1.56,.64,1)";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const SVG = `
<svg class="qwq-svg" viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QWQ роботы">
  <defs>
    <linearGradient id="qwq-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f7" stop-opacity=".96"/><stop offset="1" stop-color="#c9d3df" stop-opacity=".9"/></linearGradient>
    <linearGradient id="qwq-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#9fe9f5" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
    <linearGradient id="qwq-visor-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151b28"/><stop offset="1" stop-color="#0a0d14"/></linearGradient>
    <linearGradient id="qwq-lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe7f1" stop-opacity=".85"/><stop offset="1" stop-color="#9fb0c4" stop-opacity=".75"/></linearGradient>
    <radialGradient id="qwq-floor" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4fd6ea" stop-opacity=".75"/><stop offset=".6" stop-color="#4fd6ea" stop-opacity=".18"/><stop offset="1" stop-color="#4fd6ea" stop-opacity="0"/></radialGradient>
    <filter id="qwq-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="qwq-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <g id="qwq-floor-g">
    <ellipse id="qwq-shadow" cx="100" cy="220" rx="40" ry="6" fill="#000" opacity=".35" filter="url(#qwq-soft)"/>
    <ellipse id="qwq-glowpad" cx="100" cy="218" rx="46" ry="9" fill="url(#qwq-floor)"/>
    <ellipse id="qwq-ring" cx="100" cy="218" rx="30" ry="6" fill="none" stroke="#4fd6ea" stroke-width="2" opacity="0"/>
  </g>
  <g id="qwq-float">
    <g id="qwq-bodyg">
      <!-- дене -->
      <rect id="qwq-body" x="70" y="132" width="60" height="50" rx="24" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="1.6"/>
      <ellipse cx="86" cy="144" rx="10" ry="5" fill="#fff" opacity=".7"/>
      <!-- қолдар (иық нүктесінен айналады) -->
      <g id="qwq-arm-l" class="qwq-arm"><rect x="52" y="140" width="20" height="13" rx="6.5" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="1.2"/><circle id="qwq-hand-l" cx="50" cy="146.5" r="9" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="1.4"/></g>
      <g id="qwq-arm-r" class="qwq-arm"><rect x="128" y="140" width="20" height="13" rx="6.5" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="1.2"/><circle id="qwq-hand-r" cx="150" cy="146.5" r="9" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="1.4"/><circle id="qwq-finger" cx="159" cy="146.5" r="3.4" fill="#eef2f7" opacity="0"/></g>
      <!-- ноутбук -->
      <g id="qwq-laptop">
        <path id="qwq-lid-p" d="M76 150 h48 a4 4 0 0 1 4 4 v26 h-56 v-26 a4 4 0 0 1 4 -4z" fill="url(#qwq-lid)" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
        <text id="qwq-q" x="100" y="173" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="800" font-size="17" fill="#4fd6ea" filter="url(#qwq-glow)">Q</text>
        <path d="M66 180 h68 l-5 7 h-58z" fill="#d7e0ea" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
      </g>
    </g>
    <g id="qwq-head">
      <!-- антенна -->
      <g id="qwq-antenna"><rect x="98" y="16" width="4" height="20" rx="2" fill="#c9d3df"/><circle id="qwq-bulb" cx="100" cy="14" r="7" fill="#ffc83d" filter="url(#qwq-glow)"/></g>
      <!-- құлаққаптар -->
      <g id="qwq-ear-l"><circle cx="34" cy="82" r="17" fill="url(#qwq-glass)" stroke="#4fd6ea" stroke-width="4"/><circle cx="34" cy="82" r="7" fill="#4fd6ea" opacity=".55" filter="url(#qwq-glow)"/></g>
      <g id="qwq-ear-r"><circle cx="166" cy="82" r="17" fill="url(#qwq-glass)" stroke="#4fd6ea" stroke-width="4"/><circle cx="166" cy="82" r="7" fill="#4fd6ea" opacity=".55" filter="url(#qwq-glow)"/></g>
      <!-- бас (шыны) -->
      <rect id="qwq-skull" x="40" y="34" width="120" height="98" rx="46" fill="url(#qwq-glass)" stroke="url(#qwq-rim)" stroke-width="2"/>
      <ellipse cx="72" cy="50" rx="20" ry="8" fill="#fff" opacity=".85" transform="rotate(-18 72 50)"/>
      <!-- визор -->
      <rect id="qwq-visor" x="54" y="56" width="92" height="60" rx="28" fill="url(#qwq-visor-g)"/>
      <path d="M66 66 q18 -8 44 -6" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round" fill="none"/>
      <!-- көздер -->
      <g id="qwq-eyes">
        <g id="qwq-eyes-open">
          <ellipse id="qwq-eye-l" cx="82" cy="86" rx="9" ry="12" fill="#4fd6ea" filter="url(#qwq-glow)"/>
          <ellipse id="qwq-eye-r" cx="118" cy="86" rx="9" ry="12" fill="#4fd6ea" filter="url(#qwq-glow)"/>
        </g>
        <g id="qwq-eyes-happy" fill="none" stroke="#4fd6ea" stroke-width="5.5" stroke-linecap="round" filter="url(#qwq-glow)">
          <path d="M72 90 q10 -14 20 0"/><path d="M108 90 q10 -14 20 0"/>
        </g>
      </g>
      <!-- эквалайзер-ауыз -->
      <g id="qwq-mouth" fill="#4fd6ea" filter="url(#qwq-glow)">
        <rect x="86" y="104" width="4" height="4" rx="2"/><rect x="93" y="104" width="4" height="4" rx="2"/><rect x="100" y="104" width="4" height="4" rx="2"/><rect x="107" y="104" width="4" height="4" rx="2"/><rect x="114" y="104" width="4" height="4" rx="2"/>
      </g>
      <!-- таңғалу белгісі -->
      <g id="qwq-exclaim"><rect x="150" y="10" width="7" height="20" rx="3.5" fill="#ffc83d"/><circle cx="153.5" cy="37" r="4" fill="#ffc83d"/></g>
    </g>
  </g>
</svg>`;

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

  function create(parent = document.body) {
    const root = document.createElement("div");
    root.className = "qwq-robot emo-normal";
    root.innerHTML = SVG;
    parent.appendChild(root);
    const $ = (id) => root.querySelector("#" + id);
    const P = { float: $("qwq-float"), head: $("qwq-head"), body: $("qwq-bodyg"), armL: $("qwq-arm-l"), armR: $("qwq-arm-r"), finger: $("qwq-finger"), laptop: $("qwq-laptop"), ring: $("qwq-ring"), mouth: [...root.querySelectorAll("#qwq-mouth rect")], svg: root.querySelector("svg") };
    let pos = { x: innerWidth / 2, y: innerHeight / 2 }, spot = null, speaking = null;

    const size = () => root.getBoundingClientRect().width || 140;
    const place = (x, y) => { pos = { x, y }; root.style.transform = `translate(${x - size() / 2}px, ${y - size() * 0.6}px)`; };

    function emotion(e) {
      root.classList.remove("emo-normal", "emo-happy", "emo-thinking", "emo-surprised");
      root.classList.add("emo-" + e);
      if (e === "surprised") $("qwq-exclaim").animate([{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.25)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 1 }], { duration: 450, easing: SPRING });
    }

    async function wave(times = 2) {
      const k = []; for (let i = 0; i < times; i++) k.push({ transform: "rotate(0deg)" }, { transform: "rotate(-55deg)" }, { transform: "rotate(-25deg)" }, { transform: "rotate(-55deg)" });
      k.push({ transform: "rotate(0deg)" });
      await P.armR.animate(k, { duration: 520 * times, easing: "ease-in-out" }).finished.catch(() => {});
    }

    async function appear(x, y) {
      root.style.opacity = "1";
      if (RM()) { place(x, y); await root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished; return; }
      place(x, y);
      await root.animate([{ transform: `translate(${x - size() / 2}px, ${y - size() * 0.6 - 220}px)`, opacity: 0 }, { transform: `translate(${x - size() / 2}px, ${y - size() * 0.6}px)`, opacity: 1 }], { duration: 750, easing: SPRING }).finished;
      P.ring.animate([{ opacity: 0.9, transform: "scale(.4)" }, { opacity: 0, transform: "scale(2.2)" }], { duration: 900, easing: "ease-out" });
      await wave(2);
    }

    /** Иілген жолмен ұшу: бағытқа қарай қисаяды, артында жарық ізі қалады */
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
      const tilt = Math.max(-18, Math.min(18, dx / 14));
      const cx = (from.x + x) / 2 - dy * 0.25, cy = (from.y + y) / 2 - Math.min(120, dist * 0.3);
      const pt = (t) => ({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cx + t * t * x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cy + t * t * y });
      const kf = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, p = pt(t), r = i === 0 || i === 12 ? 0 : tilt * Math.sin(Math.PI * t);
        kf.push({ transform: `translate(${p.x - s / 2}px, ${p.y - s * 0.6}px) rotate(${r}deg)`, offset: t });
      }
      trail(pt, s);
      const dur = Math.min(1100, 420 + dist * 0.9);
      await root.animate(kf, { duration: dur, easing: "cubic-bezier(.45,0,.2,1)" }).finished.catch(() => {});
      place(x, y);
      // қонғанда серпімді тербеліс (spring)
      root.animate([{ transform: root.style.transform + " rotate(" + (-tilt * 0.4) + "deg)" }, { transform: root.style.transform + " rotate(" + (tilt * 0.2) + "deg)" }, { transform: root.style.transform }], { duration: 500, easing: SPRING });
    }
    function trail(pt, s) {
      for (let i = 1; i < 10; i++) {
        const p = pt(i / 10), d = document.createElement("i");
        d.className = "qwq-trail";
        d.style.left = p.x + "px"; d.style.top = p.y + s * 0.05 + "px";
        root.parentNode.appendChild(d);
        d.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 0.9, transform: "translate(-50%,-50%) scale(1)", offset: 0.25 }, { opacity: 0, transform: "translate(-50%,-50%) scale(.2)" }], { duration: 900, delay: i * 55, easing: "ease-out" }).finished.then(() => d.remove());
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

    /** Денесін нысанаға бұрып, қолын созып, саусағымен көрсетеді */
    async function pointAt(el) {
      const r = el.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height / 2;
      const flip = tx < pos.x;
      root.classList.toggle("flip", flip);
      // иықтан нысанаға бұрыш (SVG координатында қол оңға қарайды)
      const s = size(), sx = pos.x + (flip ? -1 : 1) * s * 0.26, sy = pos.y + s * 0.03;
      let ang = Math.atan2(ty - sy, Math.abs(tx - sx)) * 180 / Math.PI;
      ang = Math.max(-70, Math.min(70, ang));
      P.armR.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${ang}deg) scaleX(1.18)` }], { duration: 450, easing: SPRING, fill: "forwards" });
      P.finger.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200, fill: "forwards" });
      P.body.animate([{ transform: "rotate(0)" }, { transform: `rotate(${(flip ? -1 : 1) * 6}deg)` }], { duration: 450, easing: SPRING, fill: "forwards" });
      await sleep(450);
    }
    function relax() {
      P.armR.getAnimations().forEach((a) => a.cancel()); P.finger.getAnimations().forEach((a) => a.cancel()); P.body.getAnimations().forEach((a) => a.cancel());
      root.classList.remove("flip");
    }

    /** Сөйлеу: MP3 + VTT (Web Audio AnalyserNode → эквалайзер-ауыз). muted — дыбыссыз, субтитр өз жылдамдығымен.
        Қайтарады: {pause(), resume(), paused, setMuted(m), stop(), done: Promise} */
    function speak(o) {
      stopSpeak();
      root.classList.add("speaking");
      let cues = o.cues || null, idx = -1, raf = 0, paused = false, stopped = false, muted = !!o.muted, t0 = 0, acc = 0;
      const audio = o.audio ? new Audio(o.audio) : null;
      let analyser = null, data = null;
      if (audio) { audio.preload = "auto"; audio.crossOrigin = "anonymous"; }
      let resolveDone; const done = new Promise((r) => (resolveDone = r));
      const finish = () => { if (stopped) return; stopped = true; cancelAnimationFrame(raf); root.classList.remove("speaking"); P.mouth.forEach((m) => m.setAttribute("height", 4)); if (audio) audio.pause(); o.onEnd && o.onEnd(); resolveDone(); };
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
        // ауыз: дыбыс бар болса — нақты жиілік, жоқ болса — жұмсақ «сөйлеу» толқыны
        let lv = [0, 0, 0, 0, 0];
        if (analyser && !muted && !paused) { analyser.getByteFrequencyData(data); lv = [2, 5, 9, 14, 20].map((b) => data[b] / 255); }
        else if (!paused) { const s = performance.now() / 110; lv = [0, 1, 2, 3, 4].map((k) => 0.35 + 0.3 * Math.sin(s + k * 1.3) * Math.sin(s * 0.7 + k)); }
        P.mouth.forEach((m, k) => { const h = 4 + Math.max(0, lv[k]) * 16; m.setAttribute("height", h.toFixed(1)); m.setAttribute("y", (106 - h / 2).toFixed(1)); });
        raf = requestAnimationFrame(tick);
      };
      const begin = async () => {
        if (!cues && o.vtt) { try { cues = parseVtt(await (await fetch(o.vtt)).text()); } catch (e) { cues = null; } }
        if (!cues || !cues.length) cues = splitText(o.text || "");
        if (audio && !muted) {
          try {
            const c = ac(); if (c.state === "suspended") await c.resume();
            const src = c.createMediaElementSource(audio); analyser = c.createAnalyser(); analyser.fftSize = 64; data = new Uint8Array(analyser.frequencyBinCount);
            src.connect(analyser); analyser.connect(c.destination);
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
        pause() { if (paused || stopped) return; paused = true; acc += (performance.now() - t0) / 1000; if (audio) audio.pause(); root.classList.remove("speaking"); },
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

    /** Жазу: ноутбукті алдына алып, қолдар кезекпен басады, мәтін әріп-әріп енгізіледі (пернетақта дыбысымен) */
    async function typeInto(input, text, o = {}) {
      root.classList.add("typing");
      const tap = (arm, d) => arm.animate([{ transform: "rotate(0)" }, { transform: "rotate(22deg)" }, { transform: "rotate(0)" }], { duration: 160, delay: d });
      if (input) { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
      for (let i = 0; i < text.length; i++) {
        if (o.signal && o.signal.aborted) break;
        tap(i % 2 ? P.armL : P.armR, 0);
        if (input) { input.value = text.slice(0, i + 1); input.dispatchEvent(new Event("input", { bubbles: true })); }
        if (!o.silent && text[i] !== " ") click();
        await sleep(RM() ? 20 : 55 + Math.random() * 45);
      }
      root.classList.remove("typing");
    }

    /** Қоштасу: қол бұлғап, кішірейіп, (x,y) нүктесіндегі «?» батырмасына айналады */
    async function bye(x, y) {
      stopSpeak(); unhighlight(); emotion("happy");
      await wave(2);
      const s = size();
      if (RM()) { await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished; root.remove(); return; }
      await root.animate([{ transform: root.style.transform, opacity: 1 }, { transform: `translate(${x - s / 2}px, ${y - s * 0.6}px) scale(.18)`, opacity: 0.2 }], { duration: 650, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" }).finished;
      root.remove();
    }

    function destroy() { stopSpeak(); unhighlight(); root.remove(); }
    return { el: root, emotion, appear, moveTo, place, pointAt, relax, highlight, unhighlight, speak, stopSpeak, typeInto, wave, bye, destroy, parseVtt, get pos() { return pos; }, size };
  }

  window.QWQRobot = { create, parseVtt, splitText };
})();
