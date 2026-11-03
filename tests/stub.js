/* QWQ Builder · конвейер тесті: нақты API орнына қолмен жазылған «модель жауаптарын» береді (mock).
   Қолдану (ашық бетте): script ретінде жүктеп, `await QWQ_TEST.run("game"|"landing"|"tool")`. Нақты API шақырылмайды. */
(function () {
  const Q = window.QWQ;
  const calls = [];

  const GAME_JS = `var ship,bullets,foes,spawn,fire;
Game.run({title:"Ғарыш қорғанысы",hint:"Жұлдыздар шапқыншыларын атып түсір. ← → қозғал, бос орын — ату.",controls:["left","right","a"],levelStep:120,
init:function(G){ship={x:G.W/2,y:G.H-110,w:44,h:26,v:0};bullets=[];foes=[];spawn=0;fire=0;G.stars=[];for(var i=0;i<60;i++)G.stars.push({x:G.rand(0,G.W),y:G.rand(0,G.H),s:G.rand(.4,1.6)})},
update:function(dt,G){
 var sp=330;ship.v=0;if(Input.left)ship.v=-sp;if(Input.right)ship.v=sp;if(Input.p.down&&!G.touch){ship.x+=(Input.p.x-ship.x)*Math.min(1,dt*12)}ship.x=G.clamp(ship.x+ship.v*dt,24,G.W-24);
 fire-=dt;if((Input.a||Input.p.down)&&fire<=0){bullets.push({x:ship.x-3,y:ship.y-10,w:6,h:14});fire=.22;sfx("shoot")}
 spawn-=dt;if(spawn<=0){foes.push({x:G.rand(30,G.W-30),y:-30,w:34,h:28,v:70+G.level*22+G.rand(0,40),ph:G.rand(0,6)});spawn=Math.max(.35,1.1-G.level*.08)}
 bullets.forEach(function(b){b.y-=520*dt});bullets=bullets.filter(function(b){return b.y>-20});
 foes.forEach(function(f){f.y+=f.v*dt;f.x+=Math.sin(G.time*2+f.ph)*40*dt});
 for(var i=foes.length-1;i>=0;i--){var f=foes[i];
  for(var j=bullets.length-1;j>=0;j--){if(G.hit(f,bullets[j])){foes.splice(i,1);bullets.splice(j,1);G.add(10);sfx("pop");break}}}
 foes=foes.filter(function(f){return f.y<G.H+40});
 for(var k=0;k<foes.length;k++){if(G.hit({x:ship.x-20,y:ship.y,w:40,h:24},foes[k])||foes[k].y>G.H-40){sfx("hit");G.over("Кеме жойылды");return}}
 G.stars.forEach(function(s){s.y+=s.s*40*dt;if(s.y>G.H){s.y=0;s.x=G.rand(0,G.W)}})},
draw:function(c,W,H,G){var g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#02030a");g.addColorStop(1,"#101a46");c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle="#fff";(G.stars||[]).forEach(function(s){c.globalAlpha=.4+s.s/3;c.fillRect(s.x,s.y,s.s,s.s)});c.globalAlpha=1;
 c.fillStyle="#7aa2ff";c.beginPath();c.moveTo(ship.x,ship.y-14);c.lineTo(ship.x+22,ship.y+14);c.lineTo(ship.x,ship.y+7);c.lineTo(ship.x-22,ship.y+14);c.closePath();c.fill();
 c.fillStyle="#ffd166";bullets.forEach(function(b){c.fillRect(b.x,b.y,b.w,b.h)});
 foes.forEach(function(f){c.fillStyle="#ff5d73";c.beginPath();c.ellipse(f.x+f.w/2,f.y+f.h/2,f.w/2,f.h/2,0,0,7);c.fill();c.fillStyle="#fff";c.fillRect(f.x+8,f.y+9,5,5);c.fillRect(f.x+21,f.y+9,5,5)})}});`;

  const LAND_BODY = `<header class="top" style="text-align:center;padding:30px 0 10px"><p class="muted">Алматы · 2019 жылдан</p><h1 style="font-size:40px">«Таң» <span class="grad">кофехана</span></h1><p class="muted">Қолдан қуырылған кофе мен таңғы ас</p><div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" id="cta">Үстел брондау</button><button class="btn" id="menu-btn">Мәзірді көру</button></div></header>
<section class="screen on" id="home">
<div class="grid2"><div class="stat"><b>12</b><span>кофе түрі</span></div><div class="stat"><b>4.9</b><span>орташа баға</span></div></div>
<h2 style="margin-top:22px">Мәзір</h2><div class="chips" id="cats"><button class="chip on" data-c="all">Бәрі</button><button class="chip" data-c="coffee">Кофе</button><button class="chip" data-c="food">Ас</button></div>
<div class="list" id="menu"></div>
<h2 style="margin-top:22px">Қонақтар пікірі</h2><div class="card"><p>«Ең жақсы флэт уайт қалада!»</p><span class="muted">— Айгүл</span></div><div class="card"><p>«Тыныш, жайлы, WiFi жылдам.»</p><span class="muted">— Ержан</span></div>
<h2 style="margin-top:22px" id="book">Брондау</h2>
<form class="card" id="bf"><div class="field"><label>Атыңыз</label><input class="input" id="nm" placeholder="Аты-жөніңіз"></div><div class="field"><label>Қонақ саны</label><select class="select" id="gs"><option>1</option><option>2</option><option>4</option><option>6</option></select></div><button class="btn primary block" id="bsend" type="submit">Жіберу</button><p class="muted" id="bmsg" style="margin-top:10px"></p></form>
<p class="muted" style="text-align:center">© Таң кофеханасы</p></section>`;
  const LAND_JS = `var M=[{n:"Флэт уайт",p:1600,c:"coffee"},{n:"Капучино",p:1500,c:"coffee"},{n:"Эспрессо",p:1100,c:"coffee"},{n:"Круассан",p:1400,c:"food"},{n:"Авокадо тосты",p:2900,c:"food"}];
var cat="all";function draw(){$("#menu").innerHTML=M.filter(function(x){return cat==="all"||x.c===cat}).map(function(x){return '<div class="item"><div class="grow"><b>'+esc(x.n)+'</b></div><span class="badge ok">'+fmt.money(x.p)+'</span></div>'}).join("")}
$$("#cats .chip").forEach(function(b){b.addEventListener("click",function(){cat=b.dataset.c;$$("#cats .chip").forEach(function(x){x.classList.toggle("on",x===b)});draw()})});
$("#cta").addEventListener("click",function(){$("#book").scrollIntoView({behavior:"smooth"});$("#nm").focus()});
$("#menu-btn").addEventListener("click",function(){$("#cats").scrollIntoView({behavior:"smooth"});toast("Мәзір төменде")});
$("#bf").addEventListener("submit",function(e){e.preventDefault();var n=$("#nm").value.trim();if(!n){$("#bmsg").textContent="Атыңызды жазыңыз";toast("Атын жазыңыз");return}store.set("book",{n:n,g:$("#gs").value,t:Date.now()});$("#bmsg").textContent="Рахмет, "+n+"! Брондау қабылданды.";toast("Брондалды ✓")});
$("#bsend").addEventListener("click",function(){});
draw();`;

  const TOOL_BAD_BODY = `<div class="calc"></div>`;
  const TOOL_BAD_JS = `document.querySelector(".calc").innerHTML = ""; undefinedFn();`;
  const TOOL_BODY = `<header class="top"><h1>Ипотека <span class="grad">калькуляторы</span></h1><p class="muted">Ай сайынғы төлемді есепте</p></header>
<section class="screen on" id="calc"><div class="card"><div class="field"><label>Пәтер бағасы (₸)</label><input class="input" id="price" type="number" value="30000000"></div><div class="field"><label>Алғашқы жарна (%)</label><input class="input" id="down" type="number" value="20"></div><div class="field"><label>Мерзім (жыл)</label><input class="input" id="years" type="number" value="15"></div><div class="field"><label>Жылдық пайыз (%)</label><input class="input" id="rate" type="number" value="8"></div><button class="btn primary block" id="calcbtn">Есептеу</button></div>
<div class="card glow" id="res" hidden><div class="muted">Ай сайынғы төлем</div><h1 id="pay">—</h1><div class="grid2"><div class="stat"><b id="tot">—</b><span>жалпы төлем</span></div><div class="stat"><b id="over">—</b><span>артық төлем</span></div></div><button class="btn block" id="savebtn" style="margin-top:12px">Тарихқа сақтау</button></div></section>
<section class="screen" id="hist"><div class="card"><h2>Тарих</h2><div class="list" id="hl"></div><p class="empty" id="he">Әзірге есеп жоқ</p><button class="btn danger block" id="clr" style="margin-top:10px">Тазалау</button></div></section>
<nav class="tabbar"><button class="tab on" data-go="calc">Есеп</button><button class="tab" data-go="hist">Тарих</button></nav>`;
  const TOOL_JS = `var last=null,H=store.get("h",[]);
function rh(){$("#he").hidden=H.length>0;$("#hl").innerHTML=H.map(function(x){return '<div class="item"><div class="grow"><b>'+esc(fmt.money(x.pay))+'/ай</b><span>'+esc(fmt.money(x.price))+' · '+esc(x.y)+' жыл · '+esc(x.r)+'%</span></div></div>'}).join("")}
$("#calcbtn").addEventListener("click",function(){var p=+$("#price").value,d=+$("#down").value,y=+$("#years").value,r=+$("#rate").value;if(!(p>0)||!(y>0)||d<0||d>=100){toast("Мәндерді тексеріңіз");return}
var L=p*(1-d/100),m=y*12,i=r/1200,pay=i?L*i/(1-Math.pow(1+i,-m)):L/m;last={pay:pay,price:p,y:y,r:r};$("#res").hidden=false;$("#pay").textContent=fmt.money(Math.round(pay));$("#tot").textContent=fmt.money(Math.round(pay*m));$("#over").textContent=fmt.money(Math.round(pay*m-L))});
$("#savebtn").addEventListener("click",function(){if(!last)return;H.unshift(last);store.set("h",H.slice(0,20));rh();toast("Сақталды")});
$("#clr").addEventListener("click",function(){H=[];store.set("h",H);rh()});rh();`;

  const FIX = {
    game: { type: "game", title: "Ғарыш қорғанысы", resp: () => `===HTML===\n<!-- ойын -->\n===CSS===\n===JS===\n${GAME_JS}\n===END===` },
    landing: { type: "landing", title: "«Таң» кофеханасы", resp: () => `===HTML===\n${LAND_BODY}\n===CSS===\n===JS===\n${LAND_JS}\n===END===` },
    tool: { type: "tool", title: "Ипотека калькуляторы", resp: (n) => n === 0 ? `===HTML===\n${TOOL_BAD_BODY}\n===CSS===\n===JS===\n${TOOL_BAD_JS}\n===END===` : `===HTML===\n${TOOL_BODY}\n===CSS===\n===JS===\n${TOOL_JS}\n===END===` },
  };
  const IDEAS = {
    game: { title: "Ғарыш қорғанысы", summary: "Ғарыштағы шапқыншыларды атып түсіретін ойын.", prompt: "Ғарыш шутері ойынын жаса: кеме төменде, жау жоғарыдан түседі, атып түсіру, ұпай, деңгейлер." },
    landing: { title: "«Таң» кофеханасы", summary: "Кофеханаға арналған лендинг бет.", prompt: "Кофехана үшін лендинг: мәзір, пікірлер, брондау формасы." },
    tool: { title: "Ипотека калькуляторы", summary: "Ай сайынғы ипотека төлемін есептейтін құрал.", prompt: "Ипотека калькуляторы: баға, жарна, мерзім, пайыз, есептеу, тарих." },
  };

  let codeN = 0, cur = null;
  const real = Q.api.chat;
  Q.api.chat = async function (o) {
    const m = o.message || "";
    calls.push((o.web ? "web" : /әзірлеу жоспарын/.test(m) ? "plan" : /АҚАУЛАР ТАБЫЛДЫ/.test(m) ? "repair" : /сапа тізімімен/.test(m) ? "improve" : /Әр функция толық/.test(m) ? "review" : /ЖАУАП ФОРМАТЫ/.test(m) ? "code" : "other"));
    await new Promise((r) => setTimeout(r, 40));
    let ans = "[]";
    if (o.web) ans = "- Нақты мәлімет\n- Дереккөз";
    else if (/әзірлеу жоспарын/.test(m)) ans = "## Мақсат\nӘзірлеу жоспары.\n\n## Функциялар\n- Негізгі\n";
    else if (/АҚАУЛАР ТАБЫЛДЫ/.test(m)) { ans = cur.resp(1); }
    else if (/сапа тізімімен/.test(m)) ans = "[]";
    else if (/Әр функция толық/.test(m)) ans = '{"ok":true,"problems":[]}';
    else if (/ЖАУАП ФОРМАТЫ/.test(m)) { ans = cur.resp(codeN++); }
    else if (/Пайдаланушы өтініші/.test(m)) {
      ans = JSON.stringify([{ appendCss: ":root{--accent:#2f7dff;--accent2:#2f7dff}", why: "Түс көкке өзгертілді" }]);
    }
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
      return { type: D.meta && D.meta.type, style: D.meta && D.meta.style, calls: calls.slice(), left: (D.report && D.report.left) || [], found: (D.report && D.report.found) || [], hasHtml: !!D.files.html, versions: D.versions.length };
    },
  };
})();
