/* QWQ Builder · Google арқылы кіру (Firebase Auth) және Firestore синхронды.
   QWQ Builder-дің жеке Firebase жобасы (qwq-builder): Auth (Google popup) + Firestore users/{uid}/builderChats/{id},
   құжатта id, updated (ms) өрістері, қақтығыста соңғы өзгеріс жеңеді (LWW), өшіру — tombstone.
   Кірмесе — бәрі тек осы браузердегі IndexedDB-де. */
(function (Q) {
  const { toast } = Q;
  const S = Q.store;
  const V = "11.0.2", CDN = `https://www.gstatic.com/firebasejs/${V}/`;
  const COL = "builderChats";          // QWQ қосымшасының chats/projects коллекцияларымен араласпайды
  const MAX_DOC = 900 * 1024;          // QWQ-дегі сияқты: құжат ≤ ~900 КБ
  const size = (v) => new TextEncoder().encode(JSON.stringify(v)).length;

  let fb = null, user = null, timer = 0, poll = 0;
  const listeners = [];
  const C = { status: "idle", lastError: "", get user() { return user; }, get configured() { return !!(window.QWQ_FIREBASE && window.QWQ_FIREBASE.apiKey); }, onState: (f) => listeners.push(f) };
  const emit = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
  const setStatus = (s, err) => { C.status = s; C.lastError = err || ""; emit(); };

  async function load() {
    if (fb) return fb;
    if (!C.configured) throw new Error("Firebase бапталмаған.");
    const [A, Au, F] = await Promise.all([import(CDN + "firebase-app.js"), import(CDN + "firebase-auth.js"), import(CDN + "firebase-firestore.js")]);
    const app = A.initializeApp(window.QWQ_FIREBASE);
    const auth = Au.getAuth(app);
    const db = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
    fb = { app, auth, db, Au, F };
    Au.onAuthStateChanged(auth, onUser);
    return fb;
  }

  const errMsg = (e) => {
    const c = e && e.code || "";
    if (c === "auth/unauthorized-domain") return "Бұл сайттың домені Firebase-те рұқсат етілмеген (Authorized domains). Баптау қадамдары README-де.";
    if (c === "auth/popup-blocked") return "Браузер Google терезесін бұғаттады. Попап рұқсатын қосып, қайта бас.";
    if (c === "auth/network-request-failed") return "Интернетке қосылу мүмкін болмады. Байланысты тексер.";
    if (c === "auth/operation-not-allowed") return "Firebase-те Google арқылы кіру қосылмаған.";
    if (c === "auth/too-many-requests") return "Әрекет тым көп. Сәл күтіп, қайта байқа.";
    if (/Failed to fetch|dynamically imported|Importing a module/i.test(String(e && e.message))) return "Firebase кітапханасын жүктеу мүмкін болмады. Интернетті тексер.";
    return "Кіру мүмкін болмады: " + String((e && e.message) || e).slice(0, 140);
  };

  async function signIn() {
    try { localStorage.setItem("qwq.cloud", "1"); } catch (e) {}      // redirect-тен соң сессия қалпына келуі үшін
    try {
      const f = await load();
      const p = new f.Au.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try { await f.Au.signInWithPopup(f.auth, p); }
      catch (e) {
        if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") { if (!user) try { localStorage.removeItem("qwq.cloud"); } catch (x) {} return; }
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") { await f.Au.signInWithRedirect(f.auth, p); return; }
        throw e;
      }
    } catch (e) { if (!user) try { localStorage.removeItem("qwq.cloud"); } catch (x) {} toast(errMsg(e), "err", 8000); }
  }
  async function signOut() {
    try { if (fb) await fb.Au.signOut(fb.auth); } catch (e) {}
    try { localStorage.removeItem("qwq.cloud"); } catch (e) {}
  }

  /* ---- синхрон ---- */
  const E = { meta: { cursor: 0, dirty: {}, deleted: {}, lastSyncAt: 0 }, running: null, again: false };
  const metaKey = () => "sync:" + user.uid;

  async function loadMeta() {
    E.meta = Object.assign({ cursor: 0, dirty: {}, deleted: {}, lastSyncAt: 0 }, await S.getMeta(metaKey()));
    // кірмей тұрып өшірілгендер
    const pend = (await S.getMeta("pendingDel")) || {};
    for (const [id, at] of Object.entries(pend)) { E.meta.deleted[id] = at; E.meta.dirty[id] = at; }
    if (Object.keys(pend).length) await S.setMeta("pendingDel", {});
    // кірмей тұрып өзгерген чаттар
    for (const c of S.list()) if (c.updated > E.meta.lastSyncAt) E.meta.dirty[c.id] = c.updated;
    await saveMeta();
  }
  const saveMeta = () => S.setMeta(metaKey(), E.meta);

  /** S.save()/deleteChat()-тен шақырылады */
  S.onSync = async (id, deleted) => {
    if (!user) {
      if (deleted) { const p = (await S.getMeta("pendingDel")) || {}; p[id] = Date.now(); await S.setMeta("pendingDel", p); }
      return;
    }
    const at = Date.now();
    if (deleted) E.meta.deleted[id] = at; else delete E.meta.deleted[id];
    E.meta.dirty[id] = at;
    saveMeta(); schedule();
  };

  function schedule(ms = 1500) { clearTimeout(timer); timer = setTimeout(sync, ms); }

  function toCloud(c) {
    const d = JSON.parse(JSON.stringify(c));
    if (size(d) > MAX_DOC) d.versions = (d.versions || []).slice(-1);
    if (size(d) > MAX_DOC && d.files) { delete d.files.body; delete d.files.css; delete d.files.js; }
    if (size(d) > MAX_DOC) d.versions = [];
    while (size(d) > MAX_DOC && (d.messages || []).length > 2) { d.messages.shift(); d.trimmed = (d.trimmed || 0) + 1; }
    return size(d) > MAX_DOC ? null : d;
  }

  const busy = () => (Q.chat && Q.chat.isBusy && Q.chat.isBusy()) || (Q.code && Q.code.isRunning && Q.code.isRunning());

  async function cycle() {
    const { db, F } = fb, uid = user.uid, m = E.meta;
    const col = F.collection(db, "users", uid, COL);
    let changed = false;
    // 1) Pull: бұлттағы жаңа өзгерістер
    const q = m.cursor ? F.query(col, F.where("_srv", ">", F.Timestamp.fromMillis(m.cursor)), F.orderBy("_srv")) : F.query(col);
    const snap = await F.getDocs(q);
    let max = m.cursor;
    for (const d of snap.docs) {
      const v = d.data(), t = v._srv && v._srv.toMillis ? v._srv.toMillis() : 0;
      if (t > max) max = t;
      delete v._srv; v.id = d.id;
      const local = S.chats.get(v.id);
      const localAt = Math.max(local ? local.updated : 0, m.deleted[v.id] || 0, m.dirty[v.id] || 0);
      if (v.updated <= localAt && (local || m.deleted[v.id])) continue;       // біздікі жаңа — кейін жібереміз
      if (v.id === S.cur.id && busy()) continue;                               // жұмыс үстіндегі чатты бұзбаймыз
      if (v.deleted) { if (local) await S.removeLocal(v.id); }
      else await S.applyRemote(v);
      delete m.dirty[v.id]; delete m.deleted[v.id]; changed = true;
    }
    m.cursor = max; await saveMeta();
    // 2) Push: жергілікті өзгерістер
    for (const id of Object.keys(m.dirty)) {
      const at = m.dirty[id];
      let rec;
      if (m.deleted[id]) rec = { id, updated: m.deleted[id], deleted: true };
      else { const c = S.chats.get(id); if (!c) { delete m.dirty[id]; continue; } rec = toCloud(c); }
      if (!rec) { delete m.dirty[id]; continue; }                              // тым үлкен — тек құрылғыда қалады
      const ref = F.doc(col, id);
      const ok = await F.runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        if (cur.exists() && (cur.data().updated || 0) > rec.updated) return false;   // бұлтта жаңасы бар
        tx.set(ref, { ...rec, _srv: F.serverTimestamp() });
        return true;
      });
      if (m.dirty[id] === at) { delete m.dirty[id]; delete m.deleted[id]; }
      if (!ok) {
        const s = await F.getDoc(ref);
        if (s.exists()) { const v = s.data(); delete v._srv; v.id = id; if (v.deleted) await S.removeLocal(id); else if (!(id === S.cur.id && busy())) await S.applyRemote(v); changed = true; }
      }
      await saveMeta();
    }
    m.lastSyncAt = Date.now(); await saveMeta();
    return changed;
  }

  function sync() {
    if (!user || !fb) return Promise.resolve();
    if (E.running) { E.again = true; return E.running; }
    if (!navigator.onLine) { setStatus("offline"); return Promise.resolve(); }
    E.running = (async () => {
      try {
        do {
          E.again = false;
          setStatus("syncing");
          const changed = await cycle();
          setStatus("synced");
          if (changed && C.onRemote) C.onRemote();
        } while (E.again);
      } catch (e) {
        const msg = String((e && e.message) || e);
        const perm = e && e.code === "permission-denied";
        setStatus(navigator.onLine && !/offline|network|unavailable/i.test(msg) ? "error" : "offline",
          perm ? "Firestore ережелері бұл коллекцияға рұқсат бермейді (rules деплой керек)." : msg.slice(0, 200));
      } finally { E.running = null; }
    })();
    return E.running;
  }

  async function onUser(u) {
    user = u;
    clearInterval(poll);
    if (u) {
      try { localStorage.setItem("qwq.cloud", "1"); } catch (e) {}
      await loadMeta();
      setStatus("syncing");
      sync();
      poll = setInterval(() => { if (document.visibilityState === "visible") sync(); }, 45000);
    } else setStatus("idle");
    emit();
  }

  function init() {
    // алдыңғы жолы кірген болса, сессияны үнсіз қалпына келтіреміз
    let was = false; try { was = localStorage.getItem("qwq.cloud") === "1"; } catch (e) {}
    if (was && C.configured) load().catch(() => {});
    addEventListener("online", () => schedule(500));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") schedule(500); });
  }

  // сынақ үшін: жалған Firebase енгізу (нақты Google кіруінсіз синхронды тексеру)
  const inject = (f, u) => { fb = f; return onUser(u); };
  Object.assign(C, { getFb: load, init, signIn, signOut, sync, toCloud, E, inject });
  Q.cloud = C;
})(window.QWQ);
