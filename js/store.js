/* QWQ Builder · күй мен сақтау: параметрлер — localStorage, чаттар (жобалар) — IndexedDB */
(function (Q) {
  const DEF_BASE = "https://qwq5.mirasnrmatov.workers.dev";
  const DEF_SHARE = "https://qwq-share.mirasnrmatov.workers.dev";
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---- IndexedDB (қолжетімсіз болса — жадыда жұмыс істейді) ---- */
  let db = null;
  function openDB() {
    return new Promise((res) => {
      if (typeof indexedDB === "undefined") return res(null);
      let r;
      try { r = indexedDB.open("qwq-builder", 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("chats", { keyPath: "id" }); d.createObjectStore("meta"); };
      r.onsuccess = () => res(r.result);
      r.onerror = r.onblocked = () => res(null);
    });
  }
  const req = (store, mode, fn) => new Promise((res, rej) => {
    if (!db) return res(undefined);
    try {
      const t = db.transaction(store, mode), s = t.objectStore(store), r = fn(s);
      t.oncomplete = () => res(r && r.result);
      t.onerror = t.onabort = () => rej(t.error);
    } catch (e) { rej(e); }
  });

  const blank = () => ({ id: rid(), title: "", auto: true, created: Date.now(), updated: Date.now(), messages: [], idea: null, files: {}, versions: [], share: null, agent: null });
  const isEmpty = (c) => !c.messages.length && !c.idea;

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

    /* ---- чаттар ---- */
    chats: new Map(),          // id → толық жазба (жадыда)
    cur: blank(),              // белсенді чат
    get data() { return this.cur; },
    onChange: [],              // (type, id) тыңдаушылар: "save" | "delete" | "list"
    onSync: null,              // (id, deleted) → синхрондауға белгі қою
    emit(type, id) { this.onChange.forEach((f) => { try { f(type, id); } catch (e) {} }); },

    async init() {
      db = await openDB();
      try {
        const all = (await req("chats", "readonly", (s) => s.getAll())) || [];
        all.forEach((c) => this.chats.set(c.id, c));
      } catch (e) {}
      // ескі нұсқадан (localStorage) бір рет көшіру
      try {
        const old = JSON.parse(get("qwq.project") || "null");
        if (old && Array.isArray(old.messages) && (old.messages.length || old.idea)) {
          const c = Object.assign(blank(), { messages: old.messages, idea: old.idea || null, files: old.files || {}, versions: old.versions || [] });
          this.autoTitle(c); this.chats.set(c.id, c); await this.write(c);
          if (this.onSync) this.onSync(c.id, false);
        }
        del("qwq.project");
      } catch (e) {}
      let active = null;
      try { active = await req("meta", "readonly", (s) => s.get("active")); } catch (e) {}
      this.cur = (active && this.chats.get(active)) || blank();
    },

    /** Сайдбарға арналған тізім (бос чаттар көрсетілмейді) */
    list() {
      return [...this.chats.values()].filter((c) => !c.deleted && (c.messages.length || c.idea)).sort((a, b) => b.updated - a.updated);
    },

    autoTitle(c) {
      if (!c.auto) return;
      const m = c.messages.find((x) => x.role === "user");
      const t = c.idea?.title || (m ? m.content.replace(/\s+/g, " ").trim().slice(0, 42) : "");
      if (t) c.title = t;
    },

    async write(c) {
      try { await req("chats", "readwrite", (s) => s.put(c)); } catch (e) { /* орын жетпесе — жадыда қалады */ }
    },
    setMeta(k, v) { return req("meta", "readwrite", (s) => s.put(v, k)).catch(() => {}); },
    getMeta(k) { return req("meta", "readonly", (s) => s.get(k)).catch(() => undefined); },

    /** Белсенді чатты сақтау (кішкене кідіріспен) */
    save() {
      const c = this.cur;
      c.updated = Date.now();
      this.autoTitle(c);
      if (isEmpty(c)) return;
      this.chats.set(c.id, c);
      clearTimeout(this._t);
      this._t = setTimeout(() => this.flush(), 300);
      if (this.onSync) this.onSync(c.id, false);
      this.emit("save", c.id);
    },
    async flush() {
      clearTimeout(this._t);
      const c = this.cur;
      if (!isEmpty(c)) await this.write(c);
      await this.setMeta("active", c.id);
    },

    newChat() {
      if (isEmpty(this.cur)) return this.cur;
      this.flush();
      this.cur = blank();
      this.setMeta("active", this.cur.id);
      this.emit("list");
      return this.cur;
    },
    /** Жаңа бос чатқа ауысу (алдыңғысы сақталады) */
    reset() { this.flush(); this.cur = blank(); this.setMeta("active", this.cur.id); this.emit("list"); },
    openChat(id) {
      const c = this.chats.get(id);
      if (!c) return false;
      this.flush();
      this.cur = c;
      this.setMeta("active", c.id);
      this.emit("list");
      return true;
    },
    renameChat(id, title) {
      const c = this.chats.get(id); if (!c) return;
      title = (title || "").trim().slice(0, 60);
      if (title) { c.title = title; c.auto = false; } else { c.auto = true; c.title = ""; this.autoTitle(c); }
      c.updated = Date.now();
      this.write(c); if (this.onSync) this.onSync(c.id, false);
      this.emit("list");
    },
    async deleteChat(id, silent) {
      const c = this.chats.get(id);
      this.chats.delete(id);
      try { await req("chats", "readwrite", (s) => s.delete(id)); } catch (e) {}
      if (!silent && this.onSync) this.onSync(id, true);
      if (this.cur.id === id || (c && this.cur === c)) { this.cur = blank(); this.setMeta("active", this.cur.id); }
      this.emit("list");
    },
    async clearAll() {
      for (const id of [...this.chats.keys()]) await this.deleteChat(id);
      this.cur = blank(); this.setMeta("active", this.cur.id);
    },

    /** Бұлттан келген жазба: синхрондау белгісін қоймай, жергілікті жаңартады */
    async applyRemote(rec) {
      const c = Object.assign(blank(), rec);
      this.chats.set(c.id, c);
      if (this.cur.id === c.id) this.cur = c;
      await this.write(c);
      this.emit("list");
    },
    async removeLocal(id) { await this.deleteChat(id, true); },
  };
  Q.store = S;
})(window.QWQ);
