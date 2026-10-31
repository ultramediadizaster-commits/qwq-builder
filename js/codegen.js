/* QWQ Builder · кодты 3 бөлікпен жаздыру: HTML құрылымы → CSS → JS → index.html */
(function (Q) {
  const { esc, throttleRaf } = Q;
  const S = Q.store;

  const NAME = { body: "құрылым.html", css: "стиль.css", js: "логика.js" };
  const FENCE = { body: "html", css: "css", js: "js" };
  const MARK = { body: "<!--END-->", css: "/*END*/", js: "//END" };
  const MARK_RE = { body: /\s*<!--\s*END\s*-->[\s\S]*$/i, css: /\s*\/\*\s*END\s*\*\/[\s\S]*$/i, js: /\s*\/\/\s*END\s*$/i };
  const HAS_MARK = { body: /<!--\s*END\s*-->/i, css: /\/\*\s*END\s*\*\//i, js: /\/\/\s*END\s*$/i };

  const QUALITY = "Қосымша толыққанды болсын: кемінде 3-4 функция, әдемі дизайн, анимациялар, барлық батырмалар жұмыс істесін. Шағын демо емес, нақты пайдалануға болатын өнім жаса.";
  const COMMON = `- Интерфейс мәтіндері түгел қазақ тілінде.
- Mobile-first (390px), содан кейін компьютерге бейімде; көлденең скролл болмасын.
- Сыртқы кітапхана, CDN, сыртқы сурет сілтемесі ЖОҚ.
- HTML тег атаулары "tool" деп басталмасын (<toolbar>, <tooltip> орнына <div class="bar"> қолдан).`;

  const head = (n, what) => `Сен тәжірибелі frontend әзірлеушісің. Веб-қосымшаны ҮШ БӨЛІКПЕН жазамыз: 1) HTML құрылымы, 2) CSS, 3) JS. Қазір ${n}/3: ${what}.\n${QUALITY}\n`;
  const tail = (k) => `- Жауапта ТЕК бір \`\`\`${FENCE[k]} блогы бол, түсініктеме жазба. Блоктың ең соңғы жолы дәл мынау болсын: ${MARK[k]}`;

  function prompt(k, o, parts) {
    const ctx = `\nЖОБА:\n${o.brief}\n\nЖОСПАР:\n${o.plan.slice(0, 3500)}\n\nҚОСЫМША МӘЛІМЕТ:\n${o.info.slice(0, 2000)}`;
    const html = `\nҚОЛДАНЫЛАТЫН HTML (<body> ішіндегі белгілеу):\n\`\`\`html\n${(parts.body || "").slice(0, 16000)}\n\`\`\`\n`;
    if (k === "body") return `${head(1, "HTML құрылымы")}
ТАЛАПТАР:
- Тек <body> ІШІНДЕГІ белгілеуді жаз (<!doctype>, <html>, <head>, <body>, <style>, <script> тегтерінсіз).
- Барлық экрандар мен элементтерді толық жаз: шапка, навигация, негізгі экрандар, формалар, тізімдер, бос күйлер, модальды терезелер, т.б.
- Әр интерактив элементке бірегей id бер (CSS пен JS соларға сүйенеді).
${COMMON}
${tail("body")}
${ctx}`;
    if (k === "css") return `${head(2, "CSS")}
ТАЛАПТАР:
- Төмендегі HTML үшін толық CSS жаз: :root түс айнымалылары, барлық класс пен id стильделсін, градиенттер, көлеңке/шыны эффектілері, жұмсақ анимациялар (transition, @keyframes), hover/active күйлері, @media (min-width:768px) бейімдеу, @media (prefers-reduced-motion: reduce).
- Әдемі қараңғы тақырып, контраст кемінде 4.5:1, батырмалар кемінде 44px.
- ТЕК CSS жаз (<style> тегінсіз).
${COMMON}
${tail("css")}
${ctx}
${html}`;
    return `${head(3, "JavaScript")}
ТАЛАПТАР:
- Төмендегі HTML үшін толық JavaScript жаз: HTML-дегі id-ларды дәл қолдан; барлық батырма, форма, тізім, есептеу шынымен жұмыс істесін; кемінде 3-4 функция.
- Күйді localStorage-та сақта (try/catch ішінде), қателерді ұста, бос күйлерді көрсет, анимацияларды іске қос (класс қосу/алу).
- Іске қосу DOMContentLoaded ішінде. ТЕК JS жаз (<script> тегінсіз).
${COMMON}
${tail("js")}
${ctx}
${html}`;
  }

  /** Жауаптан таза бөлік алу: ```-блок, маркер және қоршауларсыз */
  const unfence = (raw) => { const m = raw.match(/```[a-zA-Z]*[ \t]*\n([\s\S]*?)(?:\n[ \t]*```|$)/); return m ? m[1] : raw; };
  function clean(raw, k) {
    let t = unfence(raw);
    if (k === "css") t = t.replace(/<\/?style[^>]*>/gi, "");
    if (k === "js") t = t.replace(/<\/?script[^>]*>/gi, "");
    return t.replace(MARK_RE[k], "").trimEnd();
  }
  const done = (raw, k) => HAS_MARK[k].test(unfence(raw).trimEnd());

  function overlap(a, b) {
    const t = a.slice(-400);
    for (let n = Math.min(t.length, b.length, 400); n >= 20; n--) if (b.startsWith(t.slice(-n))) return b.slice(n);
    return b;
  }

  // бөліктің ең аз көлемі: одан қысқа болса, "шағын демо" деп санап, кеңейтіп қайта жаздырамыз
  const MIN = { body: 3000, css: 3500, js: 5000 };
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  /** Бөлік шынымен аяқталған ба: CSS жақшалары, JS синтаксисі, HTML тегтері */
  function looksComplete(k, t) {
    if (!t) return false;
    if (k === "css") { const a = (t.match(/{/g) || []).length, b = (t.match(/}/g) || []).length; return a > 0 && a === b; }
    if (k === "js") { try { new AsyncFn(t); return true; } catch (e) { return false; } }
    const tags = "div|section|main|header|footer|nav|ul|ol|form|button|table|aside|article|select|label";
    const a = (t.match(new RegExp(`<(${tags})\\b`, "gi")) || []).length, b = (t.match(new RegExp(`</(${tags})>`, "gi")) || []).length;
    return a === b;
  }

  async function writePart(k, n, o, parts) {
    S.data.files[k] = ""; o.onFile(k);
    const gen = async (extra) => {
      o.onPart(k, `${n}/3 · ${NAME[k]}${extra ? " · кеңейту" : ""}`);
      const tick = throttleRaf((full) => { S.data.files[k] = clean(full, k); o.onFile(k); });
      const r = await Q.api.chat({
        signal: o.sig, web: false, stream: true, message: prompt(k, o, parts) + extra,
        onDelta: (_, full) => { o.onLive(NAME[k], full); tick(full); },
      });
      tick.cancel();
      return finish(k, r.answer, `${n}/3 · ${NAME[k]}`, o);
    };
    let text = await gen("");
    if (text.length < MIN[k] && !(Q.demo && Q.demo.active)) {
      const again = await gen(`\n\nЕСКЕРТУ: алдыңғы жауап тым қысқа болды (${text.length} таңба): бұл шағын демо емес, толыққанды өнім болуы керек. Кемінде ${MIN[k]} таңбалық ТОЛЫҚ нұсқасын жаз.`);
      if (again.length > text.length) text = again;
    }
    S.data.files[k] = text; o.onFile(k);
    o.onLive(NAME[k], text);
    return text;
  }

  /** Маркер жоқ → бөлік үзілген: жалғастыру (1-ші рет стримдеп, одан соң стримсіз: Worker-дің `<tool` кесуінен қорғану) */
  async function finish(k, raw0, label, o) {
    let raw = raw0, tries = 0;
    const ok = () => done(raw, k) && looksComplete(k, clean(raw, k));   // маркер бар, бірақ код үзілген болса да жалғастырамыз
    while (!ok() && tries < 4) {
      tries++;
      o.onPart(k, `${label} · жалғастыру ${tries}/4`);
      const piece = await Q.api.chat({
        signal: o.sig, web: false, stream: tries === 1 && !(Q.demo && Q.demo.active) ? true : false,
        message: `Төмендегі ${NAME[k]} коды үзіліп қалды (толық емес). Дәл үзілген жерден жалғастыр: ТЕК қалған кодты жаз, қайталама, \`\`\` қоспа. Ең соңғы жолы дәл мынау болсын: ${MARK[k]}${looksComplete(k, clean(raw, k)) ? `. Егер бөлік шынымен аяқталған болса, тек соңғы маркерді жаз: ${MARK[k]}` : ""}\n\nСоңғы бөлік:\n${clean(raw, k).slice(-1500)}`,
        onDelta: (_, full) => o.onLive(NAME[k], raw + "\n" + full),
      });
      const add = overlap(clean(raw, k), piece.answer.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, ""));
      raw = clean(raw, k) + "\n" + add;
      if (!done(raw, k) && tries === 4) raw += "\n" + MARK[k];
    }
    return clean(raw, k);
  }

  /** Қате тек JS-те болса, бүкіл файлды емес, тек JS бөлігін түзеттіру (жылдам әрі қысқа) */
  async function fixJs(o) {
    // 1) қысқа "тап → ауыстыр" патчтар (үлкен кодты қайта жазбай, тез әрі қауіпсіз)
    try {
      const pr = await Q.api.chat({
        signal: o.sig, web: false, stream: false,
        message: `Төмендегі қосымшаны іске қосқанда мына қателер табылды:\n${o.errors.map((x) => "- " + x).join("\n")}\n\nМына қателерді түзететін ҚЫСҚА патчтар жаса. Жауапта ТЕК JSON массив бер (түсініктеме, \`\`\` жоқ): [{"find":"JS кодында дәл кездесетін 1-3 жол","replace":"жаңа мәтін"}]. "find" мәтіні қазіргі JS-те әріпке дейін дәл болуы керек.\n\nHTML (id-лар):\n\`\`\`html\n${o.body.slice(0, 9000)}\n\`\`\`\n\nҚазіргі JS:\n\`\`\`js\n${o.js}\n\`\`\``,
      });
      const a = pr.answer, i = a.indexOf("["), j = a.lastIndexOf("]");
      const patches = i >= 0 && j > i ? JSON.parse(a.slice(i, j + 1)) : [];
      let js = o.js, applied = 0;
      for (const p of patches) {
        if (p && typeof p.find === "string" && typeof p.replace === "string" && p.find.length > 3 && js.includes(p.find)) { js = js.replace(p.find, () => p.replace); applied++; }
      }
      if (applied) return { js, html: assemble(o.title, o.body, o.css, js) };
    } catch (e) { if (e.code === "abort") throw e; }
    // 2) патч қолданылмаса — JS бөлігін толық қайта жаздыру
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: true,
      message: `Төмендегі қосымшаны іске қосқанда мына қателер табылды:\n${o.errors.map((x) => "- " + x).join("\n")}\n\nМына қателерді түзет. JavaScript бөлігінің ТОЛЫҚ түзетілген нұсқасын қайтар: басқа функцияларды алып тастама, қысқартпа. Жауапта ТЕК бір \`\`\`js блогы бол, соңғы жолы дәл мынау: ${MARK.js}\n\nHTML (id-лар соған сәйкес болсын):\n\`\`\`html\n${o.body.slice(0, 12000)}\n\`\`\`\n\nҚазіргі JS:\n\`\`\`js\n${o.js}\n\`\`\``,
      onDelta: (_, full) => o.onLive(NAME.js, full),
    });
    const js = await finish("js", r.answer, "JS түзету", o);
    if (js.length < 0.6 * o.js.length) return null;     // қысқартып жіберсе — қабылдамаймыз
    return { js, html: assemble(o.title, o.body, o.css, js) };
  }

  function assemble(title, body, css, js) {
    const m = body.match(/<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i);
    if (m) body = m[1];
    js = js.replace(/<\/script/gi, "<\\/script");
    return `<!doctype html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
${css}
</style>
</head>
<body>
${body.trim()}
<script>
${js}
</script>
</body>
</html>`;
  }

  async function write(o) {
    const parts = {};
    parts.body = await writePart("body", 1, o, parts);
    parts.css = await writePart("css", 2, o, parts);
    parts.js = await writePart("js", 3, o, parts);
    return assemble(o.idea.title, parts.body, parts.css, parts.js);
  }

  Q.codegen = { write, fixJs, assemble, clean, NAME };
})(window.QWQ);
