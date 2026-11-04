/* QWQ Builder · кодты жаздыру (түр + дизайн бағыты), үлкен жобаны кезекпен жазу, жақсарту, қалпына келтіру */
(function (Q) {
  const S = Q.store;
  // Worker: agent:true + codeModels тізімінен модель → Gemini, жылдам әрі ұзын шығыс (8–16K токен)
  const CODE_MODEL = "gemini-3.5-flash-lite";
  const PLAN_MODEL = "gemini-3.1-flash-lite";
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const syntaxOk = (js) => { try { new AsyncFn(js); return true; } catch (e) { return false; } };

  const QUALITY = "Қосымша толыққанды болсын: кемінде 3-4 функция, әдемі дизайн, анимациялар, барлық батырмалар жұмыс істесін. Шағын демо емес, нақты пайдалануға болатын өнім жаса.";
  const MIN_TOTAL = 6000;     // body + js осыдан қысқа болса — "шағын демо" деп санап, кеңейтіп қайта жаздырамыз
  const MIN_GAME = 3500;

  const TEMPLATE_HELP = `ШАБЛОН БЕРЕТІН СЫНЫПТАР (HTML-де қолдан):
- Құрылым: <header class="top"><h1>..</h1><p class="muted">..</p></header>; әр экран <section class="screen" id=".."> (id МІНДЕТТІ), біреуіне "on" қос; төменгі навигация <nav class="tabbar"><button class="tab on" data-go="экран-id">Атауы</button>..</nav> (data-go арқылы экран ауысуы автоматты жұмыс істейді). Лендинг/портфолио үшін экран ауыстыру қажет емес: ұзын беттегі <section> блоктарын қолдан, бірақ ең болмағанда бір .screen.on қамтитын орама болсын.
- .card, .card.glow, .row (.between), .grow, .grid2, .stat (ішінде <b>мән</b><span>атауы</span>), .list > .item (ішінде .grow > <b>+<span>), .badge (.ok .warn .bad), .progress > <i style="width:40%">, .empty, .muted, .grad (градиент мәтін), .chips > .chip (.on).
- Батырма: .btn, .btn.primary, .btn.ghost, .btn.danger, .btn.sm, .btn.icon, .btn.block. Форма: .field > <label> + .input / .select / .textarea. Ауыстырғыш: button.switch (.on).
- Модальды терезе: <div class="modal" id="m1"><div class="sheet">..<button class="btn" data-close>Жабу</button></div></div>; ашу: data-open="m1".
- JS көмекшілері ДАЙЫН (қайта жарияла-ма!): $ $$ store.get(кілт, әдепкі) store.set(кілт, мән) uid() esc(мәтін) toast(хабар) go(экранId) fmt.money(n) fmt.date(d) fmt.num(n) cloud.get(кілт, әдепкі) cloud.set(кілт, мән) cloud.list() (үшеуі де Promise қайтарады).
- Деректерді бірнеше адам бірге қолдануы керек болса (мысалы, сынып бір кестені бірге толтырады, ортақ тізім, дауыс беру), store емес, cloud көмекшісін пайдалан: await cloud.set("кілт", мән), await cloud.get("кілт", әдепкі), await cloud.list(). Кез келген адам өзі ғана көретін деректер үшін store қолдан. Cloud-қа бір кілтке жиынтығы 100 КБ-тан аспайтындай шағын JSON сақта.
- Өз CSS-ің тек қосымша үшін (қысқа, мысалы диаграмма, ерекше элементтер). Негізгі дизайн шаблоннан келеді. Түстерді тек var(--accent), var(--accent2), var(--text), var(--muted), var(--surface), var(--line), var(--bg), var(--r) арқылы бер.`;

  const REQS = `ТАЛАПТАР:
- Әр батырмаға міндетті түрде addEventListener арқылы нақты әрекет тағылсын (тек data-go / data-open / data-close атрибуттары бар батырмаларды үлгі өзі өңдейді). Бос немесе әрекетсіз батырма болмасын: әр батырма басылғанда көрінетін өзгеріс болсын (тізім жаңарады, экран ауысады, хабар шығады, деректер сақталады).
- Мәтіндердің бәрі қазақша. Деректерді store арқылы localStorage-та сақта. Бос күйлерді (.empty) және тексерулерді (бос өріс, қате енгізу) ұмытпа.
- Жаңа элементтерді JS арқылы салғанда HTML-ді esc() арқылы қауіпсіз құр. Диаграмма керек болса, inline SVG немесе CSS қолдан. Сыртқы сілтеме/кітапхана/сурет ЖОҚ.
- Бастапқы күйді JS соңында іске қос (тізімдерді салу, санауыштарды жаңарту). Бет ЕШҚАШАН бос қалмасын: бастапқыда көрінетін мазмұн болсын.`;

  const FORMAT_FULL = `ЖАУАП ФОРМАТЫ (дәл осылай, басқа ештеңе жазба, \`\`\` қоспа):
===HTML===
<header class="top"> бастап экрандар мен навигацияға дейінгі белгілеу (<body>, <script>, <style> тегтерінсіз)
===CSS===
қосымша қысқа CSS (қажет болмаса бос қалдыр)
===JS===
толық JavaScript (<script> тегінсіз)
===END===`;

  const FORMAT_A = `ЖАУАП ФОРМАТЫ (дәл осылай, \`\`\` қоспа). Бұл 1-қадам: JavaScript-ті ЖАЗБА, ол келесі қадамда жазылады, бірақ барлық id мен сыныптарды JS қолданатындай етіп дұрыс бер.
===HTML===
<header class="top"> бастап толық белгілеу (<body>, <script>, <style> тегтерінсіз)
===CSS===
қосымша CSS
===END===`;

  const designText = (meta) => {
    const st = Q.styles.byId(meta.style);
    if (!st) return "";
    const v = st.v;
    return `ДИЗАЙН БАҒЫТЫ (міндетті, басқа стильге ауытқыма): «${st.name}». ${st.d}
Палитра (шаблонға автоматты қолданылады): фон ${v.bg}, мәтін ${v.text}, акцент ${v.accent}, екінші акцент ${v.accent2}, сызық ${v.line}. Макет, мәтін үнін және анимацияны да осы бағытқа сай жаса.`;
  };

  function prompt(o, mode) {
    const meta = o.meta || {}, type = meta.type || "app";
    const head = `Сен тәжірибелі frontend әзірлеушісің. `;
    const tail = `ЖОБА:
${o.brief}

ЖОСПАР:
${o.plan.slice(0, 3500)}

ҚОСЫМША МӘЛІМЕТ:
${o.info.slice(0, 2500)}`;
    if (type === "game") {
      return `${head}Шаблондағы дайын ойын қозғалтқышы үшін толыққанды ОЙЫН жаз.\n\n${Q.styles.TYPE_GUIDE.game}\n\n${Q.gametpl.GUIDE}\n\n${designText(meta)}\n\n${FORMAT_FULL}\n\n${tail}`;
    }
    return `${head}Дайын базалық ҮЛГІГЕ (шаблонға) тек мазмұн мен логиканы толтырып, толыққанды веб-қосымша жаз. Шаблонда дизайн, CSS айнымалылары және JS көмекшілері бар, оларды қайта жазба.

${QUALITY}

${Q.styles.TYPE_GUIDE[type] || Q.styles.TYPE_GUIDE.app}

${designText(meta)}

${TEMPLATE_HELP}

${REQS}

${mode === "A" ? FORMAT_A : FORMAT_FULL}

${tail}`;
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
    const call = (message, extra) => Q.api.chat({ signal: o.sig, web: false, stream: true, agent: true, model: CODE_MODEL, thinking: "minimal", message, ...extra });
    const build = (body, css, js) => Q.template.build(o.idea.title, body, css, js, meta);
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
      const msgB = `Сен тәжірибелі frontend әзірлеушісің. Төменде қосымшаның дайын HTML белгілеуі мен CSS-і берілген (дизайн шаблоннан келеді). Соларға сай ТОЛЫҚ JavaScript жаз.

${TEMPLATE_HELP.split("\n").filter((l) => /JS көмекшілері|cloud/.test(l)).join("\n")}

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
      const min = game ? MIN_GAME : MIN_TOTAL;
      if ((game ? p.js.length : p.body.length + p.js.length) < min && !(Q.demo && Q.demo.active)) {
        o.onStage && o.onStage("кеңейту");
        const again = await call(prompt(o) + `\n\nЕСКЕРТУ: алдыңғы жауап тым қысқа болды. Бұл шағын демо емес, толыққанды өнім: көп мазмұн, толық логика жаз.`, { onDelta: (_, full) => live(full) });
        const p2 = Q.template.parse(again.answer);
        if (p2.js.length + p2.body.length > p.js.length + p.body.length && p2.end) p = p2;
      }
    }
    if (game && !p.body) p.body = "<!-- ойын -->";
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
      signal: o.sig, web: false, stream: true, agent: true, model: CODE_MODEL, thinking: "minimal",
      message: `${base}\n\nБІРІНШІ НҰСҚА ІСКЕ ҚОСЫЛҒАНДА МЫНА АҚАУЛАР ТАБЫЛДЫ:\n${list}\n\nОсы ақауларды толық түзетіп, ЖАҢА толық жауап қайтар (сол ЖАУАП ФОРМАТЫМЕН). Бет көрінетін мазмұнмен ашылуы тиіс${game ? "; Game.run шақырылуы тиіс, draw әр кадрда сызуы және ойын жүруі тиіс" : "; әр .screen-нің id-сі болсын, біреуінде class=\"on\" тұрсын"}.\n\nАқаулы код (JS):\n\`\`\`js\n${(o.js || "").slice(0, 9000)}\n\`\`\``,
    });
    let raw = r.answer, tries = 0;
    while (!Q.template.parse(raw).end && tries < 2) {
      tries++;
      const c = await Q.api.chat({ signal: o.sig, web: false, stream: false, agent: true, model: CODE_MODEL, thinking: "minimal", message: contPrompt(raw.slice(-1500), "===CSS===, ===JS===") });
      raw += "\n" + overlap(raw, unfence(c.answer));
    }
    const p = Q.template.parse(raw);
    if (game && !p.body) p.body = "<!-- ойын -->";
    if (!p.body || !p.js || !syntaxOk(p.js)) return null;
    return { body: p.body, css: p.css, js: p.js, html: Q.template.build(o.title, p.body, p.css, p.js, meta) };
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
      ? `- Телефонда басқару (сенсор батырмалары controls ішінде), тік және көлденең экранға бейімділік\n- Қиындық деңгейге қарай өседі, соқтығысу/өмір, ұпай, рекорд, дыбыс (sfx)\n- Көзге ұрмайтын, анық сызылған графика, бөлшектер/анимация, оқылатын мәтін\n- Қателерсіз init/update/draw`
      : `- Мобильге бейімділік (390px): көлденең скролл жоқ, басу аймағы ≥44px, мәтін оқылады\n- Бос күйлер (.empty), енгізуді тексеру және түсінікті қате хабарлары (toast)\n- Анимациялар мен ауысулар (transition), басқанда кері байланыс\n- Қол жетімділік: белгішелік батырмаларға aria-label, жеткілікті контраст, label-дар\n- Қателерсіз JS (null тексерулері, localStorage қатесі)`;
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: false, tries: 2, agent: true, model: CODE_MODEL, thinking: "minimal",
      message: `Сен қатаң код сапасын тексерушісің. Төмендегі веб-қосымшаны мына сапа тізімімен тексеріп, ең маңызды 3–6 жақсартуды ҚЫСҚА патчтар түрінде бер. Бүкіл кодты қайта жазба, жұмыс істеп тұрғанды бұзба.\n\nСАПА ТІЗІМІ:\n${checklist}\n\n${PATCH_FMT}\nЕгер жақсартуға тұрарлық ештеңе жоқ болса, [] қайтар.\n\nHTML:\n\`\`\`html\n${o.body.slice(0, 9000)}\n\`\`\`\nCSS:\n\`\`\`css\n${(o.css || "").slice(0, 3000)}\n\`\`\`\nJS:\n\`\`\`js\n${o.js.slice(0, 16000)}\n\`\`\``,
    });
    const res = applyPatches(o, arrOf(r.answer));
    if (!res.applied || !syntaxOk(res.js)) return null;
    return Object.assign(res, { html: Q.template.build(o.title, res.body, res.css, res.js, meta) });
  }

  /** edit: пайдаланушы өтінішін ТЕК керекті жерді өзгертетін патчтармен орындау (+ өзгеріс тізімі) */
  async function edit(o) {
    const meta = o.meta || {};
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: false, tries: 3, agent: true, model: CODE_MODEL, thinking: "minimal",
      message: `Төменде жұмыс істеп тұрған веб-қосымшаның бөліктері берілген. Пайдаланушы өтініші: «${o.request}».\nӨтінішті орындау үшін ТЕК керекті жерлерді өзгертетін патчтар жаса. Басқа бөлігін бұзба, бүкіл кодты қайта жазба. Түстерді өзгерту керек болса, CSS-те :root айнымалыларын (--accent, --accent2, --bg ...) қайта анықтайтын appendCss қолдан. Мәтіндер қазақша қалсын.\n\n${PATCH_FMT}\n\nHTML:\n\`\`\`html\n${o.body.slice(0, 14000)}\n\`\`\`\nCSS:\n\`\`\`css\n${(o.css || "").slice(0, 4000)}\n\`\`\`\nJS:\n\`\`\`js\n${o.js.slice(0, 22000)}\n\`\`\``,
    });
    const res = applyPatches(o, arrOf(r.answer));
    if (!res.applied) return null;
    if (!syntaxOk(res.js)) return { error: "syntax" };
    return Object.assign(res, { html: Q.template.build(o.title, res.body, res.css, res.js, meta) });
  }

  Q.codegen = { write, repair, improve, edit, applyPatches, isRenderIssue, syntaxOk, CODE_MODEL, PLAN_MODEL };
})(window.QWQ);
