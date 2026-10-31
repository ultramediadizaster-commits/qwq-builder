/* QWQ Builder · күй мен сақтау (localStorage, қатесіз) */
(function (Q) {
  const DEF_BASE = "https://qwq5.mirasnrmatov.workers.dev";
  const DEF_SHARE = "https://qwq-share.mirasnrmatov.workers.dev";
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  const S = {
    get key() { return get("qwq.key") || ""; },
    set key(v) { v ? set("qwq.key", v.trim()) : del("qwq.key"); },
    get base() { return (get("qwq.base") || DEF_BASE).replace(/\/+$/, ""); },
    set base(v) { v && v.trim() !== DEF_BASE ? set("qwq.base", v.trim()) : del("qwq.base"); },
    get shareBase() { return (get("qwq.share") || DEF_SHARE).replace(/\/+$/, ""); },
    set shareBase(v) { v && v.trim() !== DEF_SHARE ? set("qwq.share", v.trim()) : del("qwq.share"); },
    DEF_SHARE,
    get uid() { let u = get("qwq.uid"); if (!u) { u = "u" + Math.random().toString(36).slice(2, 10); set("qwq.uid", u); } return u; },
    DEF_BASE,
    // күн сайынғы сұрау санағыш (Worker лимит туралы ақпарат қайтармайды)
    usage: {
      day() { return new Date().toLocaleDateString("sv"); },
      get limit() { return Math.max(1, parseInt(get("qwq.limit"), 10) || 100); },
      set limit(v) { set("qwq.limit", String(Math.max(1, parseInt(v, 10) || 100))); },
      get used() { try { const u = JSON.parse(get("qwq.usage") || "{}"); return u.d === this.day() ? u.n | 0 : 0; } catch (e) { return 0; } },
      inc() { set("qwq.usage", JSON.stringify({ d: this.day(), n: this.used + 1 })); },
      get left() { return Math.max(0, this.limit - this.used); },
    },
    // жоба күйі
    data: { messages: [], idea: null, files: {}, versions: [], seen: { code: true, result: true } },
    load() {
      try { const d = JSON.parse(get("qwq.project") || "null"); if (d && Array.isArray(d.messages)) this.data = Object.assign(this.data, d); } catch (e) {}
    },
    save() {
      const ok = set("qwq.project", JSON.stringify(this.data));
      if (!ok && this.data.versions.length) { this.data.versions = this.data.versions.slice(-1); set("qwq.project", JSON.stringify(this.data)); }
    },
    reset() { this.data = { messages: [], idea: null, files: {}, versions: [], seen: { code: true, result: true } }; del("qwq.project"); },
  };
  Q.store = S;
})(window.QWQ);
