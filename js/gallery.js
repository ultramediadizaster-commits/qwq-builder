/* QWQ Builder · ОРТАҚ ГАЛЕРЕЯ: жариялау (тек Google арқылы кіргендер), карточкалар, ашу (sandbox), «Өзіме бейімдеу», өз жазбасын өшіру.
   Firestore: gallery/{id} — метадеректер + кіші сурет (тізім жеңіл болу үшін), galleryCode/{id} — HTML (тек ашқанда/бейімдегенде оқылады). */
(function (Q) {
  const { $, ic, esc, toast } = Q;
  const S = Q.store;
  const C = new Proxy({}, { get: (_, k) => Q.cloud[k] });   // cloud.js кейін жүктеледі
  const MAX_HTML = 900 * 1024;     // Firestore құжаты ≤ 1 МиБ, сондықтан HTML ≤ 900 КБ (ережеде де тексеріледі)
  const SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
  const ago = (ms) => new Date(ms).toLocaleDateString("kk-KZ", { day: "numeric", month: "short", year: "numeric" });
  const spin = `<div style="display:grid;place-items:center;padding:28px 0"><div class="ring"></div></div>`;
  const fbOr = async () => { try { return await C.getFb(); } catch (e) { toast("Галереяға қосылу мүмкін болмады. Интернетті тексер.", "err", 5000); return null; } };

  /* ---------- тізім ---------- */
  async function open() {
    if (Q.chats) Q.chats.close();
    const body = Q.sheets.sheet("gal", "Галерея", "Басқа қолданушылар жариялаған қосымшалар · жаңалары жоғарыда");
    body.onclick = null;
    body.innerHTML = spin;
    const f = await fbOr(); if (!f) { body.innerHTML = `<p class="muted">Галерея қолжетімсіз.</p>`; return; }
    try {
      const snap = await f.F.getDocs(f.F.query(f.F.collection(f.db, "gallery"), f.F.orderBy("created", "desc"), f.F.limit(60)));
      const items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      const me = C.user && C.user.uid;
      if (!items.length) { body.innerHTML = `<p class="muted" style="margin:0">Әзірге ештеңе жарияланған жоқ. Өз қосымшаңды нәтиже экранынан жариялап көр.</p>`; return; }
      body.innerHTML = `<div class="gal-grid">${items.map((x) => `
        <article class="gal-card glass glass--flat" data-id="${esc(x.id)}">
          <button class="gal-open" type="button" aria-label="${esc(x.title)} ашу">${x.thumb ? `<img src="${esc(x.thumb)}" alt="" loading="lazy">` : `<span class="gal-noimg">${esc((x.title || "Қ")[0])}</span>`}</button>
          <div class="gal-t"><b>${esc(x.title)}</b><p>${esc(x.desc || "")}</p><small>${esc(x.name || "Қолданушы")} · ${ago(x.created)}</small></div>
          <div class="gal-acts"><button class="btn btn--sm glass glass--flat gal-adapt" type="button">${ic("spark", "ico ico--sm")}Өзіме бейімдеу</button>${x.uid === me ? `<button class="btn btn--sm btn--icon glass glass--flat gal-del" type="button" aria-label="Өшіру">${ic("trash", "ico ico--sm")}</button>` : ""}</div>
        </article>`).join("")}</div>`;
      body.onclick = (e) => {
        const card = e.target.closest(".gal-card"); if (!card) return;
        const it = items.find((x) => x.id === card.dataset.id);
        if (e.target.closest(".gal-adapt")) adapt(it); else if (e.target.closest(".gal-del")) remove(it); else if (e.target.closest(".gal-open")) view(it);
      };
    } catch (e) { body.innerHTML = `<p class="muted">Галерея жүктелмеді: ${esc(String(e.code || e.message || e).slice(0, 120))}</p>`; }
  }

  async function code(id) {
    const f = await fbOr(); if (!f) return null;
    const d = await f.F.getDoc(f.F.doc(f.db, "galleryCode", id));
    return d.exists() ? d.data().html : null;
  }

  async function view(it) {
    const body = Q.sheets.sheet("galview", it.title, it.desc || "");
    body.innerHTML = spin;
    const html = await code(it.id);
    if (html == null) { body.innerHTML = `<p class="muted">Қосымшаның коды табылмады.</p>`; return; }
    // sandbox: жарияланған код біздің деректерге (кілт, чаттар) қол жеткізбейді
    body.innerHTML = `<iframe class="gal-frame" title="${esc(it.title)}" sandbox="${SANDBOX}" referrerpolicy="no-referrer"></iframe>`;
    body.querySelector("iframe").srcdoc = Q.check.preview(html);
  }

  /** «Өзіме бейімдеу»: коды жаңа чатқа жүктеледі, нәтиже экранында өз қалауыңша өзгертесің */
  async function adapt(it) {
    if (Q.chat.isBusy() || Q.code.isRunning()) { toast("Жұмыс аяқталғанша күте тұр", "err", 3000); return; }
    const html = await code(it.id);
    if (html == null) { toast("Қосымшаның коды табылмады.", "err"); return; }
    S.newChat();
    const c = S.data;
    c.idea = { title: (it.title + " (өзімдікі)").slice(0, 80), summary: it.desc || "", prompt: `Галереядан алынған «${it.title}» қосымшасы.\n${it.desc || ""}\nОсыны өз қалауыма бейімдеймін.` };
    c.files = { html }; c.versions = [{ html, note: `Галереядан алынды: ${it.title}`, t: Date.now() }]; c.verIdx = 0;
    c.messages = [{ role: "assistant", content: `«${it.title}» қосымшасы галереядан жүктелді. Нәтиже экранындағы төменгі жолға қалауыңды жаз («түсін жасыл қыл», «тағы бір батырма қос»), мен бейімдеп беремін.` }];
    S.save();
    document.querySelectorAll(".scrim.on").forEach((x) => x.classList.remove("on"));
    Q.chats.refreshAll("result");
    toast("Қосымша жаңа чатқа жүктелді.", "ok", 3000);
  }

  async function remove(it) {
    if (!confirm(`«${it.title}» галереядан өшірілсін бе?`)) return;
    const f = await fbOr(); if (!f) return;
    try {
      const b = f.F.writeBatch(f.db);
      b.delete(f.F.doc(f.db, "galleryCode", it.id)); b.delete(f.F.doc(f.db, "gallery", it.id));
      await b.commit();
      toast("Өшірілді.", "ok", 2000); open();
    } catch (e) { toast("Өшіру мүмкін болмады: " + String(e.code || e.message).slice(0, 100), "err", 5000); }
  }

  /* ---------- жариялау ---------- */
  async function publish() {
    const html = Q.result.getHtml(); if (!html) return;
    if (!C.user) {
      toast("Жариялау үшін Google арқылы кір.", "err", 4000);
      if (C.configured) C.signIn(); else Q.openSettings();
      return;
    }
    const size = new TextEncoder().encode(html).length;
    if (size > MAX_HTML) { toast(`Қосымша тым үлкен (${Math.round(size / 1024)} КБ). Шегі — 900 КБ.`, "err", 6000); return; }
    const idea = S.data.idea || {};
    const body = Q.sheets.sheet("pub", "Галереяға жариялау", "Қосымшаңды басқалар көріп, өз қалауынша бейімдей алады");
    body.onclick = null;
    body.innerHTML = `
      <label class="pub-l">Атауы<input class="input" id="pub-t" maxlength="80" value="${esc(idea.title || "")}"></label>
      <label class="pub-l">Қысқа сипаттама<textarea class="input" id="pub-d" maxlength="300" rows="3">${esc(idea.summary || "")}</textarea></label>
      <div class="pub-l">Шағын сурет<div id="pub-th" class="pub-th"><div class="ring"></div></div></div>
      <button class="btn btn--primary btn--lg glass lens" id="pub-go" type="button" disabled>${ic("spark")}Жариялау</button>`;
    let thumb = "";
    const rep = S.data.report && S.data.report.shots;
    try { thumb = (rep && rep[0] && rep[0].u) || ((await Q.check.shots(html))[0] || {}).u || ""; } catch (e) {}
    $("#pub-th").innerHTML = thumb ? `<img src="${thumb}" alt="Қосымшаның шағын суреті">` : `<small class="muted">Сурет алынбады, карточка әріппен көрсетіледі.</small>`;
    const go = $("#pub-go"); go.disabled = false;
    go.onclick = async () => {
      const title = $("#pub-t").value.trim(), desc = $("#pub-d").value.trim();
      if (!title) { toast("Атауын жаз.", "err", 2500); return; }
      go.disabled = true;
      const f = await fbOr(); if (!f) { go.disabled = false; return; }
      try {
        const id = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const u = C.user, b = f.F.writeBatch(f.db);
        b.set(f.F.doc(f.db, "gallery", id), { uid: u.uid, name: String(u.displayName || "Қолданушы").slice(0, 60), title: title.slice(0, 80), desc: desc.slice(0, 300), thumb: thumb.slice(0, 60000), created: Date.now(), size });
        b.set(f.F.doc(f.db, "galleryCode", id), { uid: u.uid, html });
        await b.commit();
        document.getElementById("pub").classList.remove("on");
        toast("Галереяға жарияланды!", "ok", 3000);
      } catch (e) {
        go.disabled = false;
        toast(e.code === "permission-denied" ? "Рұқсат жоқ: Firestore ережелері әлі қойылмаған болуы мүмкін." : "Жариялау мүмкін болмады: " + String(e.message).slice(0, 100), "err", 7000);
      }
    };
  }

  function init() { const b = $("#d-gal"); if (b) b.onclick = open; }
  Q.gallery = { init, open, publish };
})(window.QWQ);
