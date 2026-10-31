/* QWQ Builder · ДЕМО РЕЖИМІ: интернетсіз алдын ала жазылған сценарий */
(function (Q) {
  const { $, sleep, toast } = Q;
  const S = Q.store;

  const APP = String.raw`<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сөз жаттықтырғыш</title>
<style>
:root{--accent:#0a84ff;--bg:#05070d}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:radial-gradient(70% 40% at 50% 0%,color-mix(in srgb,var(--accent) 34%,transparent),transparent),var(--bg);color:#fff;display:flex;flex-direction:column;align-items:center;padding:28px 16px}
h1{font-size:26px;margin:6px 0 4px;letter-spacing:-.02em}
.stat{display:flex;gap:16px;margin:10px 0 14px;font-size:14px;color:#b9c3d6}
.bar{width:100%;max-width:420px;height:8px;background:#1b2233;border-radius:9px;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .4s}
.card{width:100%;max-width:420px;height:250px;margin:26px 0;perspective:900px;cursor:pointer}
.in{position:relative;width:100%;height:100%;transition:transform .6s;transform-style:preserve-3d}
.card.f .in{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:28px;display:grid;place-items:center;text-align:center;padding:20px;font-size:36px;font-weight:700;background:linear-gradient(145deg,#182036,#0d1322);border:1px solid #2a3552;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.back{transform:rotateY(180deg);color:var(--accent)}
.face small{display:block;font-size:13px;font-weight:400;color:#8ea0bd;margin-top:10px}
.btns{display:flex;gap:12px;width:100%;max-width:420px}
button{flex:1;min-height:54px;border:0;border-radius:18px;font-size:17px;font-weight:600;color:#fff;background:#1b2233;cursor:pointer;transition:transform .2s}
button.ok{background:var(--accent)}
button:active{transform:scale(.95)}
.fin{font-size:24px;text-align:center;line-height:1.5}
</style></head><body>
<h1>Сөз жаттықтырғыш</h1>
<div class="stat"><span>Білемін: <b id="k">0</b></span><span>Қайталау: <b id="r">0</b></span><span>Рекорд: <b id="b">0</b></span></div>
<div class="bar"><i id="p"></i></div>
<div class="card" id="c"><div class="in"><div class="face" id="a"></div><div class="face back" id="e"></div></div></div>
<div class="btns"><button id="no">Қайта</button><button class="ok" id="yes">Білемін</button></div>
<script>
var W=[["Алма","Apple"],["Кітап","Book"],["Су","Water"],["Үй","House"],["Дос","Friend"],["Күн","Sun"],["Қала","City"],["Ана","Mother"],["Өнер","Art"],["Жол","Road"],["Тіл","Language"],["Бақыт","Happiness"]];
var q=W.slice().sort(function(){return Math.random()-.5}),known=0,again=0,best=0,total=W.length;
try{best=+localStorage.getItem("best")||0}catch(e){}
function $(i){return document.getElementById(i)}
function show(){
  var c=$("c");c.classList.remove("f");
  if(!q.length){
    c.outerHTML='<div class="fin" id="c">Жарайсың!<br>'+known+' сөз үйрендің</div>';
    $("yes").textContent="Қайтадан";$("no").style.display="none";
    $("yes").onclick=function(){location.reload()};
    if(known>best){best=known;try{localStorage.setItem("best",best)}catch(e){}}
    $("b").textContent=best;return}
  $("a").innerHTML=q[0][0]+"<small>Аудару үшін бас</small>";
  $("e").textContent=q[0][1];
  $("p").style.width=((total-q.length)/total*100)+"%";
  $("k").textContent=known;$("r").textContent=again;$("b").textContent=best;
}
$("c").onclick=function(){this.classList.toggle("f")};
$("yes").onclick=function(){if(!q.length)return;known++;q.shift();show()};
$("no").onclick=function(){if(!q.length)return;again++;q.push(q.shift());show()};
show();
</script></body></html>`;

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
      else if (o.web) { ans = INFO; srcs = SOURCES; await sleep(1100); }
      else if (/қателер табылды/.test(m)) ans = "```html\n" + APP + "\n```";                       // түзетілген нұсқа
      else if (/ЖҰМЫС ІСТЕЙТІН/.test(m)) ans = "```html\n" + APP.replace("show();\n</script>", "show();\nrenderStats();\n</script>") + "\n```"; // әдейі 1 қатесі бар нұсқа
      else if (/толық коды/.test(m)) {
        const ask = (m.match(/«([^»]+)»/) || [])[1] || "";
        const col = (COLORS.find((c) => ask.toLowerCase().includes(c[0])) || [0, "#ff375f"])[1];
        const cur = (m.match(/```html\n([\s\S]*?)\n```\s*$/) || [])[1] || APP;
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
