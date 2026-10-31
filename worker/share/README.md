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
