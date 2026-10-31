/* QWQ Builder · дауыспен енгізу (Web Speech API, kk-KZ) */
(function (Q) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;
  let cur = null; // белсенді {rec, btn}

  function stop() {
    if (!cur) return;
    const c = cur; cur = null;
    try { c.rec.stop(); } catch (e) {}
    c.btn.classList.remove("rec"); c.btn.setAttribute("aria-pressed", "false");
    c.btn.setAttribute("aria-label", "Микрофон");
  }

  function attach(ta, btn, onChange) {
    if (!supported || !ta || !btn) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      if (cur && cur.btn === btn) { stop(); return; }
      stop();
      const rec = new SR();
      rec.lang = "kk-KZ"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
      const base = ta.value && !/\s$/.test(ta.value) ? ta.value + " " : ta.value;
      rec.onresult = (e) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        ta.value = base + t;
        onChange && onChange();
        ta.scrollTop = ta.scrollHeight;
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        const m = { "not-allowed": "Микрофонға рұқсат жоқ", "service-not-allowed": "Микрофонға рұқсат жоқ", "audio-capture": "Микрофон табылмады", network: "Дауыс тану үшін интернет керек", "language-not-supported": "Қазақша тану қолжетімсіз" }[e.error];
        Q.toast(m || "Микрофон қатесі: " + e.error, "err", 4000);
        if (cur && cur.rec === rec) stop();
      };
      rec.onend = () => { if (cur && cur.rec === rec) stop(); };
      try { rec.start(); } catch (e) { Q.toast("Микрофонды қосу мүмкін болмады", "err", 3000); return; }
      cur = { rec, btn };
      btn.classList.add("rec"); btn.setAttribute("aria-pressed", "true"); btn.setAttribute("aria-label", "Тоқтату");
      ta.focus();
    });
  }

  Q.mic = { attach, stop, supported };
})(window.QWQ);
