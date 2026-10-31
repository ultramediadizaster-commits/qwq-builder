# Firebase (Google арқылы кіру + синхрон)

QWQ Builder QWQ жобасындағы дәл сол Firebase жобасын қолданады: **qwq-app-23553**
(Auth — Google, Firestore — `users/{uid}/builderChats/{chatId}`).

## 1. Authorized domains (міндетті, бір рет)

Google терезесі сайттың доменін Firebase танымаса ашылмайды (`auth/unauthorized-domain`).

1. https://console.firebase.google.com → **qwq-app** жобасы (`qwq-app-23553`).
2. Сол жақ мәзір: **Build → Authentication → Settings** (Параметры) → **Authorized domains**.
3. **Add domain** басып, мынаны жаз: `ultramediadizaster-commits.github.io` → **Add**.
   (`localhost` әдепкіде бар. Сайт басқа доменге көшсе, оны да осылай қос.)

## 2. Firestore ережелері (міндетті, бір рет)

`firestore.rules` — QWQ ережелерінің дәл көшірмесі, тек рұқсат етілген коллекциялар тізіміне `builderChats` қосылған.
Әр пайдаланушы тек өз `users/{uid}/…` құжаттарын оқиды/жазады, қалғанына тыйым.

```bash
cd firebase
firebase deploy --only firestore:rules --project qwq-app-23553
```

Деплой жасалмағанша синхрон `permission-denied` қатесін береді (баптауларда «Қате: …» көрінеді),
ал кірмей жұмыс істеу (тек браузерде сақтау) әдеттегідей жұмыс істей береді.

## Деректер қайда сақталады

- Кірмесе: тек осы құрылғының браузері (IndexedDB `qwq-builder`).
- Кірсе: сол чаттар `users/{uid}/builderChats/{chatId}` құжаттарына синхрондалады (құжат ≤ 900 КБ).
  Чат құжатында хабарламалар, идея, файлдар (жоспар, мәлімет, index.html, бөліктер), нәтиже, агент қадамдары, QR сілтемесі бар.
  QWQ API кілті бұлтқа **жіберілмейді**.
