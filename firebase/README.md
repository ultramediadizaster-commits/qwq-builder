# Firebase (Google арқылы кіру + синхрон)

QWQ Builder өз жеке Firebase жобасын қолданады: **qwq-builder**
(Auth — Google, Firestore — `users/{uid}/builderChats/{chatId}`). Басқа жобалармен байланысы жоқ.

## 1. Firebase консолінде (бір рет)

1. **Build → Authentication → Sign-in method** → **Google** қосулы болсын (Enable).
2. **Build → Authentication → Settings → Authorized domains** → **Add domain** → `ultramediadizaster-commits.github.io`.
   (`localhost` әдепкіде бар. Сайт басқа доменге көшсе, оны да қос.) Бұл болмаса, Google терезесі `auth/unauthorized-domain` береді.
3. **Build → Firestore Database → Create database** (production mode, өзіңе жақын аймақ). База жасалмаса, ережелерді де деплой жасау мүмкін емес.

## 2. Firestore ережелері

`firestore.rules` — тек `users/{uid}/builderChats/{chatId}`: әр пайдаланушы тек өз құжаттарын оқиды/жазады, қалғанына тыйым.

Деплой (қолданушының аккаунты `qwq-builder` жобасының иесі/редакторы болуы керек):

```bash
cd firebase
firebase login:add            # qwq-builder жобасы жасалған Google аккаунтымен
firebase deploy --only firestore:rules --project qwq-builder
```

Немесе қолмен: Firebase консолі → Firestore Database → **Rules** → `firestore.rules` мазмұнын қойып → **Publish**.

Деплой жасалмағанша синхрон `permission-denied` қатесін береді (баптауларда «Қате: …» көрінеді),
ал кірмей жұмыс істеу (тек браузерде сақтау) әдеттегідей жұмыс істей береді.

## Деректер қайда сақталады

- Кірмесе: тек осы құрылғының браузері (IndexedDB `qwq-builder`).
- Кірсе: сол чаттар `users/{uid}/builderChats/{chatId}` құжаттарына синхрондалады (құжат ≤ 900 КБ).
  Чат құжатында хабарламалар, идея, файлдар (жоспар, мәлімет, index.html, бөліктер), нәтиже, агент қадамдары, QR сілтемесі бар.
  QWQ API кілті бұлтқа **жіберілмейді**.
