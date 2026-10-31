/* QWQ Builder · ортақ UI көмекшілері */
window.QWQ = window.QWQ || {};
(function (Q) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ic = (n, c = "ico") => `<svg class="${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }

  function fmtSize(n) {
    if (n < 1024) return n + " Б";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(".", ",") + " КБ";
    return (n / 1048576).toFixed(1).replace(".", ",") + " МБ";
  }
  const byteLen = (s) => new Blob([s]).size;

  function fmtTime(ms) {
    const s = ms / 1000, m = Math.floor(s / 60);
    return String(m).padStart(2, "0") + ":" + (s % 60).toFixed(1).padStart(4, "0");
  }

  /* ---- Markdown ---- */
  if (window.DOMPurify) {
    DOMPurify.addHook("afterSanitizeAttributes", (n) => {
      if (n.tagName === "A") { n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener noreferrer"); }
    });
  }
  function md(text) {
    try {
      const raw = window.marked ? marked.parse(text || "", { gfm: true, breaks: true }) : esc(text);
      return window.DOMPurify ? DOMPurify.sanitize(raw) : esc(text);
    } catch (e) { return esc(text); }
  }

  /* ---- Көшіру: белгіше бір сәтке ✓ болады ---- */
  async function copyText(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      const t = document.createElement("textarea");
      t.value = text; t.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(t); t.select();
      try { ok = document.execCommand("copy"); } catch (x) {}
      t.remove();
    }
    if (!ok) { toast("Көшіру мүмкін болмады", "err", 3000); return; }
    if (btn) {
      if (!btn.dataset.o) btn.dataset.o = btn.innerHTML;
      btn.innerHTML = ic("check", "ico ico--sm"); btn.classList.add("done");
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.innerHTML = btn.dataset.o; btn.classList.remove("done"); }, 1400);
    }
  }
  /** Markdown ішіндегі әр код блогының бұрышына көшіру батырмасын қою */
  function enhance(root) {
    root.querySelectorAll("pre").forEach((p) => {
      if (p.querySelector(".cp-code")) return;
      const b = el("button", { class: "cp cp-code", type: "button", "aria-label": "Көшіру" }, ic("copy", "ico ico--sm"));
      p.appendChild(b);
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".cp-code");
    if (!b) return;
    const pre = b.closest("pre");
    copyText((pre.querySelector("code") || pre).textContent, b);
  });

  /* ---- Toast ---- */
  function toast(msg, kind = "err", ms = 6000) {
    const box = $("#toasts");
    const t = el("div", { class: `toast glass glass--flat toast--${kind}` });
    t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, ms);
  }

  /* ---- Құрылғы мүмкіндіктері ---- */
  const brands = (navigator.userAgentData && navigator.userAgentData.brands || []).map((b) => b.brand).join();
  const isChromium = /Chromium|Google Chrome/.test(brands) || (!!window.chrome && /Chrome\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent));
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const coarse = matchMedia("(pointer: coarse)").matches;
  const root = document.documentElement;
  // Сыну (refraction) тек Chromium-да; әлсіз құрылғыда жеңіл режим
  if (isChromium && !isSafari && !weak && !reduce && !coarse) root.classList.add("refract");
  if (weak) root.classList.add("lite");

  /* ---- Жиектегі жарқыл тінтуір/саусақ соңынан ---- */
  let lastLit = null, raf = 0;
  function light(e) {
    const t = e.target.closest && e.target.closest(".glass");
    if (!t) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", e.clientX - r.left + "px");
      t.style.setProperty("--my", e.clientY - r.top + "px");
      if (lastLit && lastLit !== t) lastLit.classList.remove("is-lit");
      t.classList.add("is-lit");
      lastLit = t;
    });
  }
  function unlight(e) {
    if (e.pointerType === "touch") setTimeout(() => lastLit && lastLit.classList.remove("is-lit"), 350);
  }
  document.addEventListener("pointermove", light, { passive: true });
  document.addEventListener("pointerdown", light, { passive: true });
  document.addEventListener("pointerup", unlight, { passive: true });
  document.addEventListener("pointerleave", () => lastLit && lastLit.classList.remove("is-lit"));

  /* ---- Төменгі қабаттың биіктігі ---- */
  const bottom = $("#bottom");
  function setBottom() { root.style.setProperty("--bottom-h", bottom.offsetHeight + "px"); }
  new ResizeObserver(setBottom).observe(bottom);
  setBottom();

  /* ---- Ойнатқыш: жазылып жатқан мәтінді бір кадрда жаңарту ---- */
  function throttleRaf(fn) {
    let pend = false, last = [];
    const run = () => { if (!pend) return; pend = false; fn(...last); };
    // әрқашан ең соңғы аргументтермен орындалады
    const t = (...a) => { last = a; if (pend) return; pend = true; requestAnimationFrame(run); };
    t.cancel = () => { pend = false; last = []; };
    return t;
  }

  Object.assign(Q, { $, $$, sleep, ic, esc, el, fmtSize, byteLen, fmtTime, md, toast, throttleRaf, coarse, copyText, enhance });
})(window.QWQ);
