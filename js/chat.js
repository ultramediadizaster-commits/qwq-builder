/* QWQ Builder · чат көрінісі */
(function (Q) {
  const { $, el, ic, md, esc, toast, throttleRaf } = Q;
  const S = Q.store;
  let busy = false, ctrl = null;
  const msgsEl = $("#msgs"), input = $("#input"), sendBtn = $("#send");

  // QWQ-ге әр чат сұрауымен жіберілетін пішім нұсқауы
  const BRIEF = "Сен QWQ Builder көмекшісісің: қолданушының қосымша идеясын нақтылауға көмектесесің. Қазақша жауап бер, ЕҢ КӨБІ 6 сөйлем, қысқа әрі нақты. Әңгіменің БҮКІЛ тарихын ескер: бұрын айтылған талаптарды және қолданушы таңдаған нұсқаны ұмытпа — дәл соны жалғастыр. Нұсқалар ұсынсаң, 2–4 нөмірленген тізім бер: «1. **Атауы** — қысқа түсінік».\n\n";
  const FORMAT = "\n\n(Жауабыңды markdown пішімінде жаз: қысқа абзацтар, керек жерде тізім мен **қалың** сөздер, абзацтардың арасында бос жол қалдыр.)";
  const raw = new WeakMap();

  /* ---------- контекст: толық тарих (ұзын болса — ескі бөлігінің қысқаша мазмұны + соңғы 20 хабар) ---------- */
  const KEEP = 20;
  const clip = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
  const digest = (old) => old.map((m) => (m.role === "user" ? "Қолданушы: " + clip(m.content, 400) : "QWQ: " + clip(m.content, 240))).join("\n");
  function historyFor(msgs) {
    const all = msgs.map((m) => ({ role: m.role, content: m.content }));
    if (all.length <= KEEP) return all;
    let cut = all.length - KEEP;
    while (cut < all.length && all[cut].role !== "user") cut++;      // соңғы бөлік қолданушы хабарынан басталсын
    return [
      { role: "user", content: "ӘҢГІМЕНІҢ ЕРТЕРЕК БӨЛІГІНІҢ ҚЫСҚАША МАЗМҰНЫ (мұндағы талаптар мен шешімдер әлі күшінде, ұмытпа):\n" + digest(all.slice(0, cut)) },
      { role: "assistant", content: "Түсіндім, бұл талаптар мен шешімдерді ескеремін." },
      ...all.slice(cut),
    ];
  }
  /** Код/Өзгерту кезеңіне: жоба, чаттағы шешімдер, әңгіменің қысқаша мазмұны және бұрынғы өзгертулер (бір мәтін) */
  function context(max = 5000) {
    const D = S.data, idea = D.idea || {};
    const dec = (idea.decisions || []).map((x) => "- " + x).join("\n");
    const edits = (D.versions || []).map((v) => v.note).filter((n) => n && !/нұсқа$/i.test(n)).slice(-6).map((n) => "- " + n).join("\n");
    let chat = digest(D.messages || []);
    if (chat.length > max) chat = "…" + chat.slice(-max);
    return [idea.title ? `ЖОБА: ${idea.title} — ${idea.summary || ""}` : "", dec ? "ЧАТТАҒЫ ШЕШІМДЕР:\n" + dec : "", chat ? "ЧАТ ТАРИХЫ (қысқаша):\n" + chat : "", edits ? "БҰРЫНҒЫ ӨЗГЕРТУЛЕР:\n" + edits : ""].filter(Boolean).join("\n\n");
  }
  /** Соңғы AI жауабындағы нөмірленген нұсқалар (2–5) → басылатын чиптер */
  function optionsOf(text) {
    const items = [];
    String(text || "").split("\n").forEach((l) => {
      const m = l.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (!m) return;
      const b = m[2].match(/\*\*([^*]{2,60})\*\*/);
      const label = clip((b ? b[1] : m[2].split(/\s[—–-]\s|:/)[0]).replace(/[*_`]/g, ""), 48);
      if (label) items.push({ n: +m[1], label });
    });
    return items.length >= 2 && items.length <= 5 && items.every((x, i) => x.n === i + 1) ? items : [];
  }
  function optRow() {
    const old = $(".opt-row"); if (old) old.remove();
    const last = S.data.messages[S.data.messages.length - 1];
    if (busy || !last || last.role !== "assistant") return;
    const opts = optionsOf(last.content);
    if (!opts.length) return;
    const r = el("div", { class: "opt-row", role: "group", "aria-label": "Нұсқаны таңдау" }, opts.map((o) => `<button type="button" class="qchip" data-n="${o.n}">${o.n}. ${esc(o.label)}</button>`).join(""));
    r.addEventListener("click", (e) => {
      const b = e.target.closest(".qchip"); if (!b) return;
      const o = opts.find((x) => x.n === +b.dataset.n);
      send(`Мен ${o.n}-нұсқаны таңдадым: «${o.label}».`);      // бүкіл тарихпен бірге жіберіледі
    });
    msgsEl.appendChild(r);
  }

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
    const r = el("div", { class: "make-row" }, `<button class="btn btn--primary btn--lg glass lens" type="button" id="make">${ic("spark")}Кодқа өту</button>`);
    msgsEl.appendChild(r);
    r.querySelector("#make").addEventListener("click", makeApp);
  }

  function renderAll() {
    msgsEl.innerHTML = "";
    S.data.messages.forEach((m) => acts(bubble(m.role, m.content), m.content, m.role === "user" ? "user" : "ai"));
    $("#hero").hidden = S.data.messages.length > 0;
    optRow(); makeRow();
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
    input.value = ""; fit();
    const history = historyFor(S.data.messages);
    const ol = $(".opt-row"); if (ol) ol.remove();
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
      // Жылдам чат: ең жылдам модель, ойлау минимум, қысқа жауап; 12 с-та бірінші сөз келмесе — келесі модельмен бірден
      const quick = Q.api.fast() ? { agent: true, models: Q.api.CHAIN, thinkingLevel: "minimal", maxChars: 1800, firstMs: 12000 } : {};
      const r = await Q.api.chat({ message: (quick.agent ? BRIEF : "") + text + FORMAT, history, web: false, stream: true, signal: ctrl.signal, ...quick, onDelta: (_, full) => { got = full; paint(full); } });
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
      setBusy(false); ctrl = null; S.save(); optRow(); makeRow(); scrollEnd(true);
      if (!S.data.messages.length) $("#hero").hidden = false;
    }
  }

  async function makeApp() {
    const btn = $("#make");
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.innerHTML = `${ic("spark")}Күте тұр…`;
    try {
      const idea = await Q.api.extractIdea(historyFor(S.data.messages));
      const qs = idea.questions || []; delete idea.questions;
      // чаттағы шешімдер мен таңдаулар промпт картасына жиналады (модель тізімі + чиптен таңдалған нұсқалар)
      const picked = S.data.messages.filter((m) => m.role === "user" && /^Мен \d+-нұсқаны таңдадым/.test(m.content)).map((m) => "Таңдалған нұсқа: " + (m.content.match(/«([^»]+)»/) || [, m.content])[1]);
      idea.decisions = [...new Set([...(idea.decisions || []), ...picked])].slice(0, 12);
      if (idea.decisions.length) idea.prompt += `\n\nЧАТТАҒЫ ШЕШІМДЕР МЕН ТАҢДАУЛАР (міндетті түрде ұстан):\n${idea.decisions.map((x) => "- " + x).join("\n")}`;
      if (qs.length && !(Q.demo && Q.demo.active)) { btn.closest(".make-row").remove(); askQuestions(idea, qs); return; }
      startIdea(idea, false);
    } catch (e) {
      toast(e.message || "Идеяны қорытындылау мүмкін болмады.", "err");
      btn.disabled = false; btn.innerHTML = `${ic("spark")}Кодқа өту`;
    }
  }

  function startIdea(idea, auto) {
    S.data.idea = idea; S.data.files = {}; S.data.versions = [];
    S.save();
    Q.code.render();
    Q.go("code");
    if (auto) Q.code.run();
  }

  /** Код жазбас бұрын: 2–4 нақтылау сұрағы, басылатын нұсқалармен; әр сұрақта «Өзің шеш» (әдепкі) */
  function askQuestions(idea, qs) {
    const AUTO = "Өзің шеш";
    const card = el("div", { class: "msg msg--ai glass glass--flat qcard" });
    card.innerHTML = `<p class="q-h">Код жазбас бұрын бірнеше нақтылау. Нұсқаны бас (немесе «${AUTO}» қалдыр):</p>` +
      qs.map((x, i) => `<div class="q-row" role="radiogroup" aria-label="${esc(x.q)}"><div class="q-t">${esc(x.q)}</div><div class="q-opts">${
        x.options.concat(AUTO).map((v) => `<button type="button" class="qchip${v === AUTO ? " on" : ""}" data-i="${i}" role="radio" aria-checked="${v === AUTO}">${esc(v)}</button>`).join("")}</div></div>`).join("") +
      `<div class="q-go"><button class="btn btn--primary btn--lg glass lens" type="button">${ic("spark")}Код жазуды бастау</button></div>`;
    msgsEl.appendChild(card);
    scrollEnd(true);
    const pick = qs.map(() => AUTO);
    card.addEventListener("click", (e) => {
      const c = e.target.closest(".qchip");
      if (c) {
        const i = +c.dataset.i; pick[i] = c.textContent;
        card.querySelectorAll(`.qchip[data-i="${i}"]`).forEach((b) => { const on = b === c; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
        return;
      }
      if (!e.target.closest(".q-go .btn")) return;
      // жауаптар тапсырманың соңына қосылады; «Өзің шеш» — агент өзі таңдайды
      const lines = qs.map((x, i) => `- ${x.q}: ${pick[i] === AUTO ? "агент өзі шешеді (тақырыпқа ең сай нұсқа)" : pick[i]}`);
      idea.prompt += `\n\nҚОЛДАНУШЫНЫҢ НАҚТЫЛАУЛАРЫ (міндетті түрде ұстан):\n${lines.join("\n")}`;
      idea.decisions = (idea.decisions || []).concat(qs.map((x, i) => (pick[i] === AUTO ? null : `${x.q}: ${pick[i]}`)).filter(Boolean));
      const sum = qs.map((x, i) => `**${x.q}:** ${pick[i]}`).join("\n\n");
      card.remove();
      S.data.messages.push({ role: "assistant", content: `Нақтылаулар:\n\n${sum}` });
      renderAll();
      startIdea(idea, true);
    });
  }

  function init() {
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

  Q.chat = { init, renderAll, updateKeyWarn, send, historyFor, context, optionsOf, isBusy: () => busy };
})(window.QWQ);
