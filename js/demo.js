/* QWQ Builder · ДЕМО РЕЖИМІ: интернетсіз алдын ала жазылған сценарий */
(function (Q) {
  const { $, sleep, toast } = Q;
  const S = Q.store;

  // демо қосымша: сөз жаттықтырғыш (шаблонсыз — өз CSS-і мен көмекшілері бар, нақты агент жазатындай)
  const CSS = `:root{--bg:#07080d;--surface:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--text:#f4f6fb;--muted:#9aa4b8;--accent:#5aa9ff;--accent2:#a47bff;--ok:#34d399}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--text);background:radial-gradient(60% 36% at 12% 0%,color-mix(in srgb,var(--accent) 24%,transparent),transparent),var(--bg);background-attachment:fixed;min-height:100vh;padding-bottom:96px}
.app{max-width:560px;margin:0 auto;padding:20px 16px}h1,h2{margin:0 0 8px;line-height:1.2}h1{font-size:28px}
.muted{color:var(--muted);font-size:14px}.grad{background:linear-gradient(100deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.top{margin:6px 0 18px}.top p{margin:0}.screen{display:none}.screen.on{display:block}
.card,.stat,.item{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px;margin-bottom:12px}.card.glow{border-color:color-mix(in srgb,var(--accent) 40%,var(--line))}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.stat b{display:block;font-size:24px}.stat span{color:var(--muted);font-size:13px}
.row{display:flex;gap:10px}.grow{flex:1}.list{display:flex;flex-direction:column}.item{display:flex;align-items:center;gap:12px}.item span{color:var(--muted);font-size:13px}
.btn{min-height:52px;padding:0 20px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.1);color:var(--text);font:600 16px/1 inherit;cursor:pointer}.btn.primary{border:0;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}.btn.ghost{background:transparent}.btn.block{width:100%}
.progress{height:10px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .5s}
.badge{padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}.badge.ok{color:var(--ok)}.empty{text-align:center;color:var(--muted);padding:30px 16px}
.tabbar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:min(calc(100% - 24px),520px);display:flex;gap:4px;padding:6px;border-radius:999px;background:rgba(18,20,30,.8);border:1px solid var(--line)}
.tab{flex:1;min-height:48px;border:0;border-radius:999px;background:none;color:var(--muted);font:600 14px/1 inherit;cursor:pointer}.tab.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#12141e;border:1px solid var(--line);font-size:14px}`;
  const BODY = `<div class="app"><header class="top"><h1>Сөз <span class="grad">жаттықтырғыш</span></h1><p class="muted">Қазақша сөздерді карточкамен үйрен</p></header>
<section class="screen on" id="learn">
  <div class="grid2"><div class="stat"><b id="k">0</b><span>Білемін</span></div><div class="stat"><b id="r">0</b><span>Қайталау</span></div></div>
  <div class="card glow" style="margin-top:14px"><div class="progress"><i id="p"></i></div></div>
  <div class="card" id="card" style="min-height:200px;display:grid;place-items:center;text-align:center;cursor:pointer"><div><h1 id="w">Алма</h1><p class="muted" id="t">Аудару үшін бас</p></div></div>
  <div class="row"><button class="btn grow" id="no">Қайта</button><button class="btn primary grow" id="yes">Білемін</button></div>
  <button class="btn ghost block" id="share" style="margin-top:12px">Бөлісу</button>
</section>
<section class="screen" id="stats"><div class="card"><h2>Нәтиже</h2><div class="list" id="hist"></div><p class="empty" id="empty">Әзірге деректер жоқ</p></div></section>
<nav class="tabbar"><button class="tab on" data-go="learn">Жаттау</button><button class="tab" data-go="stats">Нәтиже</button></nav></div>`;
  const JS = `var $=function(s){return document.querySelector(s)},$$=function(s){return [].slice.call(document.querySelectorAll(s))};
var store={get:function(k,d){try{var v=localStorage.getItem("app_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem("app_"+k,JSON.stringify(v))}catch(e){}}};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var fmt={date:function(d){return new Date(d).toLocaleDateString("kk-KZ",{day:"numeric",month:"short"})}};
function toast(m){var t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2400)}
$$("[data-go]").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.go;$$(".screen").forEach(function(s){s.classList.toggle("on",s.id===id)});$$("[data-go]").forEach(function(x){x.classList.toggle("on",x===b)})})});
var W=[["Алма","Apple"],["Кітап","Book"],["Су","Water"],["Үй","House"],["Дос","Friend"],["Күн","Sun"],["Қала","City"],["Ана","Mother"],["Өнер","Art"],["Жол","Road"]];
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
    "Түсіндім, соны қосамын. Бәрі дайын, «Кодқа өту» батырмасын басуға болады.",
  ];
  const COLORS = [["қызғылт", "#ff375f"], ["қызыл", "#ff453a"], ["жасыл", "#30d158"], ["күлгін", "#bf5af2"], ["сары", "#ffd60a"], ["оранж", "#ff9f0a"], ["көк", "#0a84ff"]];

  let n = 0, playing = false;
  const replayIdx = {};
  const D = {
    active: (() => { try { return localStorage.getItem("qwq.demo") === "1"; } catch (e) { return false; } })(),
    /** Ішкі (қолмен жазылған) сценарий ойнай ма: жазба болса — жоқ, демо нақты жүрістей жүреді (толық тексеріс, сұрақтар, жақсарту) */
    mock: () => D.active && !(window.QWQ_RECORDING && window.QWQ_RECORDING.code && window.QWQ_RECORDING.code.length),

    /** Сұрау түрін анықтау (жазу мен ойнату үшін ортақ) */
    kind(m, o) {
      if (/JSON пішімінде/.test(m)) return "idea";
      if (/әзірлеу жоспарын/.test(m)) return "plan";
      if (o.web) return "info";
      if (/ТҮСІНДІРУ ЖАУАП ФОРМАТЫ/.test(m)) return "explain";
      if (/Әр функция толық жасалған ба/.test(m)) return "review";
      if (/Пайдаланушы өтініші/.test(m)) return "edit";
      if (/сапа тізімімен/.test(m)) return "improve";
      if (/"find"/.test(m)) return "patch";
      if (/ақаулар табылды/.test(m)) return "fixjs";
      if (/ЖАУАП ФОРМАТЫ/.test(m)) return "code";
      if (/толық коды/.test(m)) return "tweak";
      return "chat";
    },

    /** Нақты іске қосуды жазып алу: localStorage "qwq.rec" = 1 болғанда әр жауап сақталады */
    record(o, r, ms) {
      try {
        if (localStorage.getItem("qwq.rec") !== "1") return;
        const rec = JSON.parse(localStorage.getItem("qwq.rec.data") || "{}");
        const k = D.kind(o.message || "", o);
        (rec[k] = rec[k] || []).push({ answer: r.answer, sources: r.sources || [], ms: Math.round(ms) });
        localStorage.setItem("qwq.rec.data", JSON.stringify(rec));
      } catch (e) {}
    },
    startRecording() { try { localStorage.setItem("qwq.rec", "1"); localStorage.removeItem("qwq.rec.data"); } catch (e) {} },
    /** Жазбаны js/demo-recording.js файлы ретінде жүктеп алу */
    exportRecording() {
      let d = "{}"; try { d = localStorage.getItem("qwq.rec.data") || "{}"; localStorage.setItem("qwq.rec", "0"); } catch (e) {}
      const blob = new Blob([`/* QWQ Builder · нақты іске қосудың жазбасы (демо режимі осыны ойнатады) */
window.QWQ_RECORDING = ${d};
`], { type: "text/javascript" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "demo-recording.js"; a.click();
    },

    async chat(o) {
      const m = o.message || "";
      const kind = D.kind(m, o);
      const recd = window.QWQ_RECORDING && window.QWQ_RECORDING[kind] && window.QWQ_RECORDING[kind].length ? window.QWQ_RECORDING[kind] : null;
      if (recd) {
        const i = (replayIdx[kind] = replayIdx[kind] || 0);
        if (i < recd.length) {
          replayIdx[kind] = i + 1;
          const rr = recd[i];
          await sleep(Math.min(rr.ms * 0.15, 1500) + 300);
          return D.stream(o, rr.answer, rr.sources || [], kind === "idea");
        }
      }
      await sleep(350);
      let ans, srcs = [];
      if (kind === "idea") ans = JSON.stringify(IDEA);
      else if (kind === "plan") ans = PLAN;
      else if (o.web && (() => { try { return localStorage.getItem("qwq.demo.web") === "502"; } catch (e) { return false; } })()) throw new Q.api.QErr("QWQ сервері жауап бермеді (502).", "http", false); // тест: Worker іздеуінің 502 қатесін имитациялау
      else if (o.web) { ans = INFO; srcs = SOURCES; await sleep(1100); }
      else if (kind === "explain") ans = JSON.stringify({ sections: [
        { title: "Құрылым (HTML)", text: "HTML — беттің қаңқасы. Мұнда тақырып, карточка және батырмалар орналасқан.", code: '<button class="btn primary grow" id="yes">Білемін</button>' },
        { title: "Дизайн (CSS)", text: "CSS беттің түсін, өлшемін және жұмсақ бұрыштарын белгілейді.", code: ":root{--accent:#0a84ff}" },
        { title: "Функция: show()", text: "Бұл функция экрандағы сөзді және прогресс жолағын жаңартады.", code: 'function show(){ $("#w").textContent=q[0][0]; }' }] });
      else if (kind === "edit") {
        const ask = (m.match(/өтініші: «([^»]+)»/) || [])[1] || "";
        const col = (COLORS.find((c) => ask.toLowerCase().includes(c[0])) || [0, "#ff375f"])[1];
        ans = JSON.stringify([{ appendCss: ":root{--accent:" + col + ";--accent2:" + col + "}", why: "Акцент түсі өзгертілді" }, { file: "html", find: "Қазақша сөздерді карточкамен үйрен", replace: "Қазақша сөздерді карточкамен жылдам үйрен", why: "Тақырыпшаны нақтылау" }]);
      }
      else if (kind === "improve") ans = "[]";
      else if (kind === "review") ans = '{"ok":true,"problems":[]}';
      else if (kind === "patch") ans = JSON.stringify([{ find: "renderStats();", replace: "" }, { append: "$('#share').addEventListener('click', function(){ toast('Сілтеме көшірілді'); });" }]); // JS қатесі + өлі батырма патчы
      else if (kind === "fixjs") ans = ["```js", JS, "```"].join("\n");                       // JS-ті толық қайта жазу
      else if (kind === "code") ans = ["===HTML===", BODY, "===CSS===", CSS, "===JS===", JS, "renderStats();", "===END==="].join("\n"); // әдейі 1 қатесі бар нұсқа
      else if (kind === "tweak") {
        const ask = (m.match(/«([^»]+)»/) || [])[1] || "";
        const col = (COLORS.find((c) => ask.toLowerCase().includes(c[0])) || [0, "#ff375f"])[1];
        const cur = (m.match(/```html\n([\s\S]*?)\n```\s*$/) || [])[1] || Q.template.build('Сөз жаттықтырғыш', BODY, CSS, JS);
        ans = "```html\n" + cur.replace(/--accent:#[0-9a-fA-F]{3,8}/, "--accent:" + col) + "\n```";
      } else ans = CHAT[Math.min(n++, CHAT.length - 1)];
      return D.stream(Object.assign({}, o, kind === "idea" ? { stream: false } : {}), ans, srcs);
    },

    async stream(o, ans, srcs) {
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
      playing = true; n = 0; for (const k in replayIdx) delete replayIdx[k];
      const live = () => D.active;
      const wait = async (cond, ms = 90000) => { const t = Date.now(); while (live() && !cond() && Date.now() - t < ms) await sleep(150); };
      try {
        S.reset(); Q.chat.renderAll(); Q.code.render(); Q.result.refresh(); Q.go("chat");
        await sleep(700);
        const SC = (window.QWQ_RECORDING && window.QWQ_RECORDING.script) || {};      // жазбадағы сценарий: промпт, сұрақ жауаптары, өзгерту
        const inp = $("#input"), txt = SC.prompt || "Қазақша сөздерді жаттауға арналған қосымша жасағым келеді";
        const tstep = Math.max(1, Math.ceil(txt.length / 90));   // ұзын промпт та ~3 с ішінде теріледі
        for (let i = tstep; i < txt.length + tstep && live(); i += tstep) { inp.value = txt.slice(0, i); inp.dispatchEvent(new Event("input")); await sleep(32); }
        await sleep(300);
        await Q.chat.send(txt);
        await sleep(900);
        // жазбада нұсқа таңдауы болса: сол чипті басамыз (агент таңдауды бүкіл тарихпен жалғастырады)
        if (SC.chip) {
          const ch = [...document.querySelectorAll(".opt-row .qchip")][SC.chip - 1];
          if (ch && live()) { await sleep(900); ch.click(); await sleep(300); await wait(() => !Q.chat.isBusy()); await sleep(1200); }
        }
        const mk = $("#make"); if (!live() || !mk) return; mk.click();
        await wait(() => Q.view === "code" || !!$(".qcard"));
        const qc = $(".qcard");
        if (qc) {
          // нақтылау сұрақтары: жазбадағы жауаптарды бір-бірлеп басамыз, сосын «Код жазуды бастау» (агент өзі іске қосылады)
          await sleep(1200);
          for (const row of qc.querySelectorAll(".q-row")) {
            const want = (SC.picks || {})[row.querySelector(".q-t").textContent];
            const b = [...row.querySelectorAll(".qchip")].find((x) => x.textContent === want);
            if (b && live()) { b.click(); await sleep(700); }
          }
          await sleep(600); const st = qc.querySelector(".q-go .btn"); if (!live() || !st) return; st.click();
          await wait(() => Q.view === "code");
        } else {
          await sleep(900);
          const go = $("#go-agent"); if (!live() || !go) return; go.click();
        }
        await wait(() => S.data.versions.length > 0);
        await sleep(1400); if (!live()) return;
        Q.go("result"); await sleep(1800);
        const tw = $("#tweak"), cmd = SC.tweak || "түсін қызғылт ет";
        for (let i = 1; i <= cmd.length && live(); i++) { tw.value = cmd.slice(0, i); tw.dispatchEvent(new Event("input")); await sleep(45); }
        await sleep(300);
        if (live()) await Q.result.tweak(cmd);
      } finally { playing = false; }
    },
  };
  D.css = CSS;       // турдағы демо бет те осы дизайнмен салынады
  Q.demo = D;
})(window.QWQ);
