/* QWQ Builder · кодты нөлден жаздыру (шаблонсыз), үлкен жобаны кезекпен жазу, жақсарту, қалпына келтіру */
(function (Q) {
  const S = Q.store;
  // Worker: agent:true + codeModels тізімінен модель → Gemini, жылдам әрі ұзын шығыс (8–16K токен)
  const CODE_MODEL = "gemini-3.5-flash-lite";
  const PLAN_MODEL = "gemini-3.1-flash-lite";
  // Жылдам режимде: модель тізбегі (сәтсіздікте бірден келесісі) және ойлау деңгейі; ескі режимде — бір модель
  // Код жазу/түзету — "medium" (сапа жылдамдықтан маңызды); ойлау ұзақ болғандықтан бірінші токенге көбірек уақыт
  const route = (lvl, first) => Q.api.fast()
    ? { agent: true, models: [...new Set([first || CODE_MODEL, "gemini-3.1-flash-lite", "gemini-3.5-flash", CODE_MODEL])], thinkingLevel: lvl || "medium", ...((lvl || "medium") === "medium" ? { firstMs: 50000, totalMs: 110000 } : {}) }
    : { agent: true, model: first || CODE_MODEL };
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const syntaxOk = (js) => { try { new AsyncFn(js); return true; } catch (e) { return false; } };

  const MIN_TOTAL = 6000;     // body + css + js осыдан қысқа болса — "шағын демо" деп санап, кеңейтіп қайта жаздырамыз
  const MIN_GAME = 3500;
  const GAME = /ойын|ойна|game|шутер|платформер|жарыс|жылан|тетрис|pong|flappy|арканоид|лабиринт|аркад|викторина|квиз/i;
  const isGame = (idea) => GAME.test(`${idea.title} ${idea.summary}`) || GAME.test(idea.prompt || "");

  // ТІЛ: қосымшадағы көрінетін мәтін тек қазақша (тексеріс ағылшын сөзін тапса, түзетуге қайта жіберіледі)
  const LANG = `ТІЛ (ӨТЕ МАҢЫЗДЫ): беттегі БАРЛЫҚ көрінетін мәтін тек қазақша: тақырыптар, батырмалар, нұсқаулар, хабарлар, placeholder, aria-label, title, alert/toast, ұпай/деңгей/уақыт жазулары, бос күй мәтіндері. Бірде-бір ағылшын сөзі болмасын. Мысалы: Start → Бастау, Play → Ойнау, Score → Ұпай, Level → Деңгей, Next → Келесі, Back → Артқа, Restart → Қайта бастау, Game Over → Ойын бітті, Correct → Дұрыс, Wrong → Қате, Time → Уақыт, Settings → Баптаулар, Save → Сақтау, Delete → Өшіру, Add → Қосу, Reset → Тазалау, Pause → Үзіліс. Айнымалы, функция, сынып атаулары ағылшынша бола береді — тек пайдаланушы көретін мәтін қазақша.`;

  const REQS = `ТАЛАПТАР:
- Пайдаланушы ДӘЛ не сұраса, соны жаса: сұралған әр функция болсын, сұралмаған бөгде экран не мазмұн қоспа.
- ${LANG}
- Батырмалар анық: әр батырмада көрінетін қазақша жазу бар (тек белгіше емес), биіктігі кемінде 48px, мәтіні ірі, фонмен контрасты жоғары, не істейтіні бірден түсінікті. Басты батырма (мысалы «Бастау») ең көзге түсетін болсын. Басты экранда 1–2 сөйлемдік нұсқау болсын.
- Бет БҮКІЛ экранды толтырсын: html, body және негізгі орама min-height:100vh (немесе 100dvh), фон бүкіл бетке жайылсын, төменде не жанында бос ақ аймақ қалмасын; мазмұн ортада, телефонда (390px) да, кең экранда да әдемі.
- Әр батырмаға addEventListener арқылы нақты әрекет тағылсын. Бос немесе әрекетсіз батырма болмасын: басқанда көрінетін өзгеріс болсын.
- Деректерді localStorage-та сақта (try/catch ішінде). Бос күйлер мен енгізуді тексеру (бос өріс, қате енгізу) болсын.
- Жаңа элементтерді JS-пен салғанда мәтінді textContent арқылы немесе экрандап (escape) қос. Сыртқы сілтеме, кітапхана, қаріп, сурет ЖОҚ: тек HTML, CSS, JS, inline SVG, canvas.
- Бет ЕШҚАШАН бос қалмасын: бастапқыда көрінетін мазмұн болсын, бастапқы күйді JS соңында іске қос.`;

  const GAME_REQS = `ОЙЫН ТАЛАПТАРЫ: ойын ережесі басты экранда қазақша түсіндірілсін; ірі «Бастау» батырмасы; ұпай мен (керек болса) уақыт, өмір, деңгей экранда анық көрінсін; дұрыс/қате жауапқа анық кері байланыс (түс, анимация, қазақша хабар); ойын соңында нәтиже экраны және «Қайта бастау»; рекорд localStorage-та; пернетақтамен де, телефонда сенсорлы басумен де ойналсын. Қозғалыс керек болса — canvas + requestAnimationFrame, әйтпесе үлкен анық DOM элементтері.`;

  const FORMAT_FULL = `ЖАУАП ФОРМАТЫ (дәл осылай, басқа ештеңе жазба, \`\`\` қоспа):
===HTML===
<body> ішіндегі толық белгілеу (<body>, <script>, <style> тегтерінсіз)
===CSS===
толық CSS (бүкіл дизайн сенікі: түстер, қаріп өлшемдері, макет, анимациялар)
===JS===
толық JavaScript (<script> тегінсіз)
===END===`;

  const FORMAT_A = `ЖАУАП ФОРМАТЫ (дәл осылай, \`\`\` қоспа). Бұл 1-қадам: JavaScript-ті ЖАЗБА, ол келесі қадамда жазылады, бірақ барлық id мен сыныптарды JS қолданатындай етіп дұрыс бер.
===HTML===
<body> ішіндегі толық белгілеу (<body>, <script>, <style> тегтерінсіз)
===CSS===
толық CSS
===END===`;

  function prompt(o, mode) {
    const game = (o.meta || {}).type === "game";
    return `Сен тәжірибелі frontend әзірлеушісің және дизайнерсің. Пайдаланушы сұраған веб-қосымшаны НӨЛДЕН жаз: дайын шаблон жоқ, белгілеу, бүкіл дизайн (CSS) және логика (JS) толығымен сенікі. Тек тапсырмаға сүйен.

ЖОБА:
${o.brief}

ЖОСПАР:
${(o.plan || "").slice(0, 3500)}
${o.info ? `\nҚОСЫМША МӘЛІМЕТ:\n${o.info.slice(0, 2500)}\n` : ""}
Дизайн: тапсырмада стиль айтылса, дәл соны ұста; айтылмаса — тақырыпқа сай бір тұтас, ұқыпты, заманауи дизайн таңда. Қосымша толыққанды болсын, шағын демо емес.

${REQS}
${game ? "\n" + GAME_REQS + "\n" : ""}
${mode === "A" ? FORMAT_A : FORMAT_FULL}`;
  }

  const contPrompt = (tail, fmt) => `Төмендегі жауап ұзындыққа байланысты үзіліп қалды. Дәл үзілген жерден жалғастыр: ТЕК қалған кодты жаз, қайталама, \`\`\` қоспа. Формат сақталсын (${fmt}), ең соңында ===END=== жаз. Егер жауап толық аяқталған болса, тек ===END=== жаз.\n\nСоңғы бөлік:\n${tail}`;

  function overlap(a, b) {
    const t = a.slice(-400);
    for (let n = Math.min(t.length, b.length, 400); n >= 20; n--) if (b.startsWith(t.slice(-n))) return b.slice(n);
    return b;
  }
  const unfence = (t) => t.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "");

  /** JS-тің жеке жауабын (===JS=== ... ===END===) оқу */
  function parseJs(text) {
    let t = text.replace(/^\s*```[a-zA-Z]*\s*\n/, "");
    const i = t.indexOf("===JS===");
    if (i >= 0) t = t.slice(i + 8);
    const e = t.indexOf("===END===");
    const end = e >= 0;
    if (end) t = t.slice(0, e);
    return { js: t.replace(/\n?```\s*$/, "").trim(), end };
  }

  /**
   * write({idea, brief, plan, info, meta, split, sig, onLive(full), onPreview(html), onStage(text), onPart(name, parts)})
   * → { html, body, css, js }
   */
  async function write(o) {
    const meta = o.meta || {}, game = meta.type === "game";
    const call = (message, extra) => Q.api.chat({ signal: o.sig, web: false, stream: true, ...route(), message, ...extra });
    const build = (body, css, js) => Q.template.build(o.idea.title, body, css, js);
    const preview = (text) => {
      const p = Q.template.parse(text);
      return build(p.body, p.css, p.stage >= 4 ? p.js : "");
    };
    const live = (full) => { o.onLive(full); o.onPreview && o.onPreview(full, preview); };

    /** бір үлкен жауапты, үзілсе жалғастырып, жинау */
    async function collect(message, isDone, fmt, onDelta) {
      const r = await call(message, { onDelta: (_, full) => onDelta(full) });
      let raw = r.answer, tries = 0;
      while (!isDone(raw) && tries < 3) {
        tries++;
        o.onStage && o.onStage(`жалғастыру ${tries}/3`);
        const c = await call(contPrompt(raw.slice(-1500), fmt), { stream: tries === 1, onDelta: (_, full) => onDelta(raw + "\n" + full) });
        raw += "\n" + overlap(raw, unfence(c.answer));
      }
      return raw;
    }

    let p;
    if (o.split && !game) {
      // 1-қадам: HTML + CSS; 2-қадам: JS (HTML-ге сүйеніп) — файлдар кезекпен пайда болады
      const rawA = await collect(prompt(o, "A"), (t) => Q.template.parse(t).end, "===CSS===", live);
      const pa = Q.template.parse(rawA);
      if (!pa.body) throw new Q.api.QErr("QWQ код пішімін бұзды. Қайта байқап көр.", "format");
      o.onPart && o.onPart("html", { body: pa.body, css: pa.css, html: build(pa.body, pa.css, "") });
      o.onStage && o.onStage("JavaScript жазылып жатыр");
      const msgB = `Сен тәжірибелі frontend әзірлеушісің. Төменде қосымшаның дайын HTML белгілеуі мен CSS-і берілген Соларға сай ТОЛЫҚ JavaScript жаз (дайын көмекші функциялар жоқ, бәрін өзің жаз).

${REQS}

ЖАУАП ФОРМАТЫ (\`\`\` қоспа): ===JS=== деген жолдан бастап, толық JavaScript (<script> тегінсіз), соңында ===END===.

ЖОСПАР:
${o.plan.slice(0, 2500)}

HTML:
${pa.body.slice(0, 14000)}

CSS:
${pa.css.slice(0, 3000)}`;
      const rawB = await collect(msgB, (t) => parseJs(t).end, "===JS===", (full) => { o.onLive(full); });
      p = { body: pa.body, css: pa.css, js: parseJs(rawB).js };
    } else {
      const raw = await collect(prompt(o), (t) => Q.template.parse(t).end, "===CSS===, ===JS===", live);
      p = Q.template.parse(raw);
      const min = (game ? MIN_GAME : MIN_TOTAL) * (Q.api.fast() ? 0.7 : 1);   // жылдам режимде екінші толық жазуды тек шын шағын демо үшін жасаймыз
      if ((game ? p.js.length : p.body.length + p.css.length + p.js.length) < min && !(Q.demo && Q.demo.active)) {
        o.onStage && o.onStage("кеңейту");
        const again = await call(prompt(o) + `\n\nЕСКЕРТУ: алдыңғы жауап тым қысқа болды. Бұл шағын демо емес, толыққанды өнім: көп мазмұн, толық логика жаз.`, { onDelta: (_, full) => live(full) });
        const p2 = Q.template.parse(again.answer);
        if (p2.js.length + p2.body.length + p2.css.length > p.js.length + p.body.length + p.css.length && p2.end) p = p2;
      }
    }
    if (!p.body) throw new Q.api.QErr("QWQ код пішімін бұзды. Қайта байқап көр.", "format");
    return { body: p.body, css: p.css, js: p.js, html: build(p.body, p.css, p.js) };
  }

  /** Ақаулар көрініс деңгейінде (бос бет, canvas, ойын циклі) болса, жалғыз JS патч емес, толық қайта жазу керек */
  const isRenderIssue = (x) => /^(Бет бос|Барлық экрандар|Canvas бос|Ойын )/.test(x);

  /** repair: көрініс ақауларын (бос бет, жасырын экрандар, жүрмейтін ойын) түзету үшін кодты толық қайта жаздыру */
  async function repair(o) {
    const meta = o.meta || {}, game = meta.type === "game";
    const list = o.errors.map((x) => "- " + x).join("\n");
    const base = prompt({ brief: o.brief, plan: o.plan || "", info: "", meta });
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: true, ...route(),
      message: `${base}\n\nБІРІНШІ НҰСҚА ІСКЕ ҚОСЫЛҒАНДА МЫНА АҚАУЛАР ТАБЫЛДЫ:\n${list}\n\nОсы ақауларды толық түзетіп, ЖАҢА толық жауап қайтар (сол ЖАУАП ФОРМАТЫМЕН). Бет көрінетін мазмұнмен ашылуы тиіс${game ? "; ойын басталып, кадрлар сызылуы және басқару жұмыс істеуі тиіс" : "; бастапқы экран бірден көрінсін"}.\n\nАқаулы код (JS):\n\`\`\`js\n${(o.js || "").slice(0, 9000)}\n\`\`\``,
    });
    let raw = r.answer, tries = 0;
    while (!Q.template.parse(raw).end && tries < 2) {
      tries++;
      const c = await Q.api.chat({ signal: o.sig, web: false, stream: false, ...route(), message: contPrompt(raw.slice(-1500), "===CSS===, ===JS===") });
      raw += "\n" + overlap(raw, unfence(c.answer));
    }
    const p = Q.template.parse(raw);
    if (!p.body || !p.js || !syntaxOk(p.js)) return null;
    return { body: p.body, css: p.css, js: p.js, html: Q.template.build(o.title, p.body, p.css, p.js) };
  }

  /** Патч тізімін (JSON) бөліктерге қолдану: {file:"js|css|html", find, replace} | {append} (JS) | {appendCss} */
  function applyPatches(parts, patches) {
    let { body, css, js } = parts, applied = 0;
    const changes = [];
    for (const p of patches || []) {
      if (!p) continue;
      if (typeof p.append === "string" && p.append.trim().length > 5) { js += "\n" + p.append; applied++; changes.push({ file: "app.js", add: p.append, note: p.why }); continue; }
      if (typeof p.appendCss === "string" && p.appendCss.trim().length > 3) { css += "\n" + p.appendCss; applied++; changes.push({ file: "style.css", add: p.appendCss, note: p.why }); continue; }
      if (typeof p.find !== "string" || typeof p.replace !== "string" || p.find.length < 3) continue;
      const f = p.file === "html" ? "body" : p.file === "css" ? "css" : "js";
      const cur = f === "body" ? body : f === "css" ? css : js;
      if (!cur.includes(p.find)) continue;
      const next = cur.replace(p.find, () => p.replace);
      if (f === "body") body = next; else if (f === "css") css = next; else js = next;
      applied++;
      changes.push({ file: f === "body" ? "index.html" : f === "css" ? "style.css" : "app.js", del: p.find, add: p.replace, note: p.why });
    }
    return { body, css, js, applied, changes };
  }
  const arrOf = (a) => { const i = a.indexOf("["), j = a.lastIndexOf("]"); try { return i >= 0 && j > i ? JSON.parse(a.slice(i, j + 1)) : []; } catch (e) { return []; } };

  const PATCH_FMT = `Жауапта ТЕК JSON массив бер (түсініктеме, \`\`\` жоқ). Патч түрлері:
1) {"file":"js"|"css"|"html","find":"сол файлда ӘРІПКЕ ДЕЙІН дәл кездесетін 1-3 жол (бірегей)","replace":"жаңа мәтін","why":"не үшін (қысқа, қазақша)"}
2) JS соңына қосу, IIFE ішінде: {"append":"(function(){ ... })();","why":".."}
3) CSS соңына қосу: {"appendCss":"...","why":".."}`;

  /** improve: сапа тізімімен код тексеріп, ҚЫСҚА патчтар алу (бүкіл кодты қайта жазбай) */
  async function improve(o) {
    const meta = o.meta || {}, game = meta.type === "game";
    const checklist = game
      ? `- Телефонда басқару (сенсор батырмалары controls ішінде), тік және көлденең экранға бейімділік\n- Қиындық деңгейге қарай өседі, соқтығысу/өмір, ұпай, рекорд, дыбыс (sfx)\n- Көзге ұрмайтын, анық сызылған графика, бөлшектер/анимация, оқылатын мәтін\n- Ереже қазақша түсіндірілген, батырмалар ірі әрі анық, бет бүкіл экранды толтырады\n- Барлық көрінетін мәтін тек қазақша (ағылшын сөзі болса — аудар)\n- Қателерсіз JS`
      : `- Мобильге бейімділік (390px): көлденең скролл жоқ, басу аймағы ≥44px, мәтін оқылады\n- Бос күйлер (.empty), енгізуді тексеру және түсінікті қате хабарлары (toast)\n- Анимациялар мен ауысулар (transition), басқанда кері байланыс\n- Қол жетімділік: белгішелік батырмаларға aria-label, жеткілікті контраст, label-дар\n- Бет бүкіл экранды толтырады, бос ақ аймақ жоқ; батырмалар ірі, анық жазуы бар\n- Барлық көрінетін мәтін тек қазақша (ағылшын сөзі болса — аудар)\n- Қателерсіз JS (null тексерулері, localStorage қатесі)`;
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: false, tries: 2, ...route(),
      message: `Сен қатаң код сапасын тексерушісің. Төмендегі веб-қосымшаны мына сапа тізімімен тексеріп, ең маңызды 3–6 жақсартуды ҚЫСҚА патчтар түрінде бер. Бүкіл кодты қайта жазба, жұмыс істеп тұрғанды бұзба.\n\nСАПА ТІЗІМІ:\n${checklist}\n\n${PATCH_FMT}\nЕгер жақсартуға тұрарлық ештеңе жоқ болса, [] қайтар.\n\nHTML:\n\`\`\`html\n${o.body.slice(0, 9000)}\n\`\`\`\nCSS:\n\`\`\`css\n${(o.css || "").slice(0, 3000)}\n\`\`\`\nJS:\n\`\`\`js\n${o.js.slice(0, 16000)}\n\`\`\``,
    });
    const res = applyPatches(o, arrOf(r.answer));
    if (!res.applied || !syntaxOk(res.js)) return null;
    return Object.assign(res, { html: Q.template.build(o.title, res.body, res.css, res.js) });
  }

  /** edit: пайдаланушы өтінішін ТЕК керекті жерді өзгертетін патчтармен орындау (+ өзгеріс тізімі) */
  async function edit(o) {
    const meta = o.meta || {};
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: false, tries: 3, ...route(),
      message: `Төменде жұмыс істеп тұрған веб-қосымшаның бөліктері берілген. Пайдаланушы өтініші: «${o.request}».\nӨтінішті орындау үшін ТЕК керекті жерлерді өзгертетін патчтар жаса. Басқа бөлігін бұзба, бүкіл кодты қайта жазба. Түстерді не дизайнды өзгерту керек болса, appendCss арқылы жаңа CSS ережелерін қос. Барлық көрінетін мәтін тек қазақша қалсын.\n\n${PATCH_FMT}\n\nHTML:\n\`\`\`html\n${o.body.slice(0, 14000)}\n\`\`\`\nCSS:\n\`\`\`css\n${(o.css || "").slice(0, 4000)}\n\`\`\`\nJS:\n\`\`\`js\n${o.js.slice(0, 22000)}\n\`\`\``,
    });
    const res = applyPatches(o, arrOf(r.answer));
    if (!res.applied) return null;
    if (!syntaxOk(res.js)) return { error: "syntax" };
    return Object.assign(res, { html: Q.template.build(o.title, res.body, res.css, res.js) });
  }

  Q.codegen = { route, isGame, write, repair, improve, edit, applyPatches, isRenderIssue, syntaxOk, CODE_MODEL, PLAN_MODEL };
})(window.QWQ);
