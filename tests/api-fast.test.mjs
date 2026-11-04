// Жылдам режим (js/api.js): модель тізбегі, бірінші токен/үнсіздік шегі, ұзындық шегі, thinkingLevel. Іске қосу: node --test tests/api-fast.test.mjs
import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const store = { key: "k", base: "", uid: "u", usage: { inc() {} } };
globalThis.window = globalThis;
globalThis.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
globalThis.QWQ = { store };
new Function("window", readFileSync(join(here, "..", "js", "api.js"), "utf8"))(globalThis);
const api = QWQ.api;

// mock: behavior(req body, n) → "ok" | "hang" | "slow:ms" | "long" | "500"
let behavior = () => "ok", seen = [];
const server = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const body = JSON.parse(b || "{}"); seen.push(body);
    const act = behavior(body, seen.length);
    if (act === "500") { res.writeHead(500); return res.end("{}"); }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    const send = (t) => res.write("data: " + JSON.stringify({ type: "delta", text: t }) + "\n\n");
    if (act === "hang") return;                       // тақырып жіберілді, токен жоқ
    if (act.startsWith("slow:")) return setTimeout(() => { send("Кеш жауап."); res.end("data: [DONE]\n\n"); }, +act.slice(5));
    if (act === "stall-mid") { send("Бірінші бөлік. "); return; }   // токен келді, одан кейін үнсіз
    const W = "⚠️ Интернеттен іздеу қазір қолжетімсіз — жауап менің өз білімімнен, соңғы деректер болмауы мүмкін.";
    if (act === "notice-tail") { send("Сәлем! Бұл жауап."); send("\n\n⚠️ Интер"); send("неттен іздеу қазір қолжетімсіз — жауап менің өз білімімнен, соңғы деректер болмауы мүмкін."); return res.end("data: [DONE]\n\n"); }
    if (act === "notice-head") { send(W + "\n\n"); send("Нақты жауап осы."); return res.end("data: [DONE]\n\n"); }
    if (act === "notice-only") { send(W); return res.end("data: [DONE]\n\n"); }
    if (act === "long") { for (let i = 0; i < 40; i++) send("Бұл ұзын сөйлем нөмір " + i + ". "); return res.end("data: [DONE]\n\n"); }
    send("Сәлем! "); send("Бұл жауап."); res.end("data: [DONE]\n\n");
  });
});
await new Promise((r) => server.listen(0, r));
store.base = "http://127.0.0.1:" + server.address().port;
test.after(() => server.close());
test.beforeEach(() => { seen = []; behavior = () => "ok"; });

