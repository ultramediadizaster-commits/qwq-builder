/* QWQ Builder · чат көрінісі */
(function (Q) {
  const { $, el, ic, md, toast, throttleRaf } = Q;
  const S = Q.store;
  let busy = false, ctrl = null;
  const msgsEl = $("#msgs"), input = $("#input"), sendBtn = $("#send");

  // QWQ-ге әр чат сұрауымен жіберілетін пішім нұсқауы
  const FORMAT = "\n\n(Жауабыңды markdown пішімінде жаз: қысқа абзацтар, керек жерде тізім мен **қалың** сөздер, абзацтардың арасында бос жол қалдыр.)";
  const raw = new WeakMap();

  function paintAI(b, text) { b.innerHTML = `<div class="md">${md(text)}</div>`; Q.enhance(b); }

  function bubble(role, content) {
    const b = el("div", { class: `msg glass glass--flat ${role === "user" ? "msg--user glass--tint" : "msg--ai"}` });
    if (role === "user") b.textContent = content;
    else if (content) paintAI(b, content);
    else b.innerHTML = `<div class="typing" aria-label="Жазып жатыр"><i></i><i></i><i></i></div>`;
    msgsEl.appendChild(b);
    return b;
  }
  /** Хабарламаның астындағы көшіру белгішесі */
  function acts(b, text, role) {
    raw.set(b, text);
    const a = el("div", { class: `acts acts--${role}` }, `<button class="cp cp-msg" type="button" aria-label="Көшіру">${ic("copy", "ico ico--sm")}</button>`);
    b.after(a);
    return a;
  }

  function scrollEnd(smooth) {
    const v = $("#view-chat");
    v.scrollTo({ top: v.scrollHeight, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
  }

  function makeRow() {
    const old = $(".make-row"); if (old) old.remove();
    if (busy || !S.data.messages.some((m) => m.role === "assistant")) return;
    const r = el("div", { class: "make-row" }, `<button class="btn btn--primary btn--lg glass lens" type="button" id="make">${ic("spark")}Осыдан қосымша жасау</button>`);
    msgsEl.appendChild(r);
    r.querySelector("#make").addEventListener("click", makeApp);
  }

  function renderAll() {
    msgsEl.innerHTML = "";
    S.data.messages.forEach((m) => acts(bubble(m.role, m.content), m.content, m.role === "user" ? "user" : "ai"));
    $("#hero").hidden = S.data.messages.length > 0;
    makeRow();
    updateKeyWarn();
    requestAnimationFrame(() => scrollEnd(false));
  }

  function updateKeyWarn() {
    $("#keywarn").hidden = !!S.key || (Q.demo && Q.demo.active);
  }

  function setBusy(b) {
    busy = b;
    sendBtn.innerHTML = ic(b ? "stop" : "send");
    sendBtn.setAttribute("aria-label", b ? "Тоқтату" : "Жіберу");
    sendBtn.type = b ? "button" : "submit";
    $(".make-row") && ($(".make-row").hidden = b);
  }

  function fit() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 132) + "px"; }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
    Q.mic.stop(); input.value = ""; fit();
    const history = S.data.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    S.data.messages.push({ role: "user", content: text });
    $("#hero").hidden = true;
    const mk = $(".make-row"); if (mk) mk.remove();
    const ub = bubble("user", text), ua = acts(ub, text, "user");
    const ai = bubble("assistant", "");
    scrollEnd(true);
    setBusy(true);
    ctrl = new AbortController();
    let got = "";
    const paint = throttleRaf((full) => { paintAI(ai, full); scrollEnd(false); });
    try {
      const r = await Q.api.chat({ message: text + FORMAT, history, web: false, stream: true, signal: ctrl.signal, onDelta: (_, full) => { got = full; paint(full); } });
      paint.cancel(); paintAI(ai, r.answer); acts(ai, r.answer, "ai");
      S.data.messages.push({ role: "assistant", content: r.answer });
      if (r.partial) toast("Жауап толық келмей үзілді, бірақ келгені сақталды.", "err");
    } catch (e) {
      if (e.code === "abort") {
        paint.cancel();
        if (got.trim()) { paintAI(ai, got); acts(ai, got, "ai"); S.data.messages.push({ role: "assistant", content: got }); }
        else { S.data.messages.pop(); ai.remove(); ub.remove(); ua.remove(); }
      } else {
        S.data.messages.pop(); ai.remove(); ub.remove(); ua.remove();
        toast(e.message || "Белгісіз қате шықты. Қайта байқап көр.", "err");
        input.value = text; fit();
      }
    } finally {
      setBusy(false); ctrl = null; S.save(); makeRow(); scrollEnd(true);
      if (!S.data.messages.length) $("#hero").hidden = false;
    }
  }

  async function makeApp() {
    const btn = $("#make");
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.innerHTML = `${ic("spark")}Күте тұр…`;
    try {
      const idea = await Q.api.extractIdea(S.data.messages.slice(-20).map((m) => ({ role: m.role, content: m.content })));
      S.data.idea = idea; S.data.files = {}; S.data.versions = [];
      S.save();
      Q.code.render();
      Q.go("code");
    } catch (e) {
      toast(e.message || "Идеяны қорытындылау мүмкін болмады.", "err");
      btn.disabled = false; btn.innerHTML = `${ic("spark")}Осыдан қосымша жасау`;
    }
  }

  function init() {
    Q.mic.attach($("#input"), $("#mic"), fit);
    $("#composer").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
    sendBtn.addEventListener("click", () => { if (busy && ctrl) ctrl.abort(); });
    msgsEl.addEventListener("click", (e) => {
      const b = e.target.closest(".cp-msg");
      if (b) Q.copyText(raw.get(b.parentElement.previousElementSibling) || "", b);
    });
    input.addEventListener("input", fit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !Q.coarse && !e.isComposing) { e.preventDefault(); send(input.value); }
    });
    $("[data-open-settings]").addEventListener("click", () => Q.openSettings());
    renderAll();
  }

  Q.chat = { init, renderAll, updateKeyWarn, send };
})(window.QWQ);
