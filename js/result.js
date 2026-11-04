/* QWQ Builder · НӘТИЖЕ: iframe, құрылғы ауыстырғыш, түзету, жүктеу */
(function (Q) {
  const { $, el, ic, toast, fmtSize, byteLen, throttleRaf } = Q;
  const S = Q.store;
  const SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock";
  let mode = innerWidth >= 760 ? "desktop" : "phone", ui = {}, ro = null, busy = false, ctrl = null;

  const html = () => S.data.files.html || "";

  function render() {
    const c = $("#res-root");
    if (!html()) {
      c.innerHTML = `<div class="card glass empty" style="margin-top:8px"><h3>Нәтиже жоқ</h3><button class="btn btn--primary glass" type="button" id="r-go">${ic("code")}Код</button></div>`;
      $("#r-go").onclick = () => Q.go("code");
      if (ro) { ro.disconnect(); ro = null; }
      return;
    }
    c.innerHTML = `
      <div class="res-bar">
        <div class="seg glass glass--flat" role="tablist" aria-label="Құрылғы">
          <span class="seg-ind" id="seg-ind"></span>
          <button role="tab" data-m="phone" aria-selected="${mode === "phone"}" aria-label="Телефон">${ic("phone", "ico ico--sm")}<span class="seg-l">Телефон</span></button>
          <button role="tab" data-m="desktop" aria-selected="${mode === "desktop"}" aria-label="Компьютер">${ic("monitor", "ico ico--sm")}<span class="seg-l">Компьютер</span></button>
        </div>
        <div class="tools">
          <button class="btn btn--icon glass glass--flat t-x" id="t-undo" type="button" aria-label="Алдыңғы нұсқа" title="Алдыңғы нұсқа">${ic("undo", "ico ico--sm")}</button>
          <button class="btn btn--sm glass glass--flat" id="t-ver" type="button">${ic("list", "ico ico--sm")}Нұсқалар <span id="ver-n"></span></button>
          <button class="btn btn--sm glass glass--flat" id="t-qr" type="button">${ic("qr", "ico ico--sm")}QR</button>
          <button class="btn btn--sm glass glass--flat t-x" id="t-how" type="button">${ic("code", "ico ico--sm")}Қалай жұмыс істейді?</button>
          <button class="btn btn--sm glass glass--flat t-x" id="t-pub" type="button">${ic("spark", "ico ico--sm")}Галереяға жариялау</button>
          <button class="btn btn--sm glass glass--flat t-x t-x2" id="t-html" type="button">${ic("download", "ico ico--sm")}HTML</button>
          <button class="btn btn--sm glass glass--flat t-x t-x2" id="t-zip" type="button">${ic("download", "ico ico--sm")}ZIP</button>
          <button class="btn btn--icon glass glass--flat t-x t-x2" id="t-win" type="button" aria-label="Жаңа терезеде ашу" title="Жаңа терезеде ашу">${ic("ext", "ico ico--sm")}</button>
          <span class="more-wrap t-more">
            <button class="btn btn--icon glass glass--flat" id="t-more" type="button" aria-label="Тағы" aria-haspopup="menu" aria-expanded="false"><span class="dots" aria-hidden="true">⋯</span></button>
            <div class="more-menu glass glass--dark" id="more-menu" role="menu" hidden>
              <button role="menuitem" class="m-only" type="button" data-t="t-undo" id="m-undo">${ic("undo", "ico ico--sm")}Алдыңғы нұсқа</button>
              <button role="menuitem" class="m-only" type="button" data-t="t-how">${ic("code", "ico ico--sm")}Қалай жұмыс істейді?</button>
              <button role="menuitem" class="m-only" type="button" data-t="t-pub">${ic("spark", "ico ico--sm")}Галереяға жариялау</button>
              <button role="menuitem" type="button" data-t="t-html">${ic("download", "ico ico--sm")}HTML жүктеу</button>
              <button role="menuitem" type="button" data-t="t-zip">${ic("download", "ico ico--sm")}ZIP жүктеу</button>
              <button role="menuitem" type="button" data-t="t-win">${ic("ext", "ico ico--sm")}Жаңа терезеде ашу</button>
            </div>
          </span>
        </div>
      </div>
      <div class="stage" id="stage"><div class="frame-box" id="fb"><iframe id="frame" title="Дайын қосымша" sandbox="${SANDBOX}" referrerpolicy="no-referrer"></iframe></div>
        <div class="busy" id="busy" hidden><div class="ring"></div><div id="busy-t">Өзгертіп жатыр…</div><small id="busy-m"></small><button class="btn btn--sm glass glass--flat" type="button" id="busy-stop">Тоқтату</button></div>
      </div>`;
    ui = { stage: $("#stage"), fb: $("#fb"), frame: $("#frame"), ind: $("#seg-ind"), busy: $("#busy") };
    ui.frame.srcdoc = Q.check.preview(html());
    $$seg().forEach((b) => (b.onclick = () => { mode = b.dataset.m; $$seg().forEach((x) => x.setAttribute("aria-selected", x === b)); fit(); }));
    $("#t-undo").onclick = undo;
    // «⋯» мәзірі (телефонда): әр пункт сәйкес жасырын батырманың әрекетін шақырады
    const mb = $("#t-more"), mm = $("#more-menu");
    const closeMore = () => { mm.hidden = true; mb.setAttribute("aria-expanded", "false"); };
    mb.onclick = (e) => { e.stopPropagation(); const o = mm.hidden; mm.hidden = !o; mb.setAttribute("aria-expanded", String(o)); if (o) mm.querySelector("button").focus(); };
    mm.onclick = (e) => { const it = e.target.closest("[data-t]"); if (!it) return; closeMore(); $("#" + it.dataset.t).click(); };
    if (!render.bound) {
      render.bound = true;
      document.addEventListener("click", (e) => { const m = $("#more-menu"); if (m && !m.hidden && !e.target.closest(".more-wrap")) { m.hidden = true; $("#t-more").setAttribute("aria-expanded", "false"); } });
      document.addEventListener("keydown", (e) => { const m = $("#more-menu"); if (e.key === "Escape" && m && !m.hidden) { m.hidden = true; $("#t-more").setAttribute("aria-expanded", "false"); $("#t-more").focus(); } });
    }
    $("#t-how").onclick = () => Q.sheets.explain();
    $("#t-ver").onclick = () => Q.sheets.versions();
    $("#t-pub").onclick = () => Q.gallery.publish();
    $("#t-html").onclick = dlHtml;
    $("#t-zip").onclick = dlZip;
    $("#t-win").onclick = openWin;
    $("#t-qr").onclick = () => Q.share.open();
    $("#busy-stop").onclick = () => ctrl && ctrl.abort();
    ui.busy.hidden = !busy;
    if (ro) ro.disconnect();
    ro = new ResizeObserver(throttleRaf(fit)); ro.observe(ui.stage);
    fit();
    undoState();
  }
  const $$seg = () => Q.$$(".seg button");

  function fit() {
    if (!ui.stage || !ui.fb) return;
    const w = ui.stage.clientWidth, h = ui.stage.clientHeight;
    if (w < 10 || h < 10) return;
    const fb = ui.fb;
    // көрсеткіш (indicator)
    const act = $$seg().find((b) => b.getAttribute("aria-selected") === "true");
    if (act && ui.ind) { ui.ind.style.width = act.offsetWidth + "px"; ui.ind.style.transform = `translateX(${act.offsetLeft - 4}px)`; }
    fb.className = "frame-box " + mode;
    if (mode === "phone") {
      if (innerWidth < 520) {            // телефонда: толық экран, жақтаусыз
        fb.className = "frame-box bare";
        Object.assign(fb.style, { width: w + "px", height: h + "px", transform: "none" });
      } else {
        const W = 412, H = 866, s = Math.min(w / W, h / H, 1);
        Object.assign(fb.style, { width: W + "px", height: H + "px", transform: `scale(${s})` });
      }
    } else {
      // компьютер: кадр бүкіл аймақты алады (кішірейтусіз, бос жолақсыз)
      Object.assign(fb.style, { width: w + "px", height: h + "px", transform: "none" });
    }
  }

  /* ---------- түзету ---------- */
  async function tweakLegacy(text) {
    text = text.trim();
    if (!text || busy || !html()) return;
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
    busy = true; ctrl = new AbortController();
    if (ui.busy) { ui.busy.hidden = false; $("#busy-t").textContent = "Өзгертіп жатыр…"; }
    const setM = throttleRaf((n) => { const m = $("#busy-m"); if (m) m.textContent = `жазылды: ${fmtSize(n)}`; });
    const sig = ctrl.signal;
    try {
      const cur = html();
      // бір «толық HTML» сұрауы (үзілсе, жалғастырады)
      const gen = async (message) => {
        const r = await Q.api.chat({ signal: sig, web: false, stream: true, agent: true, model: Q.codegen.CODE_MODEL, thinking: "minimal", message, onDelta: (_, full) => setM(byteLen(full)) });
        let code = Q.code.extractHtml(r.answer), tries = 0;
        while (!Q.code.complete(code) && tries < 4) {
          tries++;
          const t = await Q.api.chat({
            signal: sig, web: false, stream: true, agent: true, model: Q.codegen.CODE_MODEL, thinking: "minimal",
            message: `Төмендегі HTML коды үзіліп қалды. Дәл үзілген жерден ТЕК қалған кодты жалғастыр, қайталама, \`\`\` қоспа, </html> тегімен аяқта.

Соңғы бөлік:
${code.slice(-1500)}`,
            onDelta: (_, full) => setM(byteLen(code + full)),
          });
          code = (code + Q.code.dedupe(code, Q.code.stripFence(t.answer))).trim();
          const e = code.toLowerCase().lastIndexOf("</html>"); if (e >= 0) code = code.slice(0, e + 7);
        }
        if (!Q.code.complete(code)) throw new Q.api.QErr("Өзгертілген код толық келмеді, ескі нұсқа сақталды. Өтінішті қысқартып қайта жазып көр.", "incomplete");
        return code;
      };
      let code = await gen(`Төменде жұмыс істеп тұрған веб-қосымшаның толық коды берілген. Оны мына өтініш бойынша өзгерт: «${text}».
Есептің басқа бөлігін бұзба, интерфейс тілі қазақша қалсын. Жауапта ТЕК толық жаңартылған index.html кодын бір \`\`\`html блогымен қайтар, түсініктеме жазба.

\`\`\`html
${cur}
\`\`\``);
      // өзгерткен кодты да нақты іске қосып тексереміз: бұзылса — 2 реттен артық емес түзетеміз
      $("#busy-t").textContent = "Тексеріп жатыр…";
      let chk = await Q.check.run(code), fixTry = 0;
      while (chk.issues.length && fixTry < 2) {
        fixTry++;
        $("#busy-t").textContent = `Түзетіп жатыр… (${fixTry}/2)`;
        code = await gen(`Төмендегі веб-қосымша «${text}» өтінішінен кейін бұзылды. Іске қосып тексергенде мына ақаулар табылды:
${chk.issues.slice(0, 6).map((x) => "- " + x).join("\n")}

Осы ақауларды түзет, өтінішті («${text}») сақта, басқа бөлігін бұзба. Жауапта ТЕК толық index.html кодын бір \`\`\`html блогымен қайтар.

\`\`\`html
${code}
\`\`\``);
        chk = await Q.check.run(code);
      }
      if (chk.issues.length) throw new Q.api.QErr("Өзгеріс қосымшаны бұзды және түзету сәтсіз болды, ескі нұсқа сақталды. Өтінішті басқаша жазып көр.", "broken");
      S.data.versions.push({ html: code, note: text, t: Date.now() });
      S.data.versions = S.data.versions.slice(-20);
      S.data.verIdx = S.data.versions.length - 1;
      S.data.files.html = code; S.save();
      ui.frame.srcdoc = Q.check.preview(code); undoState();
      toast("Дайын", "ok", 2000);
      const f = $("#tweak"); if (f) f.value = "";
    } catch (e) {
      if (e.code === "abort") toast("Өзгерту тоқтатылды.", "ok", 3000);
      else toast(e.message || "Өзгерту мүмкін болмады. Қайта байқап көр.", "err", 8000);
    } finally {
      busy = false; ctrl = null; if (ui.busy) ui.busy.hidden = true;
    }
  }
  /* ---------- «Өзгерту» режимі: тек керекті жерге патч + дифф + бақылау нүктесі + «Қайтару» ---------- */
  const esc = Q.esc;
  const cut = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n) + "…" : t; };
  function hideDiff() { const b = $("#diffbar"); if (b) b.hidden = true; }
  function showDiff(changes, prevIdx, request) {
    const b = $("#diffbar"); if (!b) return;
    const files = {}; changes.forEach((c) => { files[c.file] = (files[c.file] || 0) + 1; });
    const sum = Object.keys(files).map((f) => f + " · " + files[f]).join("  ");
    b.innerHTML = `<div class="row" style="margin:0;gap:8px;align-items:center"><div style="flex:1;min-width:0"><b>Өзгеріс: ${changes.length}</b><div class="muted" style="font-size:12.5px">${esc(sum)}</div></div>
      <button class="btn btn--sm glass glass--flat" id="diff-undo" type="button">${ic("undo", "ico ico--sm")}Қайтару</button>
      <button class="btn btn--icon btn--sm glass glass--flat" id="diff-x" type="button" aria-label="Жабу">${ic("x", "ico ico--sm")}</button></div>
      <details class="diff"><summary>Диффті көру</summary>${changes.map((c) => `<div class="d-f">${esc(c.file)}</div>${c.note ? `<div class="d-why">${esc(c.note)}</div>` : ""}${c.del ? `<div class="d-del">− ${esc(cut(c.del, 240))}</div>` : ""}<div class="d-add">+ ${esc(cut(c.add, 360))}</div>`).join("")}</details>`;
    b.hidden = false;
    $("#diff-undo").onclick = () => { select(prevIdx); hideDiff(); };
    $("#diff-x").onclick = hideDiff;
  }

  /** Ағымдағы бөліктер: версияда сақталған болса, сол; әйтпесе файлдардан */
  function curParts() {
    const F = S.data.files, v = S.data.versions[verIdx()];
    const p = v && v.body != null ? v : F;
    return p && p.body != null && p.js != null ? { body: p.body, css: p.css || "", js: p.js } : null;
  }

  async function tweak(text) {
    text = text.trim();
    if (!text || busy || !html()) return;
    const parts = curParts();
    if (!parts) return tweakLegacy(text);            // ескі чаттар: бөлшектері жоқ — толық қайта жазу
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
    busy = true; ctrl = new AbortController(); hideDiff();
    if (ui.busy) { ui.busy.hidden = false; $("#busy-t").textContent = "Тек керекті жерін өзгертіп жатыр…"; $("#busy-m").textContent = ""; }
    const sig = ctrl.signal, meta = S.data.meta || {}, title = (S.data.idea && S.data.idea.title) || "Қосымша";
    const prevIdx = verIdx();                         // бақылау нүктесі: қазіргі нұсқа версиялар тізімінде тұр
    try {
      let res = await Q.codegen.edit({ request: text, title, meta, sig, ...parts });
      if (!res || res.error) throw new Q.api.QErr("Бұл өтінішті дәл өзгерте алмадым. Басқаша, нақтырақ жазып көр. Ескі нұсқа сақталды.", "nopatch");
      $("#busy-t").textContent = "Тексеріп жатыр…";
      let chk = await Q.check.run(res.html), tries = 0;
      while (chk.issues.length && tries < 2) {
        tries++;
        $("#busy-t").textContent = `Түзетіп жатыр… (${tries}/2)`;
        const fx = chk.issues.some(Q.codegen.isRenderIssue) ? null : await Q.codegen.fixJs({ title, body: res.body, css: res.css, js: res.js, errors: chk.issues, sig, meta });
        if (!fx) break;
        res = Object.assign(res, { body: fx.body, js: fx.js, html: fx.html });
        chk = await Q.check.run(res.html);
      }
      if (chk.issues.length) throw new Q.api.QErr("Өзгеріс қосымшаны бұзды, сондықтан қолданылмады. Ескі нұсқа сақталды.", "broken");
      S.data.versions.push({ html: res.html, body: res.body, css: res.css, js: res.js, note: text, t: Date.now() });
      S.data.versions = S.data.versions.slice(-20);
      S.data.verIdx = S.data.versions.length - 1;
      Object.assign(S.data.files, { html: res.html, body: res.body, css: res.css, js: res.js });
      S.save();
      ui.frame.srcdoc = Q.check.preview(res.html); undoState();
      showDiff(res.changes, Math.min(prevIdx, S.data.versions.length - 2), text);
      toast("Дайын", "ok", 2000);
      const f = $("#tweak"); if (f) f.value = "";
    } catch (e) {
      if (e.code === "abort") toast("Өзгерту тоқтатылды.", "ok", 3000);
      else toast(e.message || "Өзгерту мүмкін болмады. Қайта байқап көр.", "err", 8000);
    } finally {
      busy = false; ctrl = null; if (ui.busy) ui.busy.hidden = true;
    }
  }
  /** Ағымдағы нұсқа индексі (тізім өшпейді: кез келген нұсқаға қайтуға болады) */
  function verIdx() { const n = S.data.versions.length, i = S.data.verIdx; return Number.isInteger(i) && i >= 0 && i < n ? i : n - 1; }
  function undoState() {
    const b = $("#t-undo"); if (b) b.disabled = verIdx() < 1;
    const mu = $("#m-undo"); if (mu) mu.disabled = verIdx() < 1;
    const n = $("#ver-n"); if (n) n.textContent = S.data.versions.length > 1 ? `(${S.data.versions.length})` : "";
  }
  function select(i) {
    const v = S.data.versions[i]; if (!v) return;
    S.data.verIdx = i; S.data.files.html = v.html; if (v.body != null) Object.assign(S.data.files, { body: v.body, css: v.css || "", js: v.js });
    S.save(); if (ui.frame) ui.frame.srcdoc = Q.check.preview(html()); undoState();
    toast(`${i + 1}-нұсқаға оралды.`, "ok", 2500);
  }
  function undo() { if (verIdx() > 0) select(verIdx() - 1); }

  /* ---------- жүктеу ---------- */
  const slug = () => (S.data.idea?.title || "qosymsha").toLowerCase().replace(/[^a-z0-9а-яәғқңөұүһі]+/gi, "-").replace(/^-|-$/g, "") || "qosymsha";
  function save(blob, name) {
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function dlHtml() { save(new Blob([html()], { type: "text/html;charset=utf-8" }), slug() + ".html"); }
  async function dlZip() {
    if (!window.JSZip) { toast("ZIP кітапханасы жүктелмеді. Бетті жаңартып көр.", "err"); return; }
    try {
      const z = new JSZip(), f = S.data.files;
      z.file("index.html", html());
      if (f.plan) z.file("жоспар.md", f.plan);
      if (f.info) z.file("мәлімет.md", f.info);
      z.file("README.txt", `${S.data.idea?.title || "Қосымша"}\n\n${S.data.idea?.summary || ""}\n\nҚосымшаны ашу үшін index.html файлын браузерде ашыңыз.\nQWQ Builder арқылы жасалған.\n`);
      save(await z.generateAsync({ type: "blob" }), slug() + ".zip");
    } catch (e) { toast("ZIP жасау мүмкін болмады: " + (e.message || "белгісіз қате"), "err"); }
  }
  function openWin() {
    // iframe-sandbox: жасалған код біздің localStorage (кілт) мәліметіне қол жеткізбейді
    const w = window.open("", "_blank");
    if (!w) { toast("Браузер жаңа терезені бұғаттады. Попап рұқсатын қосып, қайта бас.", "err"); return; }
    const esc = Q.check.preview(html()).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    w.document.write(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${Q.esc(S.data.idea?.title || "Қосымша")}</title><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff}</style><iframe sandbox="${SANDBOX}" srcdoc="${esc}"></iframe>`);
    w.document.close();
  }

  function refresh(reset) { render(); }
  function init() {
    $("#tweak-form").addEventListener("submit", (e) => { e.preventDefault(); tweak($("#tweak").value); });
    const t = $("#tweak");
    const fitT = () => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 132) + "px"; };
    t.addEventListener("input", fitT);
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !Q.coarse && !e.isComposing) { e.preventDefault(); tweak(t.value); } });
    render();
  }

  Q.result = { init, refresh, fit, tweak, getHtml: html, verIdx, select, hideDiff };
})(window.QWQ);
