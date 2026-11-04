/* QWQ Builder · конвейер тесті: нақты API орнына қолмен жазылған «модель жауаптарын» береді (mock).
   Қолдану (ашық бетте): script ретінде жүктеп, `await QWQ_TEST.run("game"|"picker"|"timer")`. Нақты API шақырылмайды.
   Шаблон жоқ: әр фикстура өз CSS-і мен JS-ін нөлден жазады (нақты агент сияқты). */
(function () {
  const Q = window.QWQ;
  const calls = [];

  const CSS = `body{min-height:100vh;font-family:system-ui,sans-serif;background:#0b1020;color:#f4f6fb;display:flex;flex-direction:column;align-items:center}
main{width:min(100%,560px);padding:24px 16px}h1{font-size:28px;margin:0 0 8px}p{color:#b8c0d4}
button{min-height:52px;padding:0 22px;border:0;border-radius:14px;background:#4f8cff;color:#fff;font:700 17px/1 inherit;cursor:pointer;margin:6px 6px 0 0}
.big{font-size:44px;font-weight:800;margin:18px 0}.hide{display:none}`;

  // математика ойыны: 1-нұсқада ағылшын сөздері бар (Start, Score) → тексеріс тауып, патчпен аудартады
  const GAME_BODY = `<main><h1>Математика ойыны</h1><p id="rule">Мысалдың жауабын таңда. Әр дұрыс жауап — 1 ұпай.</p>
<button id="start">Start</button><div id="play" class="hide"><div class="big" id="q">2 + 2</div><div id="opts"></div><p>Score: <b id="sc">0</b></p></div></main>`;
  const GAME_JS = `var sc=0,ans=0;function next(){var a=1+Math.floor(Math.random()*9),b=1+Math.floor(Math.random()*9);ans=a+b;document.getElementById("q").textContent=a+" + "+b;
var o=document.getElementById("opts");o.textContent="";[ans,ans+1,ans-1].sort(function(){return Math.random()-.5}).forEach(function(v){var x=document.createElement("button");x.textContent=v;x.addEventListener("click",function(){if(v===ans){sc++;document.getElementById("sc").textContent=sc}next()});o.appendChild(x)})}
document.getElementById("start").addEventListener("click",function(){document.getElementById("play").classList.remove("hide");this.classList.add("hide");next()});`;

  const PICK_BODY = `<main><h1>Кездейсоқ оқушы</h1><p>Тізімге аты-жөнді қосып, «Таңдау» батырмасын бас.</p>
<input id="nm" placeholder="Оқушының аты" style="min-height:48px;width:100%;font-size:16px;border-radius:12px;padding:0 12px"><button id="add">Қосу</button><button id="pick">Таңдау</button>
<div class="big" id="who">—</div><ul id="list"></ul></main>`;
  const PICK_JS = `var L=["Айгүл","Нұрлан","Дана"];try{L=JSON.parse(localStorage.getItem("st"))||L}catch(e){}
function draw(){var u=document.getElementById("list");u.textContent="";L.forEach(function(n){var li=document.createElement("li");li.textContent=n;u.appendChild(li)})}
document.getElementById("add").addEventListener("click",function(){var v=document.getElementById("nm").value.trim();if(!v){document.getElementById("who").textContent="Атын жаз";return}L.push(v);try{localStorage.setItem("st",JSON.stringify(L))}catch(e){}draw()});
document.getElementById("pick").addEventListener("click",function(){document.getElementById("who").textContent=L[Math.floor(Math.random()*L.length)]});draw();`;

  // таймер: 1-нұсқа бос бет + JS қате → repair толық қайта жазады
  const TIMER_BAD_BODY = `<div id="t"></div>`;
  const TIMER_BAD_JS = `document.getElementById("t").textContent = ""; undefinedFn();`;
  const TIMER_BODY = `<main><h1>Сабақ таймері</h1><p>Минутты таңдап, «Бастау» бас.</p><div class="big" id="tm">05:00</div>
<button id="m5">5 минут</button><button id="m10">10 минут</button><button id="go">Бастау</button><button id="stop">Тоқтату</button></main>`;
  const TIMER_JS = `var left=300,iv=null;function show(){var m=Math.floor(left/60),s=left%60;document.getElementById("tm").textContent=(m<10?"0":"")+m+":"+(s<10?"0":"")+s}
function set(n){left=n*60;show()}document.getElementById("m5").addEventListener("click",function(){set(5)});document.getElementById("m10").addEventListener("click",function(){set(10)});
document.getElementById("go").addEventListener("click",function(){if(iv)return;iv=setInterval(function(){if(left>0){left--;show()}else{clearInterval(iv);iv=null;document.getElementById("tm").textContent="Уақыт бітті"}},1000);document.title="Жүріп жатыр"});
document.getElementById("stop").addEventListener("click",function(){clearInterval(iv);iv=null;document.getElementById("tm").textContent+=" ⏸"});show();`;

  const full = (b, c, j) => `===HTML===\n${b}\n===CSS===\n${c}\n===JS===\n${j}\n===END===`;
  const FIX = {
    game: { resp: () => full(GAME_BODY, CSS, GAME_JS), patch: () => JSON.stringify([{ file: "html", find: ">Start<", replace: ">Бастау<" }, { file: "html", find: "<p>Score:", replace: "<p>Ұпай:" }]) },
    picker: { resp: () => full(PICK_BODY, CSS, PICK_JS) },
    timer: { resp: (n) => (n === 0 ? full(TIMER_BAD_BODY, "", TIMER_BAD_JS) : full(TIMER_BODY, CSS, TIMER_JS)) },
  };
  const IDEAS = {
    game: { title: "Математика ойыны", summary: "Бастауыш сыныпқа арналған қосу ойыны.", prompt: "Математика ойыны: қосу мысалдары, жауап нұсқалары, ұпай." },
    picker: { title: "Кездейсоқ оқушы таңдау", summary: "Сыныптан кездейсоқ оқушы таңдайтын құрал.", prompt: "Оқушылар тізімі, қосу, кездейсоқ таңдау батырмасы." },
    timer: { title: "Сабақ таймері", summary: "Сабаққа арналған кері санақ таймері.", prompt: "Сабақ таймері: 5 және 10 минут, бастау, тоқтату." },
  };

  let codeN = 0, cur = null;
  const real = Q.api.chat;
  Q.api.chat = async function (o) {
    const m = o.message || "";
    calls.push({ k: o.web ? "web" : /әзірлеу жоспарын/.test(m) ? "plan" : /АҚАУЛАР ТАБЫЛДЫ/.test(m) ? "repair" : /ҚЫСҚА патчтар жаса/.test(m) ? "fix" : /сапа тізімімен/.test(m) ? "improve" : /Әр функция толық/.test(m) ? "review" : /ЖАУАП ФОРМАТЫ/.test(m) ? "code" : /Пайдаланушы өтініші/.test(m) ? "edit" : "other", thinkingLevel: o.thinkingLevel, message: m });
    await new Promise((r) => setTimeout(r, 40));
    let ans = "[]";
    if (o.web) ans = "- Нақты мәлімет\n- Дереккөз";
    else if (/әзірлеу жоспарын/.test(m)) ans = "## Мақсат\nӘзірлеу жоспары.\n\n## Функциялар\n- Негізгі\n";
    else if (/АҚАУЛАР ТАБЫЛДЫ/.test(m)) ans = cur.resp(1);
    else if (/ҚЫСҚА патчтар жаса/.test(m)) ans = cur.patch ? cur.patch() : "[]";
    else if (/сапа тізімімен/.test(m)) ans = "[]";
    else if (/Әр функция толық/.test(m)) ans = '{"ok":true,"problems":[]}';
    else if (/ЖАУАП ФОРМАТЫ/.test(m)) ans = cur.resp(codeN++);
    else if (/Пайдаланушы өтініші/.test(m)) ans = JSON.stringify([{ appendCss: "button{background:#2f7dff}", why: "Түс көкке өзгертілді" }]);
    if (o.onDelta) o.onDelta(ans, ans);
    return { answer: ans, sources: [], tools: [] };
  };

  window.QWQ_TEST = {
    calls, restore() { Q.api.chat = real; },
    async run(kind) {
      cur = FIX[kind]; codeN = 0; calls.length = 0;
      Q.demo.set(false);
      Q.store.key = "mock";
      Q.store.newChat();
      Q.store.data.idea = Object.assign({}, IDEAS[kind]);
      Q.code.render();
      await Q.code.run();
      const D = Q.store.data;
      return { type: D.meta && D.meta.type, calls: calls.slice(), left: (D.report && D.report.left) || [], found: (D.report && D.report.found) || [], hasHtml: !!D.files.html, html: D.files.html || "", versions: D.versions.length };
    },
  };
})();
