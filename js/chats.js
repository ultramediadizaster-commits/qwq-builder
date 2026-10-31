/* QWQ Builder · чаттар тарихы: бүйірлік панель (сырғып ашылады), жаңа чат, атын өзгерту, өшіру */
(function (Q) {
  const { $, el, ic, esc, toast } = Q;
  const S = Q.store;
  const MONTHS = ["қаң", "ақп", "нау", "сәу", "мам", "мау", "шіл", "там", "қыр", "қаз", "қар", "жел"];
  const dr = () => $("#drawer"), scrim = () => $("#dscrim");
  let isOpen = false;

  function when(ms) {
    const d = new Date(ms), n = new Date();
    const hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return d.toDateString() === n.toDateString() ? hm : `${d.getDate()} ${MONTHS[d.getMonth()]} ${hm}`;
  }

  const working = () => (Q.chat.isBusy() || Q.code.isRunning());
  function guard() {
    if (working()) { toast("Жұмыс аяқталғанша күте тұр", "err", 3000); return false; }
    return true;
  }

  /** Белсенді чат ауысқанда барлық көріністі жаңарту */
  function refreshAll(view) {
    Q.chat.renderAll(); Q.code.render(); Q.result.refresh();
    Q.go(view || "chat");
  }

  function render() {
    const ul = $("#d-list");
    const items = S.list();
    if (!items.length) { ul.innerHTML = `<li class="ci-empty">Чат жоқ</li>`; return; }
    ul.innerHTML = items.map((c) => `<li class="ci${c.id === S.cur.id ? " on" : ""}" data-id="${c.id}">
      <button class="ci-main" type="button"><span class="ci-t">${esc(c.title || "Жаңа чат")}</span><small>${when(c.updated)}${c.files && c.files.html ? " · дайын" : ""}</small></button>
      <span class="ci-acts"><button class="cp ci-ren" type="button" aria-label="Атын өзгерту">${ic("pencil", "ico ico--sm")}</button><button class="cp ci-del" type="button" aria-label="Өшіру">${ic("trash", "ico ico--sm")}</button></span>
    </li>`).join("");
  }

  function open() { render(); isOpen = true; dr().classList.add("on"); scrim().classList.add("on"); dr().setAttribute("aria-hidden", "false"); }
  function close() { isOpen = false; dr().classList.remove("on"); scrim().classList.remove("on"); dr().setAttribute("aria-hidden", "true"); }

  function newChat() {
    if (!guard()) return;
    S.newChat(); refreshAll("chat"); close();
    $("#input").focus({ preventScroll: true });
  }

  function startRename(li) {
    const id = li.dataset.id, c = S.chats.get(id); if (!c) return;
    const t = li.querySelector(".ci-t");
    const inp = el("input", { class: "ci-edit", value: c.title || "", maxlength: "60", "aria-label": "Чат атауы" });
    t.replaceWith(inp); inp.focus(); inp.select();
    let done = false;
    const fin = (save) => { if (done) return; done = true; if (save) S.renameChat(id, inp.value); render(); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") fin(true); else if (e.key === "Escape") fin(false); });
    inp.addEventListener("blur", () => fin(true));
  }

  function init() {
    $("#btn-menu").onclick = open;
    $("#d-close").onclick = close;
    scrim().onclick = close;
    $("#d-new").onclick = newChat;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) close(); });

    $("#d-list").addEventListener("click", (e) => {
      const li = e.target.closest(".ci"); if (!li) return;
      const id = li.dataset.id;
      if (e.target.closest(".ci-ren")) { startRename(li); return; }
      const del = e.target.closest(".ci-del");
      if (del) {
        // екі басу: бірінші — растау, екінші — өшіру
        if (!del.classList.contains("sure")) { del.classList.add("sure"); del.innerHTML = ic("check", "ico ico--sm"); setTimeout(() => { del.classList.remove("sure"); del.innerHTML = ic("trash", "ico ico--sm"); }, 3000); return; }
        if (id === S.cur.id && !guard()) return;
        const wasActive = id === S.cur.id;
        S.deleteChat(id).then(() => { if (wasActive) refreshAll("chat"); render(); });
        return;
      }
      if (e.target.closest(".ci-edit")) return;
      if (id === S.cur.id) { close(); return; }
      if (!guard()) return;
      if (S.openChat(id)) { refreshAll("chat"); close(); }
    });

    // тізім өзгергенде (сақтау, синхрон) ашық панельді жаңартамыз
    let t;
    S.onChange.push(() => { if (isOpen && !document.activeElement.classList.contains("ci-edit")) { clearTimeout(t); t = setTimeout(render, 120); } });

    // сырғыту: сол жиектен оңға — ашу, панельді солға — жабу
    let sx = null, sy = 0, mode = "";
    addEventListener("touchstart", (e) => {
      const t0 = e.touches[0]; sx = t0.clientX; sy = t0.clientY;
      mode = !isOpen && sx < 22 ? "open" : isOpen && dr().contains(e.target) ? "close" : "";
    }, { passive: true });
    addEventListener("touchmove", (e) => {
      if (!mode || sx === null) return;
      const t0 = e.touches[0], dx = t0.clientX - sx, dy = Math.abs(t0.clientY - sy);
      if (dy > 40) { sx = null; return; }
      if (mode === "open" && dx > 56) { open(); sx = null; }
      else if (mode === "close" && dx < -56) { close(); sx = null; }
    }, { passive: true });
  }

  Q.chats = { init, open, close, render, refreshAll, newChat };
})(window.QWQ);