test("жылдам режим: thinkingLevel мен модель серверге жіберіледі", async () => {
  const r = await api.chat({ message: "x", agent: true, models: api.CHAIN, thinkingLevel: "minimal" });
  assert.strictEqual(r.answer, "Сәлем! Бұл жауап.");
  assert.strictEqual(seen[0].thinkingLevel, "minimal"); assert.strictEqual(seen[0].model, "gemini-3.5-flash-lite"); assert.strictEqual(seen[0].agent, true);
  assert.ok(r.ttft >= 0);
});
test("бірінші токен келмесе — келесі модельмен бірден қайталайды (күтусіз)", async () => {
  behavior = (b, n) => (n === 1 ? "hang" : "ok");
  const t0 = Date.now();
  const r = await api.chat({ message: "x", agent: true, models: api.CHAIN, firstMs: 300 });
  assert.strictEqual(r.answer, "Сәлем! Бұл жауап.");
  assert.deepStrictEqual(seen.map((b) => b.model), ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
  assert.ok(Date.now() - t0 < 1500, "backoff жоқ: " + (Date.now() - t0));
});
test("барлық модель қатып қалса — түсінікті қате, шексіз емес", async () => {
  behavior = () => "hang";
  const t0 = Date.now();
  await assert.rejects(api.chat({ message: "x", agent: true, models: api.CHAIN, firstMs: 150, tries: 3 }), (e) => e.code === "stall" && /қатып қалды/.test(e.message));
  assert.strictEqual(seen.length, 3); assert.ok(Date.now() - t0 < 2000);
  assert.deepStrictEqual(seen.map((b) => b.model), ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"]);
});
test("5xx → келесі модель", async () => {
  behavior = (b, n) => (n === 1 ? "500" : "ok");
  const r = await api.chat({ message: "x", agent: true, models: api.CHAIN, stream: true });
  assert.ok(r.answer); assert.strictEqual(seen[1].model, "gemini-3.1-flash-lite");
});
test("maxChars: ұзын жауап ағыны үзіліп, соңғы толық сөйлемге дейін қысқарады", async () => {
  behavior = () => "long";
  const r = await api.chat({ message: "x", agent: true, models: api.CHAIN, maxChars: 200 });
  assert.ok(r.answer.length >= 150 && r.answer.length <= 260, "ұзындық " + r.answer.length);
  assert.match(r.answer, /\.$/); assert.strictEqual(seen.length, 1);
});
test("ескі режим (qwq.fast=0): thinkingLevel жіберілмейді, модель тізбегі жоқ", async () => {
  localStorage.setItem("qwq.fast", "0");
  try {
    const r = await api.chat({ message: "x", agent: true, model: "gemini-3.5-flash-lite", models: api.CHAIN, thinkingLevel: "minimal" });
    assert.ok(r.answer); assert.strictEqual(seen[0].thinkingLevel, undefined); assert.strictEqual(seen[0].model, "gemini-3.5-flash-lite");
  } finally { localStorage.removeItem("qwq.fast"); }
});

test("Worker ескерту жолы (соңында, ағынмен бөлініп) пайдаланушыға көрінбейді", async () => {
  behavior = () => "notice-tail";
  const fulls = [];
  const r = await api.chat({ message: "x", onDelta: (_, full) => fulls.push(full) });
  assert.strictEqual(r.answer, "Сәлем! Бұл жауап.");
  assert.ok(fulls.length && fulls.every((f) => !/⚠|Интер|қолжетімсіз/.test(f)), JSON.stringify(fulls));
});
test("Worker ескерту жолы жауаптың басында болса да алынып тасталады", async () => {
  behavior = () => "notice-head";
  const fulls = [];
  const r = await api.chat({ message: "x", onDelta: (_, full) => fulls.push(full) });
  assert.strictEqual(r.answer, "Нақты жауап осы.");
  assert.ok(fulls.every((f) => !/қолжетімсіз/.test(f)));
});
test("жауап тек ескертуден тұрса — бос жауап ретінде қайталанады, ескерту көрсетілмейді", async () => {
  behavior = (b, n) => (n === 1 ? "notice-only" : "ok");
  const r = await api.chat({ message: "x", agent: true, models: api.CHAIN });
  assert.strictEqual(r.answer, "Сәлем! Бұл жауап."); assert.strictEqual(seen.length, 2);
});
test("stripNotice: қалыпты «⚠️» мәтінін тиіспейді", () => {
  assert.strictEqual(api.stripNotice("⚠️ Назар аудар: кілтті жаспа", true), "⚠️ Назар аудар: кілтті жаспа");
  assert.strictEqual(api.stripNotice("Мәтін ⚠️ ортасында", true), "Мәтін ⚠️ ортасында");
});
test("Builder ешқашан web:true жібермейді: чат пен жылдам конвейер web:false; web:true тек ескі (qwq.fast=0) режимде", () => {
  const read = (f) => readFileSync(join(here, "..", "js", f), "utf8");
  assert.ok(!/web:\s*true/.test(read("chat.js")) && !/web:\s*true/.test(read("codegen.js")) && !/web:\s*true/.test(read("fix.js")) && !/web:\s*true/.test(read("websearch.js")));
  const a = read("agent.js"), i = a.indexOf("web: true");
  assert.ok(i > a.indexOf("if (Q.api.fast()) {", a.indexOf("const searchP")), "web:true жылдам тармақтан кейін тұр");
  assert.strictEqual(a.split("web: true").length - 1, 1);
});
