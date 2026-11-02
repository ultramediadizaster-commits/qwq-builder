/* QWQ Builder · жасалған қосымшаны жасырын sandbox iframe-де НАҚТЫ іске қосып тексеру:
   JS қателері, әр батырманы басып көру (өлі батырмалар), өңдегіш (handler) бақылау, inline onclick функциялары */
(function (Q) {
  let seq = 0;

  // iframe ішінде орындалады (ES2017). __ID__ орнына тексеру нөмірі қойылады.
  const PROBE = String.raw`(function(){
var I=__ID__,W=window,post=function(t,m){try{parent.postMessage({qwq:I,t:t,m:m},"*")}catch(e){}};
var errs=[],ctx=null,dlg=0,mut=0,lsw=0;
function err(m){errs.push({m:String(m).slice(0,260),ctx:ctx})}
W.addEventListener("error",function(e){err((e.message||"Қате")+(e.lineno?" (жол "+e.lineno+")":""))});
W.addEventListener("unhandledrejection",function(e){var r=e.reason;err("Promise: "+(r&&r.message||r))});
var ce=console.error;console.error=function(){err("console.error: "+[].slice.call(arguments).join(" "));try{ce.apply(console,arguments)}catch(x){}};
W.alert=function(){dlg++};W.confirm=function(){dlg++;return true};W.prompt=function(){dlg++;return "Тест"};W.open=function(){dlg++;return null};
/* өңдегіштерді бақылау */
var L=new WeakMap(),add=EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener=function(t,f,o){
  try{if(this!==document&&this!==W&&this!==document.body&&this!==document.documentElement){var s=L.get(this)||{};s[t]=(s[t]||0)+1;L.set(this,s)}}catch(e){}
  return add.call(this,t,f,o)};
function own(n){var s=L.get(n);return !!(s&&(s.click||s.pointerdown||s.mousedown||s.pointerup||s.mouseup||s.touchstart||s.touchend||s.submit))}
function hasHandler(el){
  if(el.onclick||el.getAttribute("onclick"))return true;
  if(el.hasAttribute("data-go")||el.hasAttribute("data-open")||el.hasAttribute("data-close"))return true;
  if(own(el))return true;
  var f=el.form;if(f&&(el.type==="submit"||(el.tagName==="BUTTON"&&el.type!=="button"))&&(own(f)||f.onsubmit))return true;
  for(var p=el.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){if(own(p)||p.onclick)return true}
  return false}
var SEL='button,[onclick],a[href],[role=button],input[type=button],input[type=submit],input[type=reset],[data-go],[data-open],[data-close],[class~=btn],[class~=tab],[class~=chip],[class~=switch],[class~=toggle]';
function visible(el){
  if(el.disabled)return false;
  var r=el.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;
  var s=getComputedStyle(el);if(s.visibility==="hidden"||s.display==="none"||s.pointerEvents==="none")return false;
  return true}   // opacity тексерілмейді: көрінбейтін iframe-де CSS анимациясы бірінші кадрда (opacity:0) қатып тұрады
function actionable(el){
  if(el.tagName==="A"){var h=el.getAttribute("href")||"";if(!(h.charAt(0)==="#"||/^javascript:/i.test(h)))return false}
  if(el.tagName==="INPUT"&&!/^(button|submit|reset)$/i.test(el.type))return false;
  if(el.tagName==="LABEL"||el.tagName==="OPTION")return false;
  return true}
function isCurrent(el){
  var c=el.classList;
  if(c&&(c.contains("on")||c.contains("active")||c.contains("selected")||c.contains("current")))return true;
  if(el.getAttribute("aria-selected")==="true"||el.getAttribute("aria-current")||el.getAttribute("aria-pressed")==="true")return true;
  var g=el.getAttribute&&el.getAttribute("data-go");if(g){var t=document.getElementById(g);if(t&&t.classList.contains("on"))return true}
  return false}
function label(el){var t=(el.getAttribute("aria-label")||el.value||el.textContent||el.title||"").replace(/\s+/g," ").trim().slice(0,28);return t||el.id||el.className||el.tagName.toLowerCase()}
function sel(el){return el.id?el.tagName.toLowerCase()+"#"+el.id:el.tagName.toLowerCase()+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\s+/)[0]:"")}
function sleep(){return new Promise(function(r){var n=0,c=new MessageChannel();c.port1.onmessage=function(){if(++n>=4){r()}else c.port2.postMessage(0)};c.port2.postMessage(0)})}   // таймер емес: көрінбейтін iframe-де таймерлер баяулайды
function fire(el,t){el.dispatchEvent(new Event(t,{bubbles:true}))}
function fill(){
  [].forEach.call(document.querySelectorAll("input,textarea,select"),function(el){
    try{if(!visible(el)||el.disabled)return;var t=(el.type||"").toLowerCase();
      if(el.tagName==="SELECT"){if(el.selectedIndex<1&&el.options.length>1){el.selectedIndex=1;fire(el,"input");fire(el,"change")}return}
      if(t==="checkbox"||t==="radio"||t==="button"||t==="submit"||t==="reset"||t==="file"||t==="hidden")return;
      if(el.value!=="")return;
      el.value=t==="number"||t==="range"?"5":t==="date"?new Date().toISOString().slice(0,10):t==="time"?"12:00":t==="email"?"test@mail.kz":t==="url"?"https://example.kz":t==="tel"?"87001234567":"Тест 123";
      fire(el,"input");fire(el,"change")}catch(e){err("fill: "+e.message)}})}

function staticIssues(){
  var out=[];
  [].forEach.call(document.querySelectorAll("[onclick],[onchange],[oninput],[onsubmit]"),function(el){
    ["onclick","onchange","oninput","onsubmit"].forEach(function(a){
      var v=el.getAttribute(a);if(!v)return;
      var m=v.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)||[];
      m.forEach(function(x){var n=x.replace(/\s*\($/,"");if(/^(if|for|while|return|function|alert|confirm|prompt|this|event|go|toast|setTimeout|parseInt|parseFloat)$/.test(n))return;
        var o=W,ok=true;n.split(".").forEach(function(k){if(o==null||!(k in Object(o))){ok=false}else o=o[k]});
        if(!ok||typeof o!=="function")out.push("Функция жоқ: «"+label(el)+"» батырмасындағы "+a+"=\""+n+"()\" — бұл функция глобал емес немесе анықталмаған")})})});
  [].forEach.call(document.querySelectorAll("[data-go]"),function(el){if(!document.getElementById(el.dataset.go))out.push("«"+label(el)+"» батырмасы data-go=\""+el.dataset.go+"\" экранына апарады, бірақ ондай id жоқ")});
  [].forEach.call(document.querySelectorAll("[data-open]"),function(el){if(!document.getElementById(el.dataset.open))out.push("«"+label(el)+"» батырмасы data-open=\""+el.dataset.open+"\" терезесін ашады, бірақ ондай id жоқ")});
  return out}

async function main(){
  var t0=Date.now(),dead=[],btns=[],clicked=0,nohandler=0,tested=new WeakSet();
  var stat=staticIssues();
  try{new MutationObserver(function(r){mut+=r.length}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true})}catch(e){}
  try{var ls=W.localStorage;["setItem","removeItem","clear"].forEach(function(k){var f=ls[k];ls[k]=function(){lsw++;return f.apply(ls,arguments)}})}catch(e){}
  W.addEventListener("submit",function(e){if(!e.defaultPrevented)e.preventDefault()});
  function nextEl(){var all=document.querySelectorAll(SEL);for(var i=0;i<all.length;i++){var el=all[i];if(!tested.has(el)&&actionable(el)&&visible(el))return el}return null}
  for(var wv=0;wv<30&&!(W.innerWidth>0&&document.body&&document.body.getBoundingClientRect().height>0);wv++)await new Promise(function(r){setTimeout(r,100)});   // iframe өлшемі әлі 0 болса, күтеміз
  var info={text:document.body?(document.body.innerText||"").trim().length:0,kids:document.body?document.body.children.length:0,act:document.querySelectorAll(SEL).length};
  for(var n=0;n<70&&Date.now()-t0<__BUDGET__;n++){
    var el=nextEl();if(!el)break;
    tested.add(el);
    if(isCurrent(el))continue;   // ағымдағы (белсенді) қойынды қайта басу — заңды түрде ештеңе өзгертпейді
    fill();
    var hh=hasHandler(el);if(!hh)nohandler++;
    ctx=label(el);
    var m0=mut,l0=lsw,d0=dlg,e0=errs.length,h0=location.hash;
    try{el.click()}catch(e){err("click: "+e.message)}
    await sleep(__WAIT__);
    var eff=mut>m0||lsw>l0||dlg>d0||location.hash!==h0;
    var bad=errs.length>e0;
    if(!eff&&!bad)dead.push({label:label(el),sel:sel(el),handler:hh});
    btns.push({l:label(el),ok:eff&&!bad,n:bad?"қате":!eff?"әрекет жоқ":""});
    ctx=null;clicked++}
  post("r",JSON.stringify({errs:errs,dead:dead,stat:stat,clicked:clicked,nohandler:nohandler,info:info,btns:btns}))}
function start(){main().catch(function(e){err("тексеру: "+e.message);post("r",JSON.stringify({errs:errs,dead:[],stat:[],clicked:0,nohandler:0,info:null}))})}
if(document.readyState==="complete")setTimeout(start,350);else W.addEventListener("load",function(){setTimeout(start,350)});
})()`;

  // sandbox (allow-same-origin жоқ) ішінде localStorage қате шығарады: жадыдағы алмастырғыш
  const SHIM = `<script>(function(){try{localStorage.getItem("x");return}catch(e){}function mk(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}try{Object.defineProperty(window,"localStorage",{value:mk(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true})}catch(e){}})()<\/script>`;

  function withHead(html, p) {
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + p);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + p + "</head>");
    return p + html;
  }
  /** iframe-де көрсету үшін: localStorage алмастырғышы қосылған HTML (файлдың өзі өзгермейді) */
  const preview = (html) => withHead(html, SHIM);

  /**
   * run(html) → Promise<{errors, dead, stat, issues, clicked, nohandler}>
   * issues — түзетуге жіберілетін бірыңғай, түсінікті тізім (қазақша)
   */
  async function run(html) {
    const r = await run1(html);
    // батырмалар бар, бірақ біреуі де басылмаса — iframe өлшемі дайын болмаған шығар: бір рет қайталаймыз
    if (r.act > 1 && r.clicked === 0) { const r2 = await run1(html); if (r2.clicked > 0) return r2; }
    return r;
  }
  function run1(html) {
    const demo = Q.demo && Q.demo.active;
    const budget = demo ? 2500 : 7000, wait = demo ? 60 : 110, limit = budget + (demo ? 2500 : 6000);
    return new Promise((resolve) => {
      const id = ++seq;
      let res = null, finished = false;
      const f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts allow-forms");   // allow-same-origin жоқ: біздің localStorage-қа қол жетпейді
      f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
      f.style.cssText = "position:fixed;left:0;top:0;width:390px;height:800px;border:0;opacity:.001;pointer-events:none;z-index:-1";
      const finish = () => {
        if (finished) return; finished = true;
        removeEventListener("message", on); clearTimeout(timer); f.remove();
        const errors = [], seen = new Set();
        ((res && res.errs) || []).forEach((e) => { const m = e.m + (e.ctx ? ` («${e.ctx}» басқанда)` : ""); if (!seen.has(e.m)) { seen.add(e.m); errors.push(m); } });
        const dead = (res && res.dead) || [], stat = (res && res.stat) || [];
        const issues = [];
        errors.slice(0, 5).forEach((m) => issues.push("JS қате: " + m));
        dead.slice(0, 10).forEach((d) => issues.push(`Өлі батырма: «${d.label}» (${d.sel}) — басқанда ештеңе өзгермейді${d.handler ? " (өңдегіш бар, бірақ әрекет жоқ)" : " (өңдегіш тағылмаған)"}`));
        stat.slice(0, 5).forEach((m) => issues.push(m));
        if (!/<\/html>\s*$/i.test(html.trim())) issues.push("Код </html> тегімен аяқталмаған");
        if (!res) issues.push("Бет жүктелмеді немесе тексеру уақыты біттi");
        else if (res.info && !res.info.text && !res.info.kids) issues.push("Бет бос");
        else if (res.info && !res.info.act) issues.push("Басатын батырма немесе өріс жоқ");
        resolve({ errors, dead, stat, issues, clicked: res ? res.clicked : 0, act: res && res.info ? res.info.act : 0, nohandler: res ? res.nohandler : 0, btns: (res && res.btns) || [] });
      };
      const on = (e) => {
        if (e.source !== f.contentWindow || !e.data || e.data.qwq !== id || e.data.t !== "r") return;
        try { res = JSON.parse(e.data.m); } catch (x) {}
        finish();
      };
      const timer = setTimeout(finish, limit);
      addEventListener("message", on);
      const probe = "<script>" + PROBE.replace("__ID__", id).replace("__BUDGET__", budget).replace("__WAIT__", wait) + "<\/script>";
      f.srcdoc = withHead(html, SHIM + probe);
      document.body.appendChild(f);
    });
  }

  /* ---------- экрандардың шағын суреттері: sandbox iframe-дің ІШІНДЕ DOM → SVG foreignObject → canvas.
     html2canvas қолданылмады: ол өз iframe-ін ашады, ал opaque-origin sandbox оған рұқсат бермейді ---------- */
  const SHOTS = String.raw`(function(){
var I=__ID__,W=window,post=function(t,m){try{parent.postMessage({qwq:I,t:t,m:m},"*")}catch(e){}};
function sleep(ms){return new Promise(function(r){var c=new MessageChannel(),n=0;c.port1.onmessage=function(){if(++n>=ms)r();else c.port2.postMessage(0)};c.port2.postMessage(0)})}
function label(el){return(el.getAttribute("aria-label")||el.textContent||el.id||"Экран").replace(/\s+/g," ").trim().slice(0,22)}
function css(){var t="";[].forEach.call(document.styleSheets,function(s){try{[].forEach.call(s.cssRules,function(r){t+=r.cssText+"\n"})}catch(e){}});return t}
function snap(){return new Promise(function(res,rej){
  var w=390,h=700,root=document.documentElement.cloneNode(true);
  [].forEach.call(root.querySelectorAll("script,iframe"),function(n){n.remove()});
  var inputs=document.querySelectorAll("input,textarea"),ci=root.querySelectorAll("input,textarea");
  [].forEach.call(inputs,function(el,i){if(ci[i]){ci[i].setAttribute("value",el.value);if(el.tagName==="TEXTAREA")ci[i].textContent=el.value}});
  var st=document.createElement("style");st.textContent=css()+"html,body{margin:0;width:"+w+"px;min-height:"+h+"px}*{animation:none!important;transition:none!important}";
  root.querySelector("head").appendChild(st);
  var xml=new XMLSerializer().serializeToString(root);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><foreignObject width="100%" height="100%">'+xml+'</foreignObject></svg>';
  var img=new Image();img.onload=function(){try{var c=document.createElement("canvas");c.width=w*.45;c.height=h*.45;var x=c.getContext("2d");x.fillStyle=getComputedStyle(document.body).backgroundColor||"#000";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.7))}catch(e){rej(e)}};
  img.onerror=function(){rej(new Error("svg"))};
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)})}
async function main(){
  var out=[];
  async function shot(name){try{out.push({n:name,u:await snap()})}catch(e){post("d",String(e&&e.message||e))}}
  await shot("Басты экран");
  var tabs=[].filter.call(document.querySelectorAll("[data-go]"),function(el){var t=document.getElementById(el.dataset.go);return t&&!t.classList.contains("on")}).slice(0,3);
  for(var i=0;i<tabs.length&&out.length<4;i++){try{tabs[i].click()}catch(e){}await sleep(40);await shot(label(tabs[i]))}
  post("s",JSON.stringify(out))}
if(document.readyState==="complete")setTimeout(function(){main().catch(function(){post("s","[]")})},300);else W.addEventListener("load",function(){setTimeout(function(){main().catch(function(){post("s","[]")})},300)});
})()`;
  /** shots(html) → Promise<[{n, u}]> (суретті алу мүмкін болмаса — бос тізім) */
  function shots(html) {
    return new Promise((resolve) => {
      const id = ++seq; let done = false;
      const f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts allow-forms"); f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
      f.style.cssText = "position:fixed;left:0;top:0;width:390px;height:800px;border:0;opacity:.001;pointer-events:none;z-index:-1";
      const end = (v) => { if (done) return; done = true; removeEventListener("message", on); clearTimeout(timer); f.remove(); resolve(v); };
      const on = (e) => {
        if (e.source !== f.contentWindow || !e.data || e.data.qwq !== id || e.data.t !== "s") return;
        let v = []; try { v = JSON.parse(e.data.m); } catch (x) {}
        end(v);
      };
      const timer = setTimeout(() => end([]), 15000);
      addEventListener("message", on);
      f.srcdoc = withHead(html, SHIM + "<script>" + SHOTS.replace("__ID__", id) + "<\/script>");
      document.body.appendChild(f);
    });
  }

  Q.check = { run, preview, shots };
})(window.QWQ);
