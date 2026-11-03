/* QWQ Builder · жобаның түрін анықтау және дизайн бағыттарының кітапханасы.
   Әр қосымша бір шаблонмен шықпауы үшін: түр → сәйкес бағыттар → соңғы қолданылғандардан басқасы таңдалады. */
(function (Q) {
  const TYPES = [
    { id: "game", name: "Ойын", re: /ойын|ойна|game|шутер|платформер|жарыс|racing|snake|жылан|тетрис|tetris|pong|flappy|арканоид|лабиринт|жұмбақ ойын|puzzle|шарик|аркад|runner|shooter|quiz ойын|memory/i },
    { id: "landing", name: "Лендинг", re: /лендинг|landing|сайт|веб-?сайт|бизнес визитка|визитка|кафе|ресторан|студия|клиника|дүкен сайты|ұсыныс беті|promo|жарнама беті/i },
    { id: "portfolio", name: "Портфолио", re: /портфолио|portfolio|резюме|cv\b|жеке сайт|жұмыстарым|өзім туралы/i },
    { id: "dashboard", name: "Дашборд", re: /дашборд|dashboard|аналитик|статистик|есеп беру|кіріс.?шығыс|бюджет|қаржы|финанс|график|диаграмм|мониторинг|crm|склад|инвентар/i },
    { id: "learn", name: "Оқу", re: /оқу|үйрен|жатта|сөздік|сөз жаттық|карточк|тест|викторина|сабақ|емтихан|курс|флешкарт|тренажёр|тренажер|грамматик/i },
    { id: "tool", name: "Құрал", re: /калькулятор|конвертер|таймер|секундомер|тізім|todo|жоспарлаушы|трекер|генератор|құрал|өлшеу|есептеу|заметка|жазба|ескертпе|парольд|qr|календарь/i },
  ];

  /* Дизайн бағыттары: v — CSS айнымалылары, f — қаріп, r — бұрыш, m — қозғалыс сипаты, x — қосымша CSS, d — модельге нұсқау */
  const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const SERIF = 'Georgia,"Iowan Old Style","Palatino Linotype",serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const ROUND = '"Trebuchet MS","Avenir Next","Segoe UI",system-ui,sans-serif';
  const DISPLAY = 'Impact,"Arial Narrow Bold","Arial Black",system-ui,sans-serif';

  const STYLES = [
    { id: "minimal", name: "Минимал", chip: true, types: ["landing", "tool", "portfolio", "learn", "dashboard"], light: true,
      v: { bg: "#f7f7f5", surface: "rgba(0,0,0,.035)", surface2: "rgba(0,0,0,.07)", line: "rgba(0,0,0,.11)", text: "#16181d", muted: "#6b7280", accent: "#16181d", accent2: "#4b5563", shadow: "0 6px 20px rgba(0,0,0,.06)", sheet: "#ffffff", bar: "rgba(255,255,255,.85)", inp: "#ffffff" },
      f: SANS, r: 10, d: "Ақ-сұр минимал: көп бос орын, жұқа сызықтар, бір ғана қою акцент, ешқандай градиент пен жылтыр эффект жоқ, жұмсақ жиек. Анимация өте аз (opacity)." },
    { id: "neon", name: "Неон", chip: true, types: ["game", "landing", "dashboard", "tool"],
      v: { bg: "#05030f", surface: "rgba(120,80,255,.08)", surface2: "rgba(120,80,255,.16)", line: "rgba(0,255,224,.28)", text: "#eafcff", muted: "#8aa1c9", accent: "#00f5d4", accent2: "#ff2bd6", shadow: "0 0 30px rgba(0,245,212,.18)" },
      f: MONO, r: 6, x: ".card,.stat,.item{box-shadow:0 0 0 1px rgba(0,245,212,.25),0 0 24px rgba(255,43,214,.12)}h1,h2{text-shadow:0 0 18px rgba(0,245,212,.6)}", d: "Киберпанк неон: қара-күлгін фон, жарқыраған көгілдір және фуксия сызықтар, моноширинді қаріп, жарқыл (glow) эффектілері, жиектерде неон сызық." },
    { id: "toy", name: "Ойыншық", chip: true, types: ["game", "learn", "tool", "landing"], light: true,
      v: { bg: "#fff4d6", surface: "#ffffff", surface2: "#ffe8a3", line: "#2b2118", text: "#2b2118", muted: "#7a6a55", accent: "#ff5d73", accent2: "#3d8bff", shadow: "4px 5px 0 #2b2118", sheet: "#ffffff", bar: "#ffffff", inp: "#fffaf0" },
      f: ROUND, r: 22, x: ".card,.stat,.item,.btn,.input,.chip,.tabbar,.sheet{border-width:2.5px!important}.btn:active{transform:translate(3px,4px)!important}body{background:var(--bg)!important}.card{backdrop-filter:none}", d: "Ойыншық/комикс стилі: ашық сары фон, қою жиектер (3px), қатты көлеңке (офсет), жұмсақ дөңгелек пішіндер, қуанышты түстер (қызғылт, көк, сары), секіретін анимациялар." },
    { id: "corp", name: "Корпоратив", chip: true, types: ["landing", "dashboard", "tool", "portfolio", "learn"], light: true,
      v: { bg: "#f2f5fa", surface: "#ffffff", surface2: "#e8eef8", line: "#d6dfee", text: "#0f1b33", muted: "#5b6b88", accent: "#1d4ed8", accent2: "#0ea5e9", shadow: "0 10px 30px rgba(20,40,90,.10)", sheet: "#ffffff", bar: "rgba(255,255,255,.92)", inp: "#ffffff" },
      f: SANS, r: 12, x: "body{background:var(--bg)!important}.card{backdrop-filter:none}", d: "Корпоративті таза стиль: ашық фон, көк акцент, ақ карточкалар жұмсақ көлеңкемен, ресми, тор (grid) макет, қысқа және нақты мәтін, сенімділік беретін элементтер." },
    { id: "retro", name: "Ретро", chip: true, types: ["game", "landing", "tool", "portfolio"],
      v: { bg: "#1a1423", surface: "rgba(255,255,255,.05)", surface2: "rgba(255,255,255,.1)", line: "#ffb347", text: "#ffe9c7", muted: "#c9a77a", accent: "#ffb347", accent2: "#ff4f7b", shadow: "6px 6px 0 rgba(0,0,0,.55)" },
      f: MONO, r: 0, x: ".card,.stat,.item,.btn,.input,.chip,.tabbar,.sheet,.progress,.progress>i{border-radius:0!important}.btn.primary{background:var(--accent)!important;color:#1a1423!important}body{background:var(--bg)!important;image-rendering:pixelated}.card{backdrop-filter:none;border-width:2px}", d: "80-жылдардың ретро/пиксель стилі: күңгірт күлгін фон, жантақ-сары мен қызғылт акцент, үшкір бұрыштар (0 radius), қалың жиектер, моноширинді қаріп, баспалдақты анимациялар (steps)." },
    { id: "nature", name: "Табиғат", types: ["learn", "tool", "landing", "portfolio", "dashboard"], light: true,
      v: { bg: "#eef3e8", surface: "rgba(255,255,255,.7)", surface2: "#dfe9d3", line: "#cddbbd", text: "#1f2e1c", muted: "#62775a", accent: "#2f7d4f", accent2: "#9bb23a", shadow: "0 10px 28px rgba(40,70,30,.12)", sheet: "#f8fbf3", bar: "rgba(248,251,243,.9)", inp: "#ffffff" },
      f: SERIF, r: 24, x: "body{background:var(--bg)!important}", d: "Табиғи, органикалық стиль: жасыл мен құм түстері, сериф қаріп тақырыпта, үлкен дөңгелек карточкалар, жұмсақ, баяу анимациялар." },
    { id: "luxe", name: "Люкс", types: ["landing", "portfolio", "dashboard", "tool"],
      v: { bg: "#0b0a09", surface: "rgba(255,255,255,.04)", surface2: "rgba(212,175,55,.1)", line: "rgba(212,175,55,.3)", text: "#f3ead7", muted: "#a39878", accent: "#d4af37", accent2: "#f1d98a", shadow: "0 18px 50px rgba(0,0,0,.6)" },
      f: SERIF, r: 4, x: "h1,h2,h3{font-weight:500;letter-spacing:.02em}.btn.primary{color:#171309!important}", d: "Люкс стиль: қара фон, алтын акцент, сериф тақырыптар, кең аралықтар, нәзік жұқа жиектер, баяу, талғампаз анимациялар." },
    { id: "glass", name: "Шыны", types: ["tool", "dashboard", "landing", "learn"],
      v: { bg: "#050810", surface: "rgba(255,255,255,.07)", surface2: "rgba(255,255,255,.13)", line: "rgba(255,255,255,.2)", text: "#f4f7ff", muted: "#9eabc6", accent: "#6aa8ff", accent2: "#b183ff", shadow: "0 18px 50px rgba(0,0,0,.5)" },
      f: SANS, r: 26, d: "iOS Liquid Glass стилі: қара фон, түрлі-түсті жарқын бұлыңғыр дақтар, шыны карточкалар (blur, жұқа ақ жиек), жұмсақ жарқыраған батырмалар." },
    { id: "sunset", name: "Күнбатыс", types: ["landing", "game", "tool", "portfolio", "learn"],
      v: { bg: "#1b0d24", surface: "rgba(255,255,255,.07)", surface2: "rgba(255,255,255,.13)", line: "rgba(255,170,120,.28)", text: "#fff1e8", muted: "#d2a9b8", accent: "#ff7a59", accent2: "#ffc15e", shadow: "0 14px 40px rgba(60,10,40,.55)" },
      f: ROUND, r: 20, x: "body{background:linear-gradient(180deg,#2a1038,#1b0d24 55%,#3a1330)!important;background-attachment:fixed}", d: "Күн батқандағы градиент: күлгін → қызғылт → қызғылт сары, жылы түстер, дөңгелек пішіндер, жылы жарқыл." },
    { id: "brutal", name: "Брутализм", types: ["portfolio", "landing", "tool", "game", "dashboard"], light: true,
      v: { bg: "#f0ede4", surface: "#ffffff", surface2: "#ffe600", line: "#000000", text: "#000000", muted: "#444444", accent: "#000000", accent2: "#ff3d00", shadow: "6px 6px 0 #000", sheet: "#ffffff", bar: "#ffffff", inp: "#ffffff" },
      f: DISPLAY, r: 0, x: "*{border-radius:0!important}.card,.stat,.item,.btn,.input,.chip,.tabbar,.sheet{border:3px solid #000!important}h1,h2,h3{text-transform:uppercase}.btn.primary{background:#ff3d00!important}body{background:var(--bg)!important}.card{backdrop-filter:none}", d: "Нео-брутализм: ақ-сары фон, қара қалың жиектер (3px), қатты қара көлеңке, ірі бас әріпті тақырыптар, жарқын қызғылт сары акцент, үшкір бұрыштар." },
    { id: "space", name: "Ғарыш", types: ["game", "landing", "dashboard", "learn"],
      v: { bg: "#02030a", surface: "rgba(90,120,255,.08)", surface2: "rgba(90,120,255,.16)", line: "rgba(130,160,255,.25)", text: "#e8eeff", muted: "#8d9bc4", accent: "#7aa2ff", accent2: "#ffd166", shadow: "0 16px 44px rgba(0,0,30,.7)" },
      f: SANS, r: 16, x: "body{background:radial-gradient(1px 1px at 20% 30%,#fff8,transparent),radial-gradient(1.5px 1.5px at 70% 60%,#fff8,transparent),radial-gradient(1px 1px at 40% 80%,#fff6,transparent),radial-gradient(60% 40% at 80% 0%,#2a3a8f55,transparent),#02030a!important;background-attachment:fixed}", d: "Ғарыштық стиль: терең қара-көк фон, жұлдыздар, көк және алтын акцент, жеңіл жарқыл, баяу қалқитын элементтер." },
    { id: "pastel", name: "Пастель", types: ["learn", "tool", "portfolio", "landing"], light: true,
      v: { bg: "#fdf2f8", surface: "rgba(255,255,255,.8)", surface2: "#fce7f3", line: "#f5d0e6", text: "#3b2a43", muted: "#8e7a97", accent: "#c26bd8", accent2: "#6bb7ff", shadow: "0 12px 30px rgba(190,100,170,.16)", sheet: "#fff", bar: "rgba(255,255,255,.9)", inp: "#ffffff" },
      f: ROUND, r: 26, x: "body{background:linear-gradient(160deg,#fdf2f8,#eef6ff 60%,#f3eaff)!important;background-attachment:fixed}", d: "Жұмсақ пастель түстер: қызғылт, көгілдір, сиреневый, дөңгелек пішіндер, ауа, нәзік көлеңкелер, тыныш, жылы тон." },
    { id: "terminal", name: "Терминал", types: ["tool", "dashboard", "game", "portfolio"],
      v: { bg: "#050a05", surface: "rgba(0,255,100,.05)", surface2: "rgba(0,255,100,.1)", line: "rgba(0,255,100,.3)", text: "#b8ffcb", muted: "#5fa874", accent: "#2dff7a", accent2: "#9dff5a", shadow: "0 0 24px rgba(0,255,100,.08)" },
      f: MONO, r: 3, x: ".btn.primary{color:#021a0a!important}h1,h2{text-shadow:0 0 12px rgba(45,255,122,.45)}", d: "Терминал/хакер стилі: қара фон, жасыл моноширинді мәтін, жарқыл, '>' нұсқағыштар, жыпылықтайтын курсор." },
    { id: "bold", name: "Жарқын", types: ["landing", "game", "learn", "dashboard", "tool"],
      v: { bg: "#0c0c10", surface: "rgba(255,255,255,.06)", surface2: "rgba(255,255,255,.12)", line: "rgba(255,255,255,.14)", text: "#ffffff", muted: "#a9a9b8", accent: "#ff3b6b", accent2: "#ffb800", shadow: "0 14px 40px rgba(0,0,0,.5)" },
      f: DISPLAY, r: 14, x: "h1,h2{text-transform:uppercase;letter-spacing:.01em}", d: "Жарқын, ірі типографика: үлкен бас әріпті тақырыптар, қою фон, қызғылт-сары акценттер, күшті контраст, динамикалы анимациялар." },
  ];

  const byId = (id) => STYLES.find((s) => s.id === id);
  const CHIPS = [{ id: "auto", name: "Авто" }].concat(STYLES.filter((s) => s.chip).map((s) => ({ id: s.id, name: s.name })));

  function classify(text) {
    const t = String(text || "");
    // атау мен сипаттама алдымен, сосын толық мәтін
    for (const ty of TYPES) if (ty.re.test(t)) return ty.id;
    return "app";
  }

  const recent = () => { try { return JSON.parse(localStorage.getItem("qwq.styles.recent") || "[]"); } catch (e) { return []; } };
  const remember = (id) => { try { localStorage.setItem("qwq.styles.recent", JSON.stringify([id].concat(recent().filter((x) => x !== id)).slice(0, 4))); } catch (e) {} };

  /** pick(type, wanted) → стиль: қалауы бар болса сол; әйтпесе түрге сай, соңғы 3 қолданылмаған бағыттардан кездейсоқ */
  function pick(type, wanted) {
    if (wanted && wanted !== "auto" && byId(wanted)) { remember(wanted); return byId(wanted); }
    const rec = recent();
    let pool = STYLES.filter((s) => s.types.includes(type) || (type === "app" && !s.types.includes("game")));
    if (!pool.length) pool = STYLES.slice();
    const fresh = pool.filter((s) => !rec.slice(0, 3).includes(s.id));
    const from = fresh.length ? fresh : pool;
    const s = from[Math.floor(Math.random() * from.length)];
    remember(s.id);
    return s;
  }

  /** Стильдің CSS-і: :root айнымалылары + қаріп + бұрыш + қосымша */
  function css(st) {
    if (!st) return "";
    const v = st.v, o = [];
    Object.keys(v).forEach((k) => o.push(`--${k}:${v[k]}`));
    o.push(`--r:${st.r}px`, `--r-sm:${Math.max(2, Math.round(st.r * 0.65))}px`, `--font:${st.f}`);
    return `:root{${o.join(";")}}body{font-family:var(--font)}${st.light ? "" : ""}${st.x || ""}`;
  }

  const TYPE_GUIDE = {
    game: "Түрі: ОЙЫН. Шаблон толық экранды canvas ойын қозғалтқышын (Game.run) береді; сен тек ойын механикасын жазасың.",
    landing: "Түрі: ЛЕНДИНГ. Бір ұзын беттегі секциялар (hero, артықшылықтар, баға/қызмет, пікірлер, байланыс формасы, footer) — экран ауыстыру емес, төмен қарай жылжу. Hero-да үлкен тақырып және негізгі әрекет (CTA) батырмасы.",
    portfolio: "Түрі: ПОРТФОЛИО. Жеке бет: аты, мамандығы, жұмыстар торы (карточкалар), дағдылар, байланыс. Пайдаланушының идеясына сай ойдан толық мазмұн жаз.",
    dashboard: "Түрі: ДАШБОРД. Көрсеткіш карточкалары (.stat), inline SVG/CSS диаграммалар, сүзгілер (чиптер), деректер тізімі/кестесі, енгізу формасы; деректер localStorage-та.",
    learn: "Түрі: ОҚУ ҚОСЫМШАСЫ. Нақты мазмұн (кемінде 12 сұрақ/сөз/карточка), прогресс, нәтиже экраны, қателерді қайталау, ұпай/серия.",
    tool: "Түрі: ҚҰРАЛ/КАЛЬКУЛЯТОР. Нақты есептеу логикасы, жылдам енгізу, нәтижені көрнекі көрсету, тарих, көшіру батырмасы.",
    app: "Түрі: ЖАЛПЫ ҚОСЫМША. Идеяға сай 3–4 экран.",
  };

  Q.styles = { TYPES, STYLES, CHIPS, classify, pick, css, byId, TYPE_GUIDE, typeName: (id) => (TYPES.find((t) => t.id === id) || { name: "Қосымша" }).name };
})(window.QWQ);
