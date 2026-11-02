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
    $("#set-key").value = S.key; $("#set-base").value = S.base; $("#set-share").value = S.shareBase;
    $("#set-demo").textContent = Q.demo.active ? "Демоны өшіру" : "Демо";
    cloudUI();
    $("#limit-box").hidden = true;
    sc.classList.add("on");
    setTimeout(() => $("#set-key").focus(), 250);
  }
  function closeSettings() { sc.classList.remove("on"); $("#btn-settings").focus(); }
  Q.openSettings = openSettings;

  function save() {
    const base = $("#set-base").value.trim();
    if (base && !/^https?:\/\//i.test(base)) { toast("Сервер мекенжайы http:// немесе https:// деп басталуы керек.", "err"); return false; }
    const sh = $("#set-share").value.trim();
    if (sh && !/^https?:\/\//i.test(sh)) { toast("QR сервері http:// немесе https:// деп басталуы керек.", "err"); return false; }
    S.key = $("#set-key").value; S.base = base; S.shareBase = sh; status(); return true;
  }

  async function test() {
    if (!save()) return;
    if (!S.key) { toast("API кілті керек.", "err"); return; }
    const b = $("#set-test"); b.disabled = true; const old = b.textContent; b.textContent = "…";
    try {
      const r = await Q.api.chat({ message: "Сәлем! Бір сөзбен жауап бер.", history: [], web: false, stream: false });
      toast("Қосылды", "ok", 3000);
    } catch (e) { toast(e.message, "err", 8000); }
    b.disabled = false; b.textContent = old;
  }

  function cloudUI() {
    const u = Q.cloud.user;
    $("#set-google-t").textContent = u ? "Шығу" : "Google арқылы кіру";
    const t = $("#cloud-t");
    if (!u) { t.textContent = ""; return; }
    const st = { syncing: "Синхрондалуда…", synced: "Синхрондалды ✓", offline: "Желі жоқ", error: "Қате: " + (Q.cloud.lastError || "").slice(0, 90) }[Q.cloud.status] || "";
    t.textContent = `${u.email || "Google"} · ${st}`;
  }

  async function init() {
    await S.init();
    $("#btn-settings").onclick = openSettings;
    $("#set-google").onclick = () => (Q.cloud.user ? Q.cloud.signOut() : Q.cloud.signIn());
    Q.cloud.onState(cloudUI);
    // басқа құрылғыдан келген өзгерістер: бос тұрғанда экранды жаңартамыз
    Q.cloud.onRemote = () => { if (!Q.chat.isBusy() && !Q.code.isRunning()) Q.chats.refreshAll(Q.view); };
    $("#status").onclick = openSettings;
    $("#set-save").onclick = () => { if (save()) { closeSettings(); toast("Сақталды", "ok", 1800); } };
    $("#set-test").onclick = test;
    const limitTxt = () => { $("#limit-t").textContent = `Бүгін: ${S.usage.used} · Қалды: ${S.usage.left} / ${S.usage.limit}`; };
    $("#set-limit").onclick = () => {
      const b = $("#limit-box");
      b.hidden = !b.hidden;
      if (!b.hidden) { $("#set-limit-n").value = S.usage.limit; limitTxt(); }
    };
    $("#set-limit-n").oninput = (e) => { if (+e.target.value > 0) { S.usage.limit = e.target.value; limitTxt(); } };
    $("#set-demo").onclick = () => {
      const on = !Q.demo.active;
      Q.demo.set(on); closeSettings();
      if (on) Q.demo.play(); else toast("Демо өшірулі", "ok", 1800);
    };
    $("#set-eye").onclick = () => { const i = $("#set-key"); i.type = i.type === "password" ? "text" : "password"; };
    $("#set-clear").onclick = async () => {
      if (Q.chat.isBusy() || Q.code.isRunning()) { toast("Жұмыс аяқталғанша күте тұр", "err", 3000); return; }
      if (!confirm("Барлық чаттар өшірілсін бе?")) return;
      await S.clearAll(); Q.chats.refreshAll("chat"); closeSettings(); toast("Тазаланды", "ok", 1800);
    };
    sc.addEventListener("click", (e) => { if (e.target === sc) closeSettings(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sc.classList.contains("on")) closeSettings(); });
    $$("#nav button").forEach((b) => (b.onclick = () => go(b.dataset.view)));

    Q.share.init(); Q.chat.init(); Q.code.render(); Q.result.init(); Q.chats.init(); Q.gallery.init(); Q.cloud.init(); status(); cloudUI();
    const h = location.hash.slice(1);
    go(VIEWS.includes(h) && (h === "chat" || S.data.idea) ? h : "chat");
    Q.tour && Q.tour.init();
    window.addEventListener("offline", () => toast("Интернет байланысы үзілді.", "err"));
    window.addEventListener("error", (e) => console.warn("QWQ:", e.message));
  }
  document.addEventListener("DOMContentLoaded", init);
})(window.QWQ);
