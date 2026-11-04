# BLOCKERS — сенің қадамдарың

1. **Нақты демо жазбасы** (қорғау үшін ең маңыздысы): Баптаулар → API кілтін енгіз → «Жазу» → чатта идея талқыла → «Кодқа өту» → «Агентке жіберу» → аяқталған соң Баптаулар → «Жазбаны жүктеу» → `demo-recording.js` файлын `js/demo-recording.js` орнына сал (бір ғана нақты іске қосу). Содан кейін «Демо» дәл сол жүрісті қайта ойнатады.
2. **Google кіру** (qwq-builder-2): Firebase Console → Authentication → Sign-in method → Google қос; Authentication → Settings → Authorized domains-ке қорғау өтетін домен/localhost қос; Firestore қосып, `firebase/firestore.rules` ережелерін жарияла (`firebase deploy --only firestore:rules --project qwq-builder-2`). Конфиг `js/cloud-config.js`-те дайын. Мен деплой жасамадым.
3. **Тур аудиосы**: 4-қадамда дауыс «Осыдан қосымша жасау» дейді, батырма енді «Кодқа өту». Қаласаң edge-tts-пен қайта жаз (`audio/`), немесе батырма атын қайтар.
4. Нақты API (Worker) қосылған күйде end-to-end тексерілмеді (квотаны үнемдеу үшін); барлығы демо/mock арқылы.
5. `C:\Users\470s\Desktop\QWQ Builder\screenshots\` — менің алғашқы тексерістен қалған 2 уақытша сурет (өшіру бұғатталды), қаласаң өшір.

## 2-кезең
6. **Нақты 3 тексеріс (ойын, лендинг, құрал)**: `http://localhost:8137/tests/real.html` (немесе өз серверің) ашып, фреймдегі Баптауларға API кілтіңді енгіз, «Бастау» бас — 3 нақты агент іске қосылады, нәтижесі мен ақаулары бетте шығады, әр қосымшаны фреймде көріп скриншот ал. Менде кілт оқуға рұқсат жоқ болды, сондықтан мен жасамадым.
7. Стильдер қаріптері — жүйелік (сыртқы қаріп жоқ); қаласаң Google Fonts қосуға болады.

## Дауыспен енгізу (серверлік тану)
8. **QWQ Worker-ді қайта деплой ет** (`C:\Users\470s\Desktop\QWQ`): `/api/asr` енді Gemini → Groq Whisper → Workers AI Whisper → Fish тізбегімен жұмыс істейді.
   ```
   cd C:\Users\470s\Desktop\QWQ
   npm run test:worker          # worker.js жинап, тестілерді жүргізеді
   npx wrangler secret put GROQ_KEY      # егер әлі қойылмаса
   cd worker && npx wrangler deploy      # (немесе worker.js мазмұнын Cloudflare панельіне қой)
   ```
   `GEMINI_KEY` бұрыннан бар; `AI` байланысы Workers AI Whisper үшін керек. Админ панельден `asrChain`, `asrModels` баптауларын өзгертуге болады.
9. **Салыстыру** (≤6 сұрау): деплойдан кейін `QWQ_KEY=qwq_... node tools/asr-compare.mjs` — әр провайдер қазақша үлгіден CER/WER, уақыт көрсетеді.
10. **Android нативті қор**: `QwqSpeechPlugin.kt` қосылды (kk-KZ SpeechRecognizer) — APK-ны қайта жина: `npm run android:debug`. Gradle-мен құрастырылған жоқ (тексерілмеген).

## Жылдамдату (Builder клиенті)
11. **Нақты өлшеу** (менде кілт жоқ, сондықтан нақты уақыттар өлшенген жоқ): `tests/bench.html` ашып (сервер: `python -m http.server`), API кілтін енгіз → «Бастау». Бет ескі (`qwq.fast=0`) және жаңа режимді 4 нақты сұрауда (чат + ойын + лендинг + құрал) жүргізіп, кесте шығарады (1-ші сөз, жоспар, іздеу, код, тексеру, жақсарту, жиыны, ақау). Жылдам режимді өшіру: консольде `localStorage.setItem("qwq.fast","0")`.
12. Worker `thinkingLevel` өрісін қабылдайды (body.thinkingLevel), `minimal` қабылданбаса 400 → Worker өзі деңгейсіз қайталайды. Тексерілмеген.
