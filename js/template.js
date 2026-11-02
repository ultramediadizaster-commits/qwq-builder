/* QWQ Builder · жасалатын қосымшалардың дайын базалық үлгісі (дизайн + JS көмекшілері).
   AI тек мазмұн (HTML), аздаған CSS және логика (JS) толтырады. */
(function (Q) {
  const BASE = String.raw`<!doctype html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07080d">
<title>{{TITLE}}</title>
<style>
:root{--bg:#07080d;--surface:rgba(255,255,255,.06);--surface2:rgba(255,255,255,.1);--line:rgba(255,255,255,.12);--text:#f4f6fb;--muted:#9aa4b8;--accent:#5aa9ff;--accent2:#a47bff;--ok:#34d399;--warn:#fbbf24;--danger:#fb7185;--r:20px;--r-sm:13px;--shadow:0 14px 40px rgba(0,0,0,.45);--ease:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;background:radial-gradient(60% 36% at 12% 0%,color-mix(in srgb,var(--accent) 24%,transparent),transparent),radial-gradient(50% 32% at 100% 8%,color-mix(in srgb,var(--accent2) 20%,transparent),transparent),var(--bg);background-attachment:fixed;padding-bottom:calc(92px + env(safe-area-inset-bottom))}
.app{max-width:560px;margin:0 auto;padding:max(18px,env(safe-area-inset-top)) 16px 16px}
h1,h2,h3{margin:0 0 8px;letter-spacing:-.02em;line-height:1.2}h1{font-size:28px}h2{font-size:21px}h3{font-size:17px}
p{margin:0 0 12px}.muted{color:var(--muted);font-size:14px}
.grad{background:linear-gradient(100deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.top{margin:6px 0 18px}.top p{margin:0}
.screen{display:none}.screen.on{display:block;animation:in .4s var(--ease)}
@keyframes in{from{opacity:0;transform:translateY(10px)}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:18px;margin-bottom:14px;box-shadow:var(--shadow);backdrop-filter:blur(14px)}
.card.glow{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%,transparent),color-mix(in srgb,var(--accent2) 16%,transparent));border-color:color-mix(in srgb,var(--accent) 40%,var(--line))}
.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.row.between{justify-content:space-between}.grow{flex:1}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:14px}.stat b{display:block;font-size:24px;letter-spacing:-.02em}.stat span{color:var(--muted);font-size:13px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border:1px solid var(--line);border-radius:999px;background:var(--surface2);color:var(--text);font:600 15px/1 inherit;cursor:pointer;transition:transform .35s var(--ease),filter .2s,background .2s}
.btn:hover{filter:brightness(1.15)}.btn:active{transform:scale(.95)}
.btn.primary{border:0;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 8px 24px color-mix(in srgb,var(--accent) 40%,transparent)}
.btn.ghost{background:transparent}.btn.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 45%,transparent)}
.btn.sm{min-height:38px;padding:0 14px;font-size:13px}.btn.icon{width:44px;min-height:44px;padding:0}.btn.block{width:100%}.btn:disabled{opacity:.45;pointer-events:none}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.field label{font-size:13px;font-weight:600;color:var(--muted)}
.input,.select,.textarea{width:100%;min-height:48px;padding:12px 14px;border-radius:var(--r-sm);border:1px solid var(--line);background:rgba(0,0,0,.35);color:var(--text);font:inherit;font-size:16px;outline:0;transition:border-color .2s,box-shadow .2s}
.textarea{min-height:96px;resize:vertical}.input:focus,.select:focus,.textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 28%,transparent)}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px}.chips::-webkit-scrollbar{display:none}
.chip{flex:none;min-height:38px;padding:0 15px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font:600 13px/1 inherit;cursor:pointer;transition:all .25s}
.chip.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent}
.list{display:flex;flex-direction:column;gap:10px}
.item{display:flex;align-items:center;gap:12px;padding:14px;border-radius:var(--r-sm);background:var(--surface);border:1px solid var(--line);animation:in .35s var(--ease)}
.item .grow b{display:block}.item .grow span{color:var(--muted);font-size:13px}.item.done b{text-decoration:line-through;opacity:.55}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:var(--surface2);color:var(--muted)}
.badge.ok{background:color-mix(in srgb,var(--ok) 20%,transparent);color:var(--ok)}.badge.warn{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--warn)}.badge.bad{background:color-mix(in srgb,var(--danger) 20%,transparent);color:var(--danger)}
.progress{height:10px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.progress>i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .6s var(--ease)}
.empty{text-align:center;color:var(--muted);padding:34px 16px}
.switch{position:relative;width:52px;height:30px;border-radius:99px;background:rgba(255,255,255,.15);border:0;cursor:pointer;transition:background .25s}.switch::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .3s var(--ease)}.switch.on{background:var(--ok)}.switch.on::after{transform:translateX(22px)}
.tabbar{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 24px),520px);display:flex;gap:4px;padding:6px;border-radius:999px;background:rgba(18,20,30,.72);backdrop-filter:blur(20px) saturate(170%);border:1px solid var(--line);box-shadow:var(--shadow);z-index:20}
.tab{flex:1;min-height:48px;border:0;border-radius:999px;background:none;color:var(--muted);font:600 13px/1 inherit;cursor:pointer;transition:all .3s var(--ease)}
.tab.on{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 55%,transparent),color-mix(in srgb,var(--accent2) 45%,transparent));color:#fff}
.modal{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .25s}
.modal.open{opacity:1;pointer-events:auto}
.modal .sheet{width:min(100%,520px);max-height:90vh;overflow:auto;padding:22px 18px calc(22px + env(safe-area-inset-bottom));border-radius:var(--r) var(--r) 0 0;background:#12141e;border:1px solid var(--line);transform:translateY(30px);transition:transform .4s var(--ease)}
.modal.open .sheet{transform:none}
.toast{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#1c1f2c;border:1px solid var(--line);box-shadow:var(--shadow);font-size:14px;z-index:60;animation:in .3s var(--ease)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/*APP_CSS*/
</style>
</head>
<body>
<div class="app">
<!--APP_BODY-->
</div>
<script>
(function(){
var W=window;
W.$=function(s,r){return(r||document).querySelector(s)};
W.$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
W.store={get:function(k,d){try{var v=localStorage.getItem("app_"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem("app_"+k,JSON.stringify(v))}catch(e){}}};
/* cloud: ортақ бұлттық деректер (бірнеше адам бірге қолданады). Бөлісілген сілтемеде бұлтқа, басқа жерде localStorage-қа жазады. Барлығы Promise қайтарады */
W.cloud={_b:function(){var c=W.__QWQ_CLOUD;return c&&c.url},
get:function(k,d){var b=this._b();if(!b)return Promise.resolve(store.get("cloud_"+k,d));return fetch(b+"/"+encodeURIComponent(k)).then(function(r){return r.json()}).then(function(j){return j.value==null?d:j.value}).catch(function(){return d})},
set:function(k,v){var b=this._b();if(!b){store.set("cloud_"+k,v);return Promise.resolve(true)}return fetch(b+"/"+encodeURIComponent(k),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:v})}).then(function(r){if(!r.ok)throw 0;return true}).catch(function(){toast("Бұлтқа сақтау мүмкін болмады");return false})},
list:function(){var b=this._b();if(!b){var o={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf("app_cloud_")===0)o[k.slice(10)]=JSON.parse(localStorage.getItem(k))}}catch(e){}return Promise.resolve(o)}return fetch(b).then(function(r){return r.json()}).then(function(j){return j.data||{}}).catch(function(){return{}})}};
W.uid=function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)};
W.esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
W.fmt={money:function(n){return(+n||0).toLocaleString("kk-KZ")+" ₸"},date:function(d){return new Date(d).toLocaleDateString("kk-KZ",{day:"numeric",month:"short"})},num:function(n){return(+n||0).toLocaleString("kk-KZ")}};
W.toast=function(m){var t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2400)};
W.go=function(id){$$(".screen").forEach(function(s){s.classList.toggle("on",s.id===id)});$$("[data-go]").forEach(function(b){b.classList.toggle("on",b.dataset.go===id)});W.scrollTo(0,0)};
document.addEventListener("click",function(e){var t=e.target,b=t.closest&&t.closest("[data-go]");if(b)go(b.dataset.go);var o=t.closest&&t.closest("[data-open]");if(o){var m=$("#"+o.dataset.open);m&&m.classList.add("open")}var c=t.closest&&t.closest("[data-close]");if(c){var p=c.closest(".modal");p&&p.classList.remove("open")}if(t.classList&&t.classList.contains("modal"))t.classList.remove("open")});
document.addEventListener("DOMContentLoaded",function(){var f=$(".screen.on")||$(".screen");if(f)go(f.id)});
})();
</script>
<script>
//APP_JS
</script>
</body>
</html>`;

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function build(title, body, css, js) {
    const m = body.match(/<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i);
    if (m) body = m[1];
    css = (css || "").replace(/<\/?style[^>]*>/gi, "");
    js = (js || "").replace(/<\/?script[^>]*>/gi, "").replace(/<\/script/gi, "<\\/script");
    return BASE.replace("{{TITLE}}", () => esc(title))
      .replace("/*APP_CSS*/", () => css)
      .replace("<!--APP_BODY-->", () => body.trim())
      .replace("//APP_JS", () => js);
  }

  /** AI жауабын (===HTML=== / ===CSS=== / ===JS=== / ===END===) бөліктерге ажырату; жартылай жауапқа да жарайды */
  function parse(text) {
    let t = text.replace(/^\s*```[a-zA-Z]*\s*\n/, "");
    const hi = t.indexOf("===HTML===");
    if (hi < 0) return { body: "", css: "", js: "", stage: 0, end: false };
    t = t.slice(hi + 10);
    const ci = t.indexOf("===CSS==="), ji = t.indexOf("===JS==="), ei = t.indexOf("===END===");
    const cut = (s, e) => s.slice(0, e < 0 ? s.length : e).replace(/\n?```\s*$/, "").trim();
    const body = cut(t, ci >= 0 ? ci : ji >= 0 ? ji : ei);
    const css = ci < 0 ? "" : cut(t.slice(ci + 9), ji >= 0 ? ji - ci - 9 : ei >= 0 ? ei - ci - 9 : -1);
    const js = ji < 0 ? "" : cut(t.slice(ji + 8), ei >= 0 ? ei - ji - 8 : -1);
    return { body, css, js, stage: ei >= 0 ? 4 : ji >= 0 ? 3 : ci >= 0 ? 2 : 1, end: ei >= 0 };
  }

  Q.template = { build, parse };
})(window.QWQ);
