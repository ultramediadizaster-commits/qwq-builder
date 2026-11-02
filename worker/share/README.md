# qwq-share

QWQ Builder қосымшасын қысқа сілтеме мен QR арқылы бөлісуге арналған бөлек Worker.
Негізгі QWQ 5 Worker-мен ешқандай байланысы жоқ.

## Деплой (бір рет)

```bash
cd worker/share
npx wrangler login
npx wrangler kv namespace create SHARES
```

Шыққан `id` мәнін `wrangler.toml` ішіндегі `REPLACE_WITH_KV_NAMESPACE_ID` орнына қой, сосын:

```bash
npx wrangler deploy
```

Шыққан мекенжай (мысалы `https://qwq-share.<аккаунт>.workers.dev`) QWQ Builder баптауларындағы
«Бөлісу сервері» өрісіне жазылады (әдепкісі `https://qwq-share.mirasnrmatov.workers.dev`).

## Маршруттар

| Әдіс | Жол | Не істейді |
|------|-----|------------|
| POST | `/api/share` | `{html, title?}` қабылдап, `{id, url}` қайтарады (1 МБ дейін, 30 күн сақталады) |
| GET  | `/s/:id` | Сақталған қосымшаны ашады (CSP `sandbox`, домен деректеріне қол жетпейді) |

## PWA және ортақ деректер (5–6-кезең)
- `/s/:id` енді орама бет: `manifest.json`, `sw.js` (офлайн кэш), «Телефонға орнату» және iPhone нұсқауы; қосымша өзі `/s/:id/raw` ішінде CSP sandbox-пен ашылады (opaque origin, сондықтан service worker орамада тұр).
- Белгіше: `/s/:id/icon.svg` — атаудың бірінші әрпі және `--accent`/theme-color түсі; iOS үшін орама canvas-пен PNG белгіше жасайды.
- `/api/data/:appId[/:key]` GET/PUT/DELETE: бір қосымшаға ≤100 КБ, бір IP+қосымшаға минутына 120 оқу / 30 жазу (isolate жадында, шамамен). Қатаң лимит керек болса Cloudflare Rate Limiting байланысын қосыңыз. Қосымшаға екі адам бір мезгілде жазса, соңғысы жеңеді (KV — eventual consistency).
- Өзгерістерді қолдану үшін қайта деплой: `npx wrangler deploy` (мен деплой жасаған жоқпын).
