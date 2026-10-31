/* QWQ Builder · жасалған HTML-ді жасырын sandbox-та іске қосып, қатесін ұстау */
(function (Q) {
  let seq = 0;

  const probe = (id) => `<script>(function(){var I=${id};function s(t,m){try{parent.postMessage({qwq:I,t:t,m:String(m).slice(0,300)},"*")}catch(e){}}
addEventListener("error",function(e){s("e",(e.message||"Қате")+(e.lineno?" (жол "+e.lineno+")":""))});
addEventListener("unhandledrejection",function(e){var r=e.reason;s("e","Promise: "+(r&&r.message||r))});
var ce=console.error;console.error=function(){s("e","console.error: "+[].slice.call(arguments).join(" "));try{ce.apply(console,arguments)}catch(x){}};
addEventListener("load",function(){setTimeout(function(){var b=document.body;s("i",JSON.stringify({text:b?(b.innerText||"").trim().length:0,kids:b?b.children.length:0,act:document.querySelectorAll("button,a[href],input,select,textarea,[onclick]").length}))},250)});
})()<\/script>`;

  // sandbox (allow-same-origin жоқ) ішінде localStorage қате шығарады: жадыдағы алмастырғыш
  const SHIM = `<script>(function(){try{localStorage.getItem("x");return}catch(e){}function mk(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}try{Object.defineProperty(window,"localStorage",{value:mk(),configurable:true});Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true})}catch(e){}})()<\/script>`;

  function withHead(html, p) {
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + p);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + p + "</head>");
    return p + html;
  }
  /** iframe-де көрсету үшін: localStorage алмастырғышы қосылған HTML (файлдың өзі өзгермейді) */
  const preview = (html) => withHead(html, SHIM);

  function inject(html, id) {
    const p = SHIM + probe(id);
    return withHead(html, p);
  }

  /** → Promise<{errors:string[]}> */
  function run(html, ms) {
    ms = ms || (Q.demo && Q.demo.active ? 1500 : 3500);
    return new Promise((resolve) => {
      const id = ++seq, errors = [];
      let info = null;
      const f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts allow-forms");   // allow-same-origin жоқ: біздің localStorage-қа қол жетпейді
      f.setAttribute("aria-hidden", "true"); f.tabIndex = -1;
      f.style.cssText = "position:fixed;left:-9999px;top:0;width:390px;height:800px;border:0;opacity:0;pointer-events:none";
      const on = (e) => {
        if (e.source !== f.contentWindow || !e.data || e.data.qwq !== id) return;
        if (e.data.t === "e") { if (!errors.includes(e.data.m)) errors.push(e.data.m); }
        else if (e.data.t === "i") { try { info = JSON.parse(e.data.m); } catch (x) {} }
      };
      addEventListener("message", on);
      f.srcdoc = inject(html, id);
      document.body.appendChild(f);
      setTimeout(() => {
        removeEventListener("message", on); f.remove();
        const out = errors.slice(0, 6);
        if (!/<\/html>\s*$/i.test(html.trim())) out.push("Код </html> тегімен аяқталмаған");
        if (!info) { if (!errors.length) out.push("Бет жүктелмеді"); }
        else {
          if (!info.text && !info.kids) out.push("Бет бос");
          else if (!info.act) out.push("Басатын батырма немесе өріс жоқ");
        }
        resolve({ errors: out });
      }, ms);
    });
  }

  Q.check = { run, preview };
})(window.QWQ);
