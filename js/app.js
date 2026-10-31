/* QWQ Builder · навигация, баптаулар, іске қосу */
(function (Q) {
  const { $, $$, toast } = Q;
  const S = Q.store;
  const VIEWS = ["chat", "code", "result"];
  Q.view = "chat";

  function go(v) {
    if (!VIEWS.includes(v)) return;
    Q.view = v;
    VIEWS.forEach((n) => $("#view-" + n).classList.toggle("on", n === v));
    $$("#nav button").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === v));
    $("#nav-ind").style.transform = `translateX(${VIEWS.indexOf(v) * 100}%)`;
    $("#dock-chat").hidden = v !== "chat";
    $("#dock-tweak").hidden = !(v === "result" && Q.result.getHtml());
    if (v === "result") { $("#dot-result").hidden = true; requestAnimationFrame(() => Q.result.fit()); }
    if (v === "code") $("#dot-code").hidden = true;
    const active = $("#view-" + v);
    if (v !== "chat") active.scrollTop = active.scrollTop;
    history.replaceState(null, "", "#" + v);
  }
  Q.go = go;

  /* ---- Күй белгісі ---- */
  function status() {
    const c = $("#status"), t = $("#status-t");
    const demo = Q.demo && Q.demo.active;
    c.classList.toggle("ok", !!S.key && !demo);
    c.classList.toggle("demo", !!demo);
    t.textContent = demo ? "Демо" : S.key ? "QWQ 5" : "Кілт жоқ";
    Q.chat && Q.chat.updateKeyWarn();
  }
  Q.status = status;

  /* ---- Баптаулар ---- */
  const sc = $("#settings");
  function openSettings() {
    $("#set-key").value = S.key; $("#set-base").value = S.base;
    sc.classList.add("on");
    setTimeout(() => $("#set-key").focus(), 250);
  }
  function closeSettings() { sc.classList.remove("on"); $("#btn-settings").focus(); }
  Q.openSettings = openSettings;

  function save() {
    const base = $("#set-base").value.trim();
    if (base && !/^https?:\/\//i.test(base)) { toast("Сервер мекенжайы http:// немесе https:// деп басталуы керек.", "err"); return false; }
    S.key = $("#set-key").value; S.base = base; status(); return true;
  }

  async function test() {
    if (!save()) return;
    if (!S.key) { toast("Алдымен кілтті енгіз.", "err"); return; }
    const b = $("#set-test"); b.disabled = true; const old = b.textContent; b.textContent = "Тексеріп жатыр…";
    try {
      const r = await Q.api.chat({ message: "Сәлем! Бір сөзбен жауап бер.", history: [], web: false, stream: false });
      toast("Қосылым жұмыс істейді ✓ Жауап: " + r.answer.slice(0, 60), "ok", 4500);
    } catch (e) { toast(e.message, "err", 8000); }
    b.disabled = false; b.textContent = old;
  }

  function init() {
    S.load();
    $("#btn-settings").onclick = openSettings;
    $("#status").onclick = openSettings;
    $("#set-save").onclick = () => { if (save()) { closeSettings(); toast("Сақталды.", "ok", 2000); } };
    $("#set-test").onclick = test;
    $("#set-eye").onclick = () => { const i = $("#set-key"); i.type = i.type === "password" ? "text" : "password"; };
    $("#set-clear").onclick = () => {
      if (!confirm("Чат, идея және жасалған қосымша өшіріледі. Жалғастырамыз ба?")) return;
      S.reset(); Q.chat.renderAll(); Q.code.render(); Q.result.refresh(); closeSettings(); go("chat"); toast("Жоба тазаланды.", "ok", 2500);
    };
    sc.addEventListener("click", (e) => { if (e.target === sc) closeSettings(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sc.classList.contains("on")) closeSettings(); });
    $$("#nav button").forEach((b) => (b.onclick = () => go(b.dataset.view)));

    Q.chat.init(); Q.code.render(); Q.result.init(); status();
    const h = location.hash.slice(1);
    go(VIEWS.includes(h) && (h === "chat" || S.data.idea) ? h : "chat");
    window.addEventListener("offline", () => toast("Интернет байланысы үзілді.", "err"));
    window.addEventListener("error", (e) => console.warn("QWQ:", e.message));
  }
  document.addEventListener("DOMContentLoaded", init);
})(window.QWQ);
