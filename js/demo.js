/* QWQ Builder · ДЕМО РЕЖИМІ: интернетсіз алдын ала жазылған сценарий */
(function (Q) {
  const { $, sleep, toast } = Q;
  const S = Q.store;

  // дайын үлгіге (template.js) толтырылатын демо қосымша: сөз жаттықтырғыш
  const BODY = `<header class="top"><h1>Сөз <span class="grad">жаттықтырғыш</span></h1><p class="muted">Қазақша сөздерді карточкамен үйрен</p></header>
<section class="screen on" id="learn">
  <div class="grid2"><div class="stat"><b id="k">0</b><span>Білемін</span></div><div class="stat"><b id="r">0</b><span>Қайталау</span></div></div>
  <div class="card glow" style="margin-top:14px"><div class="progress"><i id="p"></i></div></div>
  <div class="card" id="card" style="min-height:200px;display:grid;place-items:center;text-align:center;cursor:pointer"><div><h1 id="w">Алма</h1><p class="muted" id="t">Аудару үшін бас</p></div></div>
  <div class="row"><button class="btn grow" id="no">Қайта</button><button class="btn primary grow" id="yes">Білемін</button></div>
  <button class="btn ghost block" id="share" style="margin-top:12px">Бөлісу</button>
</section>
<section class="screen" id="stats"><div class="card"><h2>Нәтиже</h2><div class="list" id="hist"></div><p class="empty" id="empty">Әзірге деректер жоқ</p></div></section>
<nav class="tabbar"><button class="tab on" data-go="learn">Жаттау</button><button class="tab" data-go="stats">Нәтиже</button></nav>`;
  const JS = `var W=[["Алма","Apple"],["Кітап","Book"],["Су","Water"],["Үй","House"],["Дос","Friend"],["Күн","Sun"],["Қала","City"],["Ана","Mother"],["Өнер","Art"],["Жол","Road"]];
var q=W.slice().sort(function(){return Math.random()-.5}),known=0,again=0,flipped=false,hist=store.get("hist",[]);
function show(){
  flipped=false;
  if(!q.length){$("#w").textContent="Жарайсың!";$("#t").textContent=known+" сөз үйрендің";hist.unshift({d:Date.now(),n:known});store.set("hist",hist.slice(0,8));renderHist();return}
  $("#w").textContent=q[0][0];$("#t").textContent="Аудару үшін бас";
  $("#p").style.width=((W.length-q.length)/W.length*100)+"%";$("#k").textContent=known;$("#r").textContent=again;
}
function renderHist(){
  $("#empty").hidden=hist.length>0;
  $("#hist").innerHTML=hist.map(function(h){return '<div class="item"><div class="grow"><b>'+esc(h.n)+' сөз</b><span>'+fmt.date(h.d)+'</span></div><span class="badge ok">✓</span></div>'}).join("");
}
$("#card").onclick=function(){if(!q.length)return;flipped=!flipped;$("#t").textContent=flipped?q[0][1]:"Аудару үшін бас"};
$("#yes").onclick=function(){if(!q.length)return;known++;q.shift();show()};
$("#no").onclick=function(){if(!q.length)return;again++;q.push(q.shift());show()};
show();renderHist();`;

  const IDEA = {
    title: "Сөз жаттықтырғыш",
    summary: "Қазақша сөздерді карточкамен үйрен.",
    prompt: "Қазақша–ағылшынша сөздерді жаттауға арналған қосымша жаса.\n\nЭкрандар: бір негізгі экран.\nФункциялар: карточканы басқанда айналып аудармасы көрінеді; «Білемін» және «Қайта» батырмалары; прогресс жолағы; білген және қайталанған сөздер санағышы; ең жақсы нәтиже (рекорд) localStorage-та сақталады.\nДеректер: 12 сөз, араластырылып беріледі.\nДизайн: қараңғы фон, жұмсақ градиент, үлкен жұмсақ карточкалар, көгілдір акцент, мобильді экранға бейімді.",
  };
  const PLAN = "## Мақсат\nҚазақша сөздерді карточкамен жаттату.\n\n## Экрандар\n- Негізгі экран: карточка, прогресс, санауыштар.\n- Қорытынды экраны.\n\n## Негізгі функциялар\n- Карточканы басқанда 3D айналу.\n- «Білемін» / «Қайта» таңдауы.\n- Рекордты сақтау.\n\n## Деректер (localStorage)\n- `best`: ең жақсы нәтиже.\n\n## Дизайн\nҚараңғы фон, көгілдір акцент, жұмсақ анимация.";
  const INFO = "- Интервалды қайталау (spaced repetition) жаттауды жақсартады.\n- Карточка тәсілі (flashcards) сөз қорын жылдам толықтырады.\n- Бір сессияға 10–15 сөз оңтайлы.\n- Көрнекі кері байланыс (прогресс жолағы) мотивацияны арттырады.";
  const SOURCES = [{ title: "Spaced repetition", url: "https://en.wikipedia.org/wiki/Spaced_repetition" }, { title: "Flashcard", url: "https://en.wikipedia.org/wiki/Flashcard" }, { title: "Vocabulary learning", url: "https://en.wikipedia.org/wiki/Vocabulary" }];
  const CHAT = [
    "Керемет идея! Сөз жаттауға арналған қосымшаны былай елестетемін:\n\n- **Карточкалар:** сөзді көріп, басқанда аудармасы шығады\n- **Өзін-өзі тексеру:** «Білемін» немесе «Қайта»\n- **Прогресс:** жолақ пен санауыштар\n\nҚосымша не қосайық, мысалы, рекорд?",
    "Түсіндім, соны қосамын. Бәрі дайын, «Осыдан қосымша жасау» батырмасын басуға болады.",
  ];
  const COLORS = [["қызғылт", "#ff375f"], ["қызыл", "#ff453a"], ["жасыл", "#30d158"], ["күлгін", "#bf5af2"], ["сары", "#ffd60a"], ["оранж", "#ff9f0a"], ["көк", "#0a84ff"]];

  let n = 0, playing = false;
  const D = {
    active: (() => { try { return localStorage.getItem("qwq.demo") === "1"; } catch (e) { return false; } })(),

    async chat(o) {
      const m = o.message || "";
      await sleep(350);
      let ans, srcs = [];
      if (/JSON пішімінде/.test(m)) { ans = JSON.stringify(IDEA); o = Object.assign({}, o, { stream: false }); }
      else if (/әзірлеу жоспарын/.test(m)) ans = PLAN;
      else if (o.web && (() => { try { return localStorage.getItem("qwq.demo.web") === "502"; } catch (e) { return false; } })()) throw new Q.api.QErr("QWQ сервері жауап бермеді (502).", "http", false); // тест: Worker іздеуінің 502 қатесін имитациялау
      else if (o.web) { ans = INFO; srcs = SOURCES; await sleep(1100); }
      else if (/ТҮСІНДІРУ ЖАУАП ФОРМАТЫ/.test(m)) ans = JSON.stringify({ sections: [
        { title: "Құрылым (HTML)", text: "HTML — беттің қаңқасы. Мұнда тақырып, карточка және батырмалар орналасқан.", code: '<button class="btn primary grow" id="yes">Білемін</button>' },
        { title: "Дизайн (CSS)", text: "CSS беттің түсін, өлшемін және жұмсақ бұрыштарын белгілейді.", code: ":root{--accent:#0a84ff}" },
        { title: "Функция: show()", text: "Бұл функция экрандағы сөзді және прогресс жолағын жаңартады.", code: 'function show(){ $("#w").textContent=q[0][0]; }' }] });
      else if (/Әр функция толық жасалған ба/.test(m)) ans = '{"ok":true,"problems":[]}';
      else if (/"find"/.test(m)) ans = JSON.stringify([{ find: "renderStats();", replace: "" }, { append: "$('#share').addEventListener('click', function(){ toast('Сілтеме көшірілді'); });" }]); // JS қатесі + өлі батырма патчы
      else if (/ақаулар табылды/.test(m)) ans = ["```js", JS, "```"].join("\n");                       // JS-ті толық қайта жазу
      else if (/ЖАУАП ФОРМАТЫ/.test(m)) ans = ["===HTML===", BODY, "===CSS===", "", "===JS===", JS, "renderStats();", "===END==="].join("\n"); // әдейі 1 қатесі бар нұсқа
      else if (/толық коды/.test(m)) {
        const ask = (m.match(/«([^»]+)»/) || [])[1] || "";
        const col = (COLORS.find((c) => ask.toLowerCase().includes(c[0])) || [0, "#ff375f"])[1];
        const cur = (m.match(/```html\n([\s\S]*?)\n```\s*$/) || [])[1] || Q.template.build('Сөз жаттықтырғыш', BODY, '', JS);
        ans = "```html\n" + cur.replace(/--accent:#[0-9a-fA-F]{3,8}/, "--accent:" + col) + "\n```";
      } else ans = CHAT[Math.min(n++, CHAT.length - 1)];

      if (o.stream && o.onDelta) {
        const step = Math.max(6, Math.ceil(ans.length / 120));
        let full = "";
        for (let i = 0; i < ans.length; i += step) {
          if (o.signal && o.signal.aborted) throw new Q.api.QErr("Тоқтатылды.", "abort");
          const c = ans.slice(i, i + step); full += c; o.onDelta(c, full);
          await sleep(28);
        }
      }
      return { answer: ans, sources: srcs, tools: [] };
    },

    set(on) {
      D.active = on;
      try { localStorage.setItem("qwq.demo", on ? "1" : "0"); } catch (e) {}
      Q.status();
    },

    /** Сценарийді өздігінен ойнату: сөйлесу → агент → нәтиже → түзету */
    async play() {
      if (playing) return;
      playing = true; n = 0;
      const live = () => D.active;
      const wait = async (cond, ms = 90000) => { const t = Date.now(); while (live() && !cond() && Date.now() - t < ms) await sleep(150); };
      try {
        S.reset(); Q.chat.renderAll(); Q.code.render(); Q.result.refresh(); Q.go("chat");
        await sleep(700);
        const inp = $("#input"), txt = "Қазақша сөздерді жаттауға арналған қосымша жасағым келеді";
        for (let i = 1; i <= txt.length && live(); i++) { inp.value = txt.slice(0, i); inp.dispatchEvent(new Event("input")); await sleep(32); }
        await sleep(300);
        await Q.chat.send(txt);
        await sleep(900);
        const mk = $("#make"); if (!live() || !mk) return; mk.click();
        await wait(() => Q.view === "code"); await sleep(900);
        const go = $("#go-agent"); if (!live() || !go) return; go.click();
        await wait(() => S.data.versions.length > 0);
        await sleep(1400); if (!live()) return;
        Q.go("result"); await sleep(1800);
        const tw = $("#tweak"), cmd = "түсін қызғылт ет";
        for (let i = 1; i <= cmd.length && live(); i++) { tw.value = cmd.slice(0, i); tw.dispatchEvent(new Event("input")); await sleep(45); }
        await sleep(300);
        if (live()) await Q.result.tweak(cmd);
      } finally { playing = false; }
    },
  };
  Q.demo = D;
})(window.QWQ);
