/* QWQ Builder · тексеру нәтижесін AI-мен тексеру (review) және табылған ақауларды түзету (fixJs) */
(function (Q) {
  const route = { agent: true, model: Q.codegen.CODE_MODEL, thinking: "minimal" };
  const TICKS = "```";
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const syntaxOk = (js) => { try { new AsyncFn(js); return true; } catch (e) { return false; } };   // түзету кодты бұзбасын
  const fence = (lang, t) => TICKS + lang + "\n" + t + "\n" + TICKS;

  /**
   * Табылған ақаулар тізімін (JS қате, өлі батырма, AI ескертуі) түзету.
   * 1) қысқа патчтар: {"find","replace"} (JS), {"file":"html",...}, {"append":"..."} (JS соңына қосу);
   * 2) патч қолданылмаса — JS бөлігін толық қайта жаздыру.
   * → { js, body, html } немесе null
   */
  async function fixJs(o) {
    const list = o.errors.map((x) => "- " + x).join("\n");
    try {
      const pr = await Q.api.chat({
        signal: o.sig, web: false, stream: false, ...route,
        message: `Төмендегі қосымшаны іске қосқанда мына ақаулар табылды:\n${list}\n\nМына ақауларды түзететін ҚЫСҚА патчтар жаса. Жауапта ТЕК JSON массив бер (түсініктеме, ${TICKS} жоқ). Патч түрлері:
1) JS өзгерту: {"find":"JS-те дәл кездесетін 1-3 жол","replace":"жаңа мәтін"}
2) JS соңына қосу (әрекетсіз батырмаға өңдегіш тағу үшін), міндетті түрде IIFE ішінде (атаулар қайталанып, "already declared" қатесі шықпасын): {"append":"(function(){ var b=document.querySelector('#id'); if(b) b.addEventListener('click', function(){ ... }); })();"}
3) HTML өзгерту (батырмаға id жетіспесе): {"file":"html","find":"HTML-де дәл кездесетін мәтін","replace":"жаңа мәтін"}
Әр өлі батырмаға НАҚТЫ әрекет тағы (addEventListener арқылы, көрінетін өзгеріспен: тізімді жаңарту, экран ауыстыру, хабар, деректі сақтау). "find" мәтіні қазіргі кодта әріпке дейін дәл болуы керек.

HTML:
${fence("html", o.body.slice(0, 10000))}

Қазіргі JS:
${fence("js", o.js)}`,
      });
      const a = pr.answer, i = a.indexOf("["), j = a.lastIndexOf("]");
      const patches = i >= 0 && j > i ? JSON.parse(a.slice(i, j + 1)) : [];
      let js = o.js, body = o.body, applied = 0;
      for (const p of patches) {
        if (!p) continue;
        if (typeof p.append === "string" && p.append.trim().length > 5) { js += "\n" + p.append; applied++; continue; }
        if (typeof p.find !== "string" || typeof p.replace !== "string" || p.find.length < 4) continue;
        if (p.file === "html") { if (body.includes(p.find)) { body = body.replace(p.find, () => p.replace); applied++; } }
        else if (js.includes(p.find)) { js = js.replace(p.find, () => p.replace); applied++; }
      }
      if (applied && syntaxOk(js)) return { js, body, html: Q.template.build(o.title, body, o.css, js, o.meta) };   // синтаксисі бұзылса, патч қабылданбайды
    } catch (e) { if (e.code === "abort") throw e; }

    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: true, ...route,
      message: `Төмендегі қосымшаны іске қосқанда мына ақаулар табылды:\n${list}\n\nМына ақауларды түзет. JavaScript бөлігінің ТОЛЫҚ түзетілген нұсқасын қайтар: басқа функцияларды алып тастама, қысқартпа; әр батырмаға addEventListener арқылы нақты әрекет тағылсын. Жауапта ТЕК бір ${TICKS}js блогы бол.\n\nHTML (id-лар соған сәйкес болсын):\n${fence("html", o.body.slice(0, 12000))}\n\nҚазіргі JS:\n${fence("js", o.js)}`,
    });
    // жауапта HTML блогы да болуы мүмкін: алдымен ```js / ```javascript блогын іздейміз
    const m = r.answer.match(/```(?:js|javascript)[ \t]*\n([\s\S]*?)(?:\n[ \t]*```|$)/i) || r.answer.match(/```[a-zA-Z]*[ \t]*\n([\s\S]*?)(?:\n[ \t]*```|$)/);
    const js = (m ? m[1] : r.answer).trim();
    if (js.length < 0.6 * o.js.length || /^\s*</.test(js) || !syntaxOk(js)) return null;     // қысқарса, HTML болса немесе синтаксисі бұзылса — қабылдамаймыз
    return { js, body: o.body, html: Q.template.build(o.title, o.body, o.css, js, o.meta) };
  }

  /** AI тексеруі: жоспардағы функциялар кодта толық жасалған ба, әр батырма әрекетке қосылған ба → ақаулар тізімі (қазақша) */
  async function review(o) {
    const r = await Q.api.chat({
      signal: o.sig, web: false, stream: false, tries: 2, ...route, thinking: "low",
      message: `Сен қатаң код тексерушісісің. Төменде қосымшаның жоспары, HTML және JS коды берілген.
Тексер: 1) жоспардағы әр функция кодта толық жасалған ба; 2) әр батырма (button, data-go, data-open, onclick) бір нақты әрекетке қосылған ба (addEventListener немесе үлгінің data-go/data-open/data-close); 3) қай жері жұмыс істемейді (жоқ функция, бос өңдегіш, қате id, қате селектор).
Жауапты ТЕК JSON түрінде қайтар (түсініктеме, ${TICKS} жоқ): {"ok":true,"problems":[]} немесе {"ok":false,"problems":[{"where":"батырма немесе функция атауы","what":"не жұмыс істемейді (қысқа, қазақша)"}]}. Ақау болмаса ok:true. Ең көбі 6 ақау, тек НАҚТЫ тапқандарың.

Әр функция толық жасалған ба?

ЖОСПАР:
${(o.plan || "").slice(0, 3000)}

HTML:
${fence("html", (o.body || "").slice(0, 10000))}

JS:
${fence("js", (o.js || "").slice(0, 16000))}`,
    });
    const j = Q.api.parseJSON(r.answer);
    if (!j || j.ok === true || !Array.isArray(j.problems)) return [];
    return j.problems.slice(0, 6).map((p) => `AI тексеруі: «${String(p.where || "?").slice(0, 40)}» — ${String(p.what || "").slice(0, 120)}`);
  }

  Object.assign(Q.codegen, { fixJs, review });
})(window.QWQ);
