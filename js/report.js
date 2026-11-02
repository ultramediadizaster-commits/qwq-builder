/* QWQ Builder · «Тест есебі»: тексеру нәтижесі (басылған батырмалар, табылған/түзетілген қателер, уақыт, экран суреттері) */
(function (Q) {
  const { esc, ic, fmtTime } = Q;

  /** Тексеру нәтижесінен есеп жинау */
  function build({ found, left, fixes, chk, sec, rounds }) {
    const lk = (x) => String(x).replace(/\s+/g, " ").trim();
    const leftSet = new Set(left.map(lk));
    return {
      t: Date.now(), sec: +sec.toFixed(1), fixes, rounds,
      clicked: chk.clicked, btns: (chk.btns || []).slice(0, 40),
      found: found.map(lk), fixed: found.map(lk).filter((x) => !leftSet.has(x)), left: left.map(lk),
      shots: [],
    };
  }

  /** Есеп карточкасын #report ішіне салу */
  function render(rep) {
    const box = document.getElementById("report");
    if (!box) return;
    if (!rep) { box.hidden = true; box.innerHTML = ""; return; }
    const ok = rep.btns.filter((b) => b.ok).length, bad = rep.btns.length - ok;
    const li = (x, cls) => `<li class="${cls}"><span class="rp-mk">${cls === "fx" ? "✓" : cls === "lf" ? "✗" : "•"}</span><span>${esc(x.length > 160 ? x.slice(0, 160) + "…" : x)}</span></li>`;
    box.hidden = false;
    box.innerHTML = `
      <div class="agent-h"><div class="eyebrow">Тест есебі</div><div class="rp-badge ${rep.left.length ? "warn" : "ok"}">${rep.left.length ? "Ескертулер бар" : "Барлығы жұмыс істейді"}</div></div>
      <div class="rp-stats">
        <div><b>${rep.clicked}</b><span>батырма басылды</span></div>
        <div><b>${ok}</b><span>✓ жұмыс істейді</span></div>
        <div><b>${bad}</b><span>✗ ақаулы</span></div>
        <div><b>${rep.fixes}</b><span>түзету айналымы</span></div>
        <div><b>${fmtTime(rep.sec * 1000)}</b><span>жұмсалған уақыт</span></div>
      </div>
      ${rep.btns.length ? `<details class="rp-sec" open><summary>Әр батырманың нәтижесі</summary><ul class="rp-btns">${rep.btns.map((b) => `<li class="${b.ok ? "ok" : "no"}"><span class="rp-mk">${b.ok ? "✓" : "✗"}</span><span>${esc(b.l)}</span>${b.ok ? "" : `<em>${esc(b.n || "")}</em>`}</li>`).join("")}</ul></details>` : ""}
      <details class="rp-sec" ${rep.found.length ? "open" : ""}><summary>Табылған қателер (${rep.found.length}) · түзетілгені (${rep.fixed.length})</summary>
        ${rep.found.length ? `<ul class="rp-errs">${rep.found.map((x) => li(x, rep.fixed.includes(x) ? "fx" : "lf")).join("")}</ul>` : `<p class="rp-none">Қате табылған жоқ.</p>`}
      </details>
      ${rep.shots && rep.shots.length ? `<div class="rp-shots">${rep.shots.map((s) => `<figure><img src="${s.u}" alt="${esc(s.n)} экраны" loading="lazy"><figcaption>${esc(s.n)}</figcaption></figure>`).join("")}</div>` : ""}`;
  }

  Q.report = { build, render };
})(window.QWQ);
