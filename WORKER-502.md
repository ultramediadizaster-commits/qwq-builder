# QWQ Worker: web:true іздеуі неге 502 береді (Worker-ге тиіспедім, көзден оқылды)

Жол: `POST /api/chat {web:true}` → `runApi` (worker.src.js ~761): `body.agent === true && !web ? agentThink : think`.
Яғни web:true кезінде тез Gemini-агент жолы емес, ескі `think` жолы іске қосылады.

1. `think` → `wantWeb` → `searchAny` (~497): Google grounding (`webSearch`, `google_search` құралы). Тегін Gemini кілтте grounding лимиті 0 → 403/429 → `GROUND_OFF_UNTIL` бір сағатқа өшеді. Одан кейін `wikiSearch` (тек kk/ru/en, сұрақтың өз сөздері) — сұрау ұзын болса (біздікі секілді) ештеңе таппайды → `web=null` → `ctx.webDown=true`.
2. Содан кейін `streamAny(models)` (~288): `pickModels` тізімі (`s.model`, `fastModel`, `fallback` — Gemma/Gemini). Агент жоспар сұрауы бір мезгілде (параллель) сол кілтпен жүреді → минуттық 429 → бәрі құлайды → `allFailed` → `failErr` (~47): 429 емес болса **502 «Барлық модель жауап бермеді»**; 429 болса 429.
3. Қосымша: `think` ішінде Worker `web_search` нәтижесін 12 с-тан артық күтуі мүмкін (grounding + модель тізбегі), ал клиентте 12 с шек бар.

Түзету жолы (Worker-де, мен істемедім):
- `runApi`: `web:true` болса да `agent:true` + `model` келсе, `agentThink` жолын қолдану және іздеу нәтижесін `searchAny`-мен алдын ала қосу.
- `wikiSearch`: сұрақты қысқарту (атау немесе 2 негізгі сөз), әйтпесе «және» логикасынан нәтиже шықпайды.
- `searchAny`: іздеу сәтсіз болса, 502 емес, `200 + webDown` қайтару (қазір `webDown` ескертуі бар, бірақ модельдер құласа 502).
- Жоспар мен іздеу сұрауларын бір кілтте параллель жібермеу немесе іздеу үшін бөлек `searchModel` кілтін қолдану.

Клиент резерві: `js/websearch.js` (Wikipedia kk+ru + r.jina.ai), Worker іздеуі қате/12 с-тан соң іске қосылады.
