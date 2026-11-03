/* QWQ Builder · ОЙЫН қозғалтқышы: шаблон күйлерді (мәзір → ойын → пауза → бітті), циклді, енгізуді (пернетақта + сенсор),
   ұпай/рекорд/деңгей мен WebAudio дыбыстарын береді. AI тек механиканы (init/update/draw) жазады. */
(function (Q) {
  const MARKUP = String.raw`<canvas id="c" aria-label="Ойын алаңы"></canvas>
<div id="hud"><div><small>ҰПАЙ</small><b id="sc">0</b></div><div><small>РЕКОРД</small><b id="hi">0</b></div><div><small>ДЕҢГЕЙ</small><b id="lv">1</b></div><button id="pz" type="button" aria-label="Пауза">❚❚</button></div>
<div class="ov on" id="ov-menu"><div class="pn"><h1 id="g-title">Ойын</h1><p class="muted" id="g-hint"></p><p class="muted" id="g-keys"></p><button class="btn primary" id="b-start" type="button">Бастау</button></div></div>
<div class="ov" id="ov-pause"><div class="pn"><h2>Пауза</h2><button class="btn primary" id="b-resume" type="button">Жалғастыру</button><button class="btn" id="b-restart" type="button">Қайта бастау</button></div></div>
<div class="ov" id="ov-over"><div class="pn"><h2 id="g-over-t">Ойын бітті</h2><p id="g-final" class="muted"></p><button class="btn primary" id="b-again" type="button">Қайта ойнау</button><button class="btn" id="b-menu" type="button">Мәзір</button></div></div>
<div id="touch" aria-hidden="true"></div>`;

  const CSS = String.raw`body{padding:0!important;overflow:hidden;position:fixed;inset:0;touch-action:none;user-select:none;-webkit-user-select:none}
.gameroot{position:fixed;inset:0}
#c{position:absolute;inset:0;width:100%;height:100%;display:block;background:transparent}
#hud{position:absolute;left:0;right:0;top:0;display:flex;gap:10px;align-items:center;padding:max(10px,env(safe-area-inset-top)) 12px 10px;pointer-events:none;z-index:5}
#hud div{padding:6px 12px;border-radius:var(--r-sm);background:var(--bar);border:1px solid var(--line);min-width:62px;text-align:center}
#hud small{display:block;font-size:10px;letter-spacing:.08em;color:var(--muted)}#hud b{font-size:18px;font-variant-numeric:tabular-nums}
#pz{margin-left:auto;pointer-events:auto;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bar);color:var(--text);font-size:14px;cursor:pointer}
.ov{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .3s}
.ov.on{opacity:1;pointer-events:auto}
.ov .pn{display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;padding:26px 24px;border-radius:var(--r);background:var(--sheet);border:1px solid var(--line);box-shadow:var(--shadow);max-width:min(88vw,380px);animation:in .4s var(--ease)}
.ov .pn .btn{min-width:200px}.ov .pn p{margin:0}
#touch{position:absolute;left:0;right:0;bottom:0;z-index:6;display:none;justify-content:space-between;align-items:flex-end;padding:12px 14px max(18px,env(safe-area-inset-bottom));pointer-events:none}
#touch.on{display:flex}#touch .grp{display:flex;gap:10px;pointer-events:auto}
#touch button{width:68px;height:68px;border-radius:50%;border:1px solid var(--line);background:var(--bar);color:var(--text);font-size:24px;box-shadow:var(--shadow);touch-action:none;opacity:.88}
#touch button.dn{transform:scale(.92);background:var(--surface2)}`;

  const ENGINE = String.raw`(function(){
var W=window,cv=document.getElementById("c"),ctx=cv.getContext("2d"),dpr=Math.min(W.devicePixelRatio||1,2);
var KEYMAP={ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",Space:"a",Enter:"a",KeyZ:"a",KeyX:"b",ShiftLeft:"b"};
var Input=W.Input={left:false,right:false,up:false,down:false,a:false,b:false,keys:{},p:{x:0,y:0,down:false},_pr:{}};
Input.pressed=function(n){var v=Input._pr[n];Input._pr[n]=false;return !!v};
function setIn(n,v){if(v&&!Input[n])Input._pr[n]=true;Input[n]=v}
var G=W.Game={state:"menu",score:0,level:1,best:0,time:0,frames:0,W:0,H:0,ctx:ctx,cfg:null,touch:false};
var KEY="app_best_"+(document.title||"game");
try{G.best=+localStorage.getItem(KEY)||0}catch(e){}
function $(i){return document.getElementById(i)}
function hud(){$("sc").textContent=Math.floor(G.score);$("hi").textContent=Math.floor(G.best);$("lv").textContent=G.level}
function resize(){var w=W.innerWidth,h=W.innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);G.W=w;G.H=h;ctx.setTransform(dpr,0,0,dpr,0,0);if(G.cfg&&G.cfg.resize)try{G.cfg.resize(G)}catch(e){console.error(e)}}
W.addEventListener("resize",resize);
function show(id,on){$(id).classList.toggle("on",!!on)}
G.setState=function(s){G.state=s;show("ov-menu",s==="menu");show("ov-pause",s==="pause");show("ov-over",s==="over")};
G.start=function(){G.score=0;G.level=1;G.time=0;for(var k in Input)if(typeof Input[k]==="boolean")Input[k]=false;Input._pr={};hud();try{G.cfg.init(G)}catch(e){console.error(e)}G.setState("play");sfx("click")};
G.pause=function(){if(G.state==="play")G.setState("pause")};
G.resume=function(){if(G.state==="pause"){G.setState("play");last=0}};
G.over=function(msg){if(G.state!=="play")return;if(G.score>G.best){G.best=G.score;try{localStorage.setItem(KEY,String(Math.floor(G.best)))}catch(e){}}hud();$("g-over-t").textContent=msg||"Ойын бітті";$("g-final").textContent="Ұпай: "+Math.floor(G.score)+" · Рекорд: "+Math.floor(G.best);G.setState("over");sfx("lose")};
G.add=function(n){G.score+=n;if(G.score>G.best&&G.state==="play"){G.best=G.score}var lv=1+Math.floor(G.score/(G.cfg.levelStep||100));if(lv>G.level){G.level=lv;sfx("win");if(G.cfg.onLevel)try{G.cfg.onLevel(lv,G)}catch(e){console.error(e)}}hud()};
G.rand=function(a,b){return a+Math.random()*(b-a)};G.clamp=function(v,a,b){return v<a?a:v>b?b:v};
G.hit=function(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y};
G.dist=function(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)};
var AC=null;
function sfx(n){try{if(!AC)AC=new (W.AudioContext||W.webkitAudioContext)();if(AC.state==="suspended")AC.resume();
var P={click:[520,.06,"square",.06],jump:[380,.14,"square",.08,820],coin:[880,.12,"triangle",.09,1320],hit:[160,.18,"sawtooth",.1,70],shoot:[700,.1,"square",.06,200],lose:[300,.5,"sawtooth",.1,60],win:[520,.35,"triangle",.1,1040],pop:[600,.08,"sine",.1,900]}[n]||[440,.1,"sine",.08];
var o=AC.createOscillator(),g=AC.createGain();o.type=P[2];o.frequency.setValueAtTime(P[0],AC.currentTime);if(P[4])o.frequency.exponentialRampToValueAtTime(P[4],AC.currentTime+P[1]);g.gain.setValueAtTime(P[3],AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+P[1]);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+P[1]+.02)}catch(e){}}
W.sfx=sfx;
var last=0,raf=0;
function frame(dt){G.frames++;
if(G.state==="play"&&G.cfg){G.time+=dt;try{G.cfg.update(dt,G)}catch(e){console.error(e);G.setState("over")}}
ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,G.W,G.H);
if(G.cfg){try{G.cfg.draw(ctx,G.W,G.H,G)}catch(e){console.error(e)}}}
function loop(t){raf=requestAnimationFrame(loop);var dt=last?Math.min(.05,(t-last)/1000):0;last=t;frame(dt)}
G.step=function(n,dt){if(!G.cfg)return;for(var i=0;i<(n||1);i++)frame(dt||1/60)};
W.__game={get frames(){return G.frames},get state(){return G.state},get score(){return G.score},get level(){return G.level}};
G.run=function(cfg){G.cfg=cfg;$("g-title").textContent=cfg.title||document.title;$("g-hint").textContent=cfg.hint||"";
var names={left:"←",right:"→",up:"↑",down:"↓",a:"Бос орын",b:"Shift"};var kk=(cfg.controls||[]).map(function(c){return names[c]||c}).join(" ");$("g-keys").textContent=cfg.keysText||(kk?"Басқару: "+kk+" (телефонда — экрандағы батырмалар)":"");
resize();try{cfg.init(G)}catch(e){console.error(e)}hud();buildTouch(cfg.controls||[]);if(!raf)raf=requestAnimationFrame(loop)};
function buildTouch(ctl){var box=$("touch");box.innerHTML="";var coarse=W.matchMedia&&W.matchMedia("(pointer:coarse)").matches||W.innerWidth<700;if(!coarse||!ctl.length)return;
var sym={left:"◀",right:"▶",up:"▲",down:"▼",a:"●",b:"■"},L=document.createElement("div"),R=document.createElement("div");L.className=R.className="grp";
ctl.forEach(function(n){var b=document.createElement("button");b.type="button";b.textContent=sym[n]||n;b.setAttribute("aria-label",n);
function dn(e){e.preventDefault();b.classList.add("dn");setIn(n,true)}function up(e){e.preventDefault();b.classList.remove("dn");setIn(n,false)}
b.addEventListener("pointerdown",dn);b.addEventListener("pointerup",up);b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);
(n==="a"||n==="b"?R:L).appendChild(b)});box.appendChild(L);box.appendChild(R);box.classList.add("on");G.touch=true}
W.addEventListener("keydown",function(e){var n=KEYMAP[e.code];if(n){if(G.state==="play"||e.code==="Enter"&&G.state!=="play"){if(G.state==="play")e.preventDefault()}setIn(n,true);Input.keys[e.code]=true;
if(e.code==="Space"||e.code==="Enter"){if(G.state==="menu")G.start();else if(G.state==="over")G.start()}}
if(e.code==="KeyP"||e.code==="Escape"){G.state==="play"?G.pause():G.resume()}});
W.addEventListener("keyup",function(e){var n=KEYMAP[e.code];if(n){setIn(n,false);Input.keys[e.code]=false}});
function pp(e,d){var r=cv.getBoundingClientRect();Input.p.x=e.clientX-r.left;Input.p.y=e.clientY-r.top;if(d!=null)Input.p.down=d}
cv.addEventListener("pointerdown",function(e){pp(e,true);setIn("a",G.touch?Input.a:true)});cv.addEventListener("pointermove",function(e){pp(e)});
W.addEventListener("pointerup",function(e){Input.p.down=false;if(!G.touch)setIn("a",false)});
document.addEventListener("visibilitychange",function(){if(document.hidden)G.pause()});
$("b-start").onclick=function(){G.start()};$("pz").onclick=function(){G.state==="play"?G.pause():G.resume()};
$("b-resume").onclick=function(){G.resume()};$("b-restart").onclick=function(){G.start()};$("b-again").onclick=function(){G.start()};$("b-menu").onclick=function(){G.setState("menu")};
})();`;

  const GUIDE = String.raw`ОЙЫН ҚОЗҒАЛТҚЫШЫ ДАЙЫН (қайта жазба!). Шаблон толық экранды <canvas id="c">, HUD (ұпай/рекорд/деңгей), мәзір/пауза/бітті экрандарын, пернетақта мен телефон сенсор батырмаларын, рекордты (localStorage) және WebAudio береді.
Сен тек ойын механикасын жазасың: JS соңында МІНДЕТТІ түрде мынаны шақыр:
Game.run({
  title: "Ойын атауы", hint: "қысқа сипаттама / мақсат", controls: ["left","right","up","a"],   // телефонда осылардың батырмасы шығады; ықтимал: left,right,up,down,a,b
  levelStep: 100,                 // әр осыншама ұпайда деңгей артады (қиындық өседі)
  init: function(G){ ... },       // ойын басында күйді құру (G.W, G.H — алаң өлшемі, CSS px)
  update: function(dt,G){ ... },  // dt — секунд. Енгізу: Input.left/right/up/down/a/b (true/false), Input.pressed("a") — бір рет басу, Input.p.x/.y/.down — көрсеткіш/саусақ
  draw: function(ctx,W,H,G){ ... }, // ctx — 2D контекст (әр кадрда тазаланады; фонды өзің сыз)
  onLevel: function(lv,G){ ... }, // міндетті емес: жаңа деңгей
  resize: function(G){ ... }      // міндетті емес
});
Қозғалтқыш функциялары: Game.add(ұпай) (ұпай қосады, деңгейді өсіреді), Game.over("хабар") (ойын бітті), Game.score, Game.level, Game.time, Game.rand(a,b), Game.clamp(v,a,b), Game.hit(a,b) (a,b = {x,y,w,h}), Game.dist(a,b), sfx("click"|"jump"|"coin"|"hit"|"shoot"|"lose"|"win"|"pop") — дыбыс. requestAnimationFrame-ді ӨЗІҢ шақырма: цикл дайын. Ойын басында күйді init-те қалпына келтір (Қайта ойнау init-ті қайта шақырады).
Талаптар: бұл ШАБЛОН емес, нақты механикасы бар ойын (платформер, жарыс, шутер, жұмбақ т.б. — идеяға сай). Ойын кадрлар ауысқанда көрінетін түрде жүріп тұруы керек (қозғалыс, анимация). Қиындық деңгейге қарай өседі. Соқтығысу, ұпай, өмір/жеңіліс шарты болсын. Барлық өлшемдерді W,H-қа қатысты есепте (телефон тік экранында да, компьютерде де жұмыс істесін). Мәтіндер қазақша. Сыртқы сурет/кітапхана жоқ: бәрін canvas-пен сыз (пішіндер, градиент, бөлшектер). Фон мен түстерді CSS айнымалыларынан емес, JS ішінде тұрақты түспен ал (стиль нұсқауындағы палитраға сай).
===HTML=== бөлімінде тек бір жол комментарий жаз (мысалы <!-- ойын -->): HTML дайын. ===CSS=== бос қалуы мүмкін.`;

  Q.gametpl = { MARKUP, CSS, ENGINE, GUIDE };
})(window.QWQ);
