/* QWQ Builder · кодты БІР сұраумен жаздыру (дайын үлгіге мазмұн + логика толтырылады) */
(function (Q) {
  const S = Q.store;
  // Worker: agent:true + codeModels тізімінен модель → Gemini, жылдам әрі ұзын шығыс (8–16K токен)
  const CODE_MODEL = "gemini-3.5-flash-lite";
  const PLAN_MODEL = "gemini-3.1-flash-lite";

  const QUALITY = "Қосымша толыққанды болсын: кемінде 3-4 функция, әдемі дизайн, анимациялар, барлық батырмалар жұмыс істесін. Шағын демо емес, нақты пайдалануға болатын өнім жаса.";
  const MIN_TOTAL = 6000;     // body + js осыдан қысқа болса — "шағын демо" деп санап, кеңейтіп қайта жаздырамыз

  function prompt(o) {
    return `Сен тәжірибелі frontend әзірлеушісің. Дайын базалық ҮЛГІГЕ (шаблонға) тек мазмұн мен логиканы толтырып, толыққанды веб-қосымша жаз. Шаблонда дизайн, CSS айнымалылары және JS көмекшілері бар, оларды қайта жазба.

${QUALITY}

ШАБЛОН БЕРЕТІН СЫНЫПТАР (HTML-де қолдан):
- Құрылым: <header class="top"><h1>..</h1><p class="muted">..</p></header>; әр экран <section class="screen" id="..">, біреуіне "on" қос; төменгі навигация <nav class="tabbar"><button class="tab on" data-go="экран-id">Атауы</button>..</nav> (data-go арқылы экран ауысуы автоматты жұмыс істейді).
- .card, .card.glow, .row (.between), .grow, .grid2, .stat (ішінде <b>мән</b><span>атауы</span>), .list > .item (ішінде .grow > <b>+<span>), .badge (.ok .warn .bad), .progress > <i style="width:40%">, .empty, .muted, .grad (градиент мәтін), .chips > .chip (.on).
- Батырма: .btn, .btn.primary, .btn.ghost, .btn.danger, .btn.sm, .btn.icon, .btn.block. Форма: .field > <label> + .input / .select / .textarea. Ауыстырғыш: button.switch (.on).
- Модальды терезе: <div class="modal" id="m1"><div class="sheet">..<button class="btn" data-close>Жабу</button></div></div>; ашу: data-open="m1".
- JS көмекшілері ДАЙЫН (қайта жарияла-ма!): $ $$ store.get(кілт, әдепкі) store.set(кілт, мән) uid() esc(мәтін) toast(хабар) go(экранId) fmt.money(n) fmt.date(d) fmt.num(n).
- Өз CSS-ің тек қосымша үшін (қысқа, мысалы диаграмма, ерекше элементтер). Негізгі дизайн шаблоннан келеді.

ТАЛАПТАР:
- Мәтіндердің бәрі қазақша. Деректерді store арқылы localStorage-та сақта. Бос күйлерді (.empty) және тексерулерді (бос өріс, қате енгізу) ұмытпа.
- Жаңа элементтерді JS арқылы салғанда HTML-ді esc() арқылы қауіпсіз құр. Диаграмма керек болса, inline SVG немесе CSS қолдан. Сыртқы сілтеме/кітапхана/сурет ЖОҚ.
- Бастапқы күйді JS соңында іске қос (тізімдерді салу, санауыштарды жаңарту).

ЖАУАП ФОРМАТЫ (дәл осылай, басқа ештеңе жазба, \`\`\` қоспа):
===HTML===
<header class="top"> бастап экрандар мен навигацияға дейінгі белгілеу (<body>, <script>, <style> тегтерінсіз)
===CSS===
қосымша қысқа CSS (қажет болмаса бос қалдыр)
===JS===
толық JavaScript (<script> тегінсіз)
===END===

ЖОБА:
${o.brief}

ЖОСПАР:
${o.plan.slice(0, 3500)}

ҚОСЫМША МӘЛІМЕТ:
${o.info.slice(0, 2500)}`;
  }

  const contPrompt = (tail) => `Төмендегі жауап ұзындыққа байланысты үзіліп қалды. Дәл үзілген жерден жалғастыр: ТЕК қалған кодты жаз, қайталама, \`\`\` қоспа. Формат сақталсын (===CSS===, ===JS===), ең соңында ===END=== жаз. Егер жауап толық аяқталған болса, тек ===END=== жаз.\n\nСоңғы бөлік:\n${tail}`;

  function overlap(a, b) {
    const t = a.slice(-400);
    for (let n = Math.min(t.length, b.length, 400); n >= 20; n--) if (b.startsWith(t.slice(-n))) return b.slice(n);
    return b;
  }

  /**
   * write({idea, brief, plan, info, sig, onLive(full), onPreview(html), onStage(text)})
   * → { html, body, css, js }
   */
  async function write(o) {
    const call = (message, extra) => Q.api.chat({ signal: o.sig, web: false, stream: true, agent: true, model: CODE_MODEL, message, ...extra });
    const preview = (text) => {
      const p = Q.template.parse(text);
      // JS тек толық жазылған соң қосылады (жартылай JS қате береді)
      return Q.template.build(o.idea.title, p.body, p.css, p.stage >= 4 ? p.js : "");
    };
    const live = (full) => { o.onLive(full); o.onPreview && o.onPreview(full, preview); };

    let r = await call(prompt(o), { onDelta: (_, full) => live(full) });
    let raw = r.answer, tries = 0;
    // Жауап үзілсе ғана жалғастыру
    while (!Q.template.parse(raw).end && tries < 3) {
      tries++;
      o.onStage && o.onStage(`жалғастыру ${tries}/3`);
      const c = await call(contPrompt(raw.slice(-1500)), { stream: tries === 1, onDelta: (_, full) => live(raw + "\n" + full) });
      raw += "\n" + overlap(raw, c.answer.replace(/^\s*```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, ""));
    }
    let p = Q.template.parse(raw);
    // тым қысқа (шағын демо) болса — бір рет кеңейтіп қайта жаздырамыз
    if (p.body.length + p.js.length < MIN_TOTAL && !(Q.demo && Q.demo.active)) {
      o.onStage && o.onStage("кеңейту");
      const again = await call(prompt(o) + `\n\nЕСКЕРТУ: алдыңғы жауап тым қысқа болды. Бұл шағын демо емес, толыққанды өнім: кемінде 4 функция, көп мазмұн, толық логика жаз.`, { onDelta: (_, full) => live(full) });
      const p2 = Q.template.parse(again.answer);
      if (p2.body.length + p2.js.length > p.body.length + p.js.length && p2.end) p = p2;
    }
    if (!p.body) throw new Q.api.QErr("QWQ код пішімін бұзды. Қайта байқап көр.", "format");
    return { body: p.body, css: p.css, js: p.js, html: Q.template.build(o.idea.title, p.body, p.css, p.js) };
  }

  /** Қате тек JS-те болса, бүкіл файлды емес, тек JS-ке қысқа патч сұрау; болмаса JS-ті толық қайта жаздыру */
  async function fixJs(o) {
    const route = { agent: true, model: CODE_MODEL };
    try {
      const pr = await Q.api.chat({
        signal: o.sig, web: false, stream: false, ...route,
        message: `Төмендегі қосымшаны іске қосқанда мына қателер табылды:\n${o.errors.map((x) => "- " + x).join("\n")}\n\nМына қателерді түзететін ҚЫСҚА патчтар жаса. Жауапта ТЕК JSON массив бер (түсініктеме, \`\`\` жоқ): [{"find":"JS кодында дәл кездесетін 1-3 жол","replace":"жаңа мәтін"}]. "find" мәтіні қазіргі JS-те әріпке дейін дәл болуы керек.\n\nHTML (id-лар):\n\`\`\`html\n${o.body.slice(0, 9000)}\n\`\`\`\n\nҚазіргі JS:\n\`\`\`js\n${o.js}\n\`\`\``,
      });
      const a = pr.answer, i = a.indexOf("["), j = a.lastIndexOf("]");
      const patches = i >= 0 && j > i ? JSON.parse(a.slice(i, j + 1)) : [];
      let js = o.js, applied = 0;
      for (const p of patches) {
        if (p && typeof p.find === "string" && typeof p.replace === "string" && p.find.length > 3 && js.includes(p.find)) { js = js.replace(p.find, () => p.replace); applied++; }
      }
      if (applied) return { js, html: Q.template.build(o.title, o.body, o.css, js) };
    } catch (e) { if (e.code === "abort") throw e; }
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: true, ...route,
      message: `Төмендегі қосымшаны іске қосқанда мына қателер табылды:\n${o.errors.map((x) => "- " + x).join("\n")}\n\nМына қателерді түзет. JavaScript бөлігінің ТОЛЫҚ түзетілген нұсқасын қайтар: басқа функцияларды алып тастама, қысқартпа. Жауапта ТЕК бір \`\`\`js блогы бол.\n\nHTML (id-лар соған сәйкес болсын):\n\`\`\`html\n${o.body.slice(0, 12000)}\n\`\`\`\n\nҚазіргі JS:\n\`\`\`js\n${o.js}\n\`\`\``,
    });
    const m = r.answer.match(/```[a-zA-Z]*[ \t]*\n([\s\S]*?)(?:\n[ \t]*```|$)/);
    const js = (m ? m[1] : r.answer).trim();
    if (js.length < 0.6 * o.js.length) return null;     // қысқартып жіберсе — қабылдамаймыз
    return { js, html: Q.template.build(o.title, o.body, o.css, js) };
  }

  Q.codegen = { write, fixJs, CODE_MODEL, PLAN_MODEL };
})(window.QWQ);
