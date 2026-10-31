/* QWQ Builder · QR КОД: қосымшаны qwq-share Worker-ге сақтап, қысқа сілтеме мен QR көрсету */
(function (Q) {
  const { $, ic, toast } = Q;
  const S = Q.store;
  let last = null;            // { html, url } — HTML өзгермесе, сол сілтеме қайта қолданылады
  const box = () => $("#qr");

  function svg(url) {
    const qr = qrcode(0, "M");
    qr.addData(url); qr.make();
    const n = qr.getModuleCount(), m = 4, size = n + m * 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR код"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  function show(url) {
    $("#qr-img").innerHTML = svg(url);
    $("#qr-url").textContent = url;
    $("#qr-load").hidden = true; $("#qr-body").hidden = false;
  }

  async function post(html) {
    let res;
    try {
      res = await fetch(S.shareBase + "/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html, title: S.data.idea?.title || "" }) });
    } catch (e) { throw new Error("Бөлісу серверіне қосылу мүмкін болмады. Интернетті және qwq-share мекенжайын тексер."); }
    if (res.status === 413) throw new Error("Қосымша тым үлкен (1 МБ-тан асады).");
    if (!res.ok) throw new Error(`Бөлісу сервері қате қайтарды (${res.status}).`);
    let j; try { j = await res.json(); } catch (e) { throw new Error("Бөлісу сервері түсініксіз жауап қайтарды."); }
    if (!j.url) throw new Error("Бөлісу сервері сілтеме қайтармады.");
    return j.url;
  }

  async function open() {
    const html = Q.result.getHtml();
    if (!html) return;
    box().classList.add("on");
    if (last && last.html === html) { show(last.url); return; }
    $("#qr-body").hidden = true; $("#qr-load").hidden = false;
    try {
      const url = await post(html);
      last = { html, url };
      if (box().classList.contains("on")) show(url);
    } catch (e) {
      close();
      toast(e.message, "err", 7000);
    }
  }
  function close() { box().classList.remove("on"); }

  function init() {
    $("#qr-close").onclick = close;
    box().addEventListener("click", (e) => { if (e.target === box()) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && box().classList.contains("on")) close(); });
    $("#qr-copy").onclick = (e) => Q.copyText($("#qr-url").textContent, e.currentTarget);
  }

  Q.share = { init, open, svg };
})(window.QWQ);
