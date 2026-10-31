/* QWQ Builder · НӘТИЖЕ: iframe, құрылғы ауыстырғыш, түзету, жүктеу */
(function (Q) {
  const { $, el, ic, toast, fmtSize, byteLen, throttleRaf } = Q;
  const S = Q.store;
  const SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock";
  let mode = "phone", ui = {}, ro = null, busy = false, ctrl = null;

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
          <button role="tab" data-m="phone" aria-selected="${mode === "phone"}">${ic("phone", "ico ico--sm")}Телефон</button>
          <button role="tab" data-m="desktop" aria-selected="${mode === "desktop"}">${ic("monitor", "ico ico--sm")}Компьютер</button>
        </div>
        <div class="tools">
          <button class="btn btn--icon glass glass--flat" id="t-undo" type="button" aria-label="Алдыңғы нұсқа" title="Алдыңғы нұсқа">${ic("undo", "ico ico--sm")}</button>
          <button class="btn btn--sm glass glass--flat" id="t-html" type="button">${ic("download", "ico ico--sm")}HTML</button>
          <button class="btn btn--sm glass glass--flat" id="t-zip" type="button">${ic("download", "ico ico--sm")}ZIP</button>
          <button class="btn btn--sm glass glass--flat" id="t-qr" type="button">${ic("qr", "ico ico--sm")}QR</button>
          <button class="btn btn--icon glass glass--flat" id="t-win" type="button" aria-label="Жаңа терезеде ашу" title="Жаңа терезеде ашу">${ic("ext", "ico ico--sm")}</button>
        </div>
      </div>
      <div class="stage" id="stage"><div class="frame-box" id="fb"><iframe id="frame" title="Дайын қосымша" sandbox="${SANDBOX}" referrerpolicy="no-referrer"></iframe></div>
        <div class="busy" id="busy" hidden><div class="ring"></div><div id="busy-t">Өзгертіп жатыр…</div><small id="busy-m"></small><button class="btn btn--sm glass glass--flat" type="button" id="busy-stop">Тоқтату</button></div>
      </div>`;
    ui = { stage: $("#stage"), fb: $("#fb"), frame: $("#frame"), ind: $("#seg-ind"), busy: $("#busy") };
    ui.frame.srcdoc = Q.check.preview(html());
    $$seg().forEach((b) => (b.onclick = () => { mode = b.dataset.m; $$seg().forEach((x) => x.setAttribute("aria-selected", x === b)); fit(); }));
    $("#t-undo").onclick = undo;
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
      const W = 1280, s = Math.min(w / W, 1);
      Object.assign(fb.style, { width: W + "px", height: h / s + "px", transform: `scale(${s})` });
    }
  }

  /* ---------- түзету ---------- */
  async function tweak(text) {
    text = text.trim();
    if (!text || busy || !html()) return;
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
    Q.mic.stop();
    busy = true; ctrl = new AbortController();
    if (ui.busy) { ui.busy.hidden = false; $("#busy-t").textContent = "Өзгертіп жатыр…"; }
    const setM = throttleRaf((n) => { const m = $("#busy-m"); if (m) m.textContent = `жазылды: ${fmtSize(n)}`; });
    const sig = ctrl.signal;
    try {
      const cur = html();
      const r = await Q.api.chat({
        signal: sig, web: false, stream: true,
        message: `Төменде жұмыс істеп тұрған веб-қосымшаның толық коды берілген. Оны мына өтініш бойынша өзгерт: «${text}».\nЕсептің басқа бөлігін бұзба, интерфейс тілі қазақша қалсын. Жауапта ТЕК толық жаңартылған index.html кодын бір \`\`\`html блогымен қайтар, түсініктеме жазба.\n\n\`\`\`html\n${cur}\n\`\`\``,
        onDelta: (_, full) => setM(byteLen(full)),
      });
      let code = Q.code.extractHtml(r.answer), tries = 0;
      while (!Q.code.complete(code) && tries < 4) {
        tries++;
        const t = await Q.api.chat({
          signal: sig, web: false, stream: true,
          message: `Төмендегі HTML коды үзіліп қалды. Дәл үзілген жерден ТЕК қалған кодты жалғастыр, қайталама, \`\`\` қоспа, </html> тегімен аяқта.\n\nСоңғы бөлік:\n${code.slice(-1500)}`,
          onDelta: (_, full) => setM(byteLen(code + full)),
        });
        code = (code + Q.code.dedupe(code, Q.code.stripFence(t.answer))).trim();
        const e = code.toLowerCase().lastIndexOf("</html>"); if (e >= 0) code = code.slice(0, e + 7);
      }
      if (!Q.code.complete(code)) throw new Q.api.QErr("Өзгертілген код толық келмеді, ескі нұсқа сақталды. Өтінішті қысқартып қайта жазып көр.", "incomplete");
      S.data.versions.push({ html: code, note: text });
      S.data.versions = S.data.versions.slice(-6);
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
  function undoState() { const b = $("#t-undo"); if (b) b.disabled = S.data.versions.length < 2; }
  function undo() {
    if (S.data.versions.length < 2) return;
    S.data.versions.pop();
    S.data.files.html = S.data.versions[S.data.versions.length - 1].html;
    S.save(); ui.frame.srcdoc = Q.check.preview(html()); undoState();
    toast("Алдыңғы нұсқаға оралды.", "ok", 2500);
  }

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
    Q.mic.attach(t, $("#tweak-mic"), fitT);
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !Q.coarse && !e.isComposing) { e.preventDefault(); tweak(t.value); } });
    render();
  }

  Q.result = { init, refresh, fit, tweak, getHtml: html };
})(window.QWQ);
