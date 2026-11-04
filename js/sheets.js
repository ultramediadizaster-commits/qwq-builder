/* QWQ Builder · нәтиже экранының қосымша панельдері: «Қалай жұмыс істейді?» (кодты қазақша түсіндіру) және «Нұсқалар» тарихы */
(function (Q) {
  const { $, el, ic, esc, toast } = Q;
  const S = Q.store;

  /** Ортақ панель (scrim + sheet): ашылғанда мазмұн контейнерін қайтарады */
  function sheet(id, title, sub) {
    let sc = document.getElementById(id);
    if (!sc) {
      sc = el("div", { class: "scrim", id, role: "dialog", "aria-modal": "true", "aria-label": title });
      sc.innerHTML = `<div class="sheet glass glass--dark wide"><h2></h2><p class="sub"></p><div class="sh-body"></div><button class="btn glass glass--flat sh-close" type="button" style="margin-top:14px">Жабу</button></div>`;
      document.body.appendChild(sc);
      const close = () => sc.classList.remove("on");
      sc.querySelector(".sh-close").onclick = close;
      sc.addEventListener("click", (e) => { if (e.target === sc) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }
    sc.querySelector("h2").textContent = title;
    sc.querySelector(".sub").textContent = sub || "";
    sc.classList.add("on");
    return sc.querySelector(".sh-body");
  }

  /* ---------- 3-кезең: Қалай жұмыс істейді? ---------- */
  const sign = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ":" + (h >>> 0).toString(36); };
  let exBusy = false;

  const secHtml = (secs) => secs.map((x, i) => `
    <section class="ex-sec">
      <div class="ex-txt"><span class="ex-n">${i + 1}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div></div>
      ${x.code ? `<pre class="codeview ex-code"><code>${esc(x.code)}</code></pre>` : ""}
    </section>`).join("");

  async function explain() {
    const html = Q.result.getHtml();
    if (!html || exBusy) return;
    if (!S.key && !(Q.demo && Q.demo.active)) { toast("API кілті керек.", "err"); Q.openSettings(); return; }
    const body = sheet("how", "Қалай жұмыс істейді?", "Қосымшаның кодын қарапайым тілмен бөлім-бөлімімен түсіндіреміз");
    const sig = sign(html);
    const cached = S.data.explain;
    if (cached && cached.sig === sig) { body.innerHTML = secHtml(cached.sections); return; }
    body.innerHTML = `<div class="qr-load" style="display:grid;place-items:center;gap:10px;padding:24px 0"><div class="ring"></div><small>Код оқылып жатыр…</small></div>`;
    exBusy = true;
    try {
      const code = html.length > 60000 ? html.slice(0, 60000) : html;
      const ask = `Сен бағдарламалауды жаңа үйреніп жатқан студентке түсіндіретін мұғалімсің. Төмендегі қосымшаның кодын бөлімдерге бөліп, ең қарапайым қазақ тілімен түсіндір (күрделі терминді бірден түсіндіріп отыр).
Бөлімдер: 1) «Құрылым (HTML)», 2) «Дизайн (CSS)», 3) «Логика (JavaScript)», сосын ең маңызды 3–5 функцияның әрқайсысы үшін бөлек бөлім (атауы «Функция: ...»).
Әр бөлімнің "text" өрісі 2–4 сөйлем. "code" өрісіне осы бөлімге қатысты кодтың НАҚТЫ үзіндісін (көшіріп, өзгертпей, ең көбі 14 жол) қой.
ТҮСІНДІРУ ЖАУАП ФОРМАТЫ: тек таза JSON, markdown жоқ: {"sections":[{"title":"...","text":"...","code":"..."}]}

КОД:
${code}`;
      let secs = null;
      for (let i = 0; i < 2 && !secs; i++) {
        const r = await Q.api.chat({ web: false, stream: false, agent: true, model: Q.codegen.CODE_MODEL, thinking: "minimal", message: ask + (i ? "\nЕскерту: тек жарамды JSON керек." : "") });
        const j = Q.api.parseJSON(r.answer);
        if (j && Array.isArray(j.sections) && j.sections.length) secs = j.sections.slice(0, 9).map((x) => ({ title: String(x.title || "").slice(0, 80), text: String(x.text || "").slice(0, 700), code: String(x.code || "").split("\n").slice(0, 16).join("\n") }));
      }
      if (!secs) throw new Error("Түсіндірме дұрыс пішімде келмеді. Қайта байқап көр.");
      S.data.explain = { sig, sections: secs }; S.save();
      body.innerHTML = secHtml(secs);
    } catch (e) {
      body.innerHTML = `<p style="color:var(--text-2)">${esc(e.message || "Түсіндіру мүмкін болмады.")}</p>`;
    } finally { exBusy = false; }
  }

  /* ---------- 4-кезең: нұсқалар тарихы ---------- */
  const when = (t) => (t ? new Date(t).toLocaleString("kk-KZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
  function versions() {
    const v = S.data.versions, cur = Q.result.verIdx();
    const body = sheet("vers", "Нұсқалар", "Кез келгеніне бір басып қайтуға болады");
    if (!v.length) { body.innerHTML = `<p style="color:var(--text-2)">Нұсқа жоқ.</p>`; return; }
    body.innerHTML = `<ul class="ver-list">${v.map((x, i) => i).reverse().map((i) => {
      const x = v[i];
      return `<li class="${i === cur ? "cur" : ""}"><div><b>${i + 1}-нұсқа${i === cur ? " · ағымдағы" : ""}</b><span>${esc(x.note || "Өзгеріс")}</span><small>${esc(when(x.t))} · ${(x.html.length / 1024).toFixed(1)} КБ</small></div>${i === cur ? "" : `<button class="btn btn--sm glass glass--flat" data-i="${i}" type="button">${ic("undo", "ico ico--sm")}Қайту</button>`}</li>`;
    }).join("")}</ul>`;
    body.onclick = (e) => {
      const b = e.target.closest("[data-i]"); if (!b) return;
      Q.result.select(+b.dataset.i);
      document.getElementById("vers").classList.remove("on");
    };
  }

  Q.sheets = { explain, versions, sheet };
})(window.QWQ);
