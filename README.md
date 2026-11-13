# My English Buddy

A free English-practice app for Tamil speakers, built with **Angular + TypeScript** (standalone components, signals, RxJS).
Learn every day, speak with your microphone, and practise role-plays. **No login, no server, no database, no paid API.**
Progress is saved in your own browser. Lessons and vocabulary work **offline**.

## What is inside

| Module | What you get |
|---|---|
| Vocabulary | **2,519 words** in 8 groups (daily life, office, software development, interviews, meetings, telephone, travel, general English). Each has Tamil meaning, part of speech, pronunciation guide, example + Tamil translation, synonyms, level. Search, group and level filters, favourites, pagination. |
| Sentence library | **1,140 sentences** in 7 groups (daily conversation, office, interview answers, requesting help, technical issues, asking questions, professional). Tamil meaning + when to use it. Filter by present/past/future/perfect/modal, statements/questions/negatives/requests. **329** have a "simple, natural alternative". |
| Grammar | 16 short lessons in simple Tamil (tenses, question formation, negatives, polite requests, articles, prepositions, conditional) with typical mistakes of Tamil speakers. |
| Daily lesson | 10 new words + 10 new sentences per day, then about 24 practice questions (meaning quiz, Tamil→word, fill in the blank, sentence rearrangement, choose-the-translation, typed translation), then speaking. |
| Revision | Spaced revision with Leitner boxes (1, 2, 4, 8, 16, 32 days): flash cards and quiz. Wrong words come back tomorrow and are listed as "needs practice". |
| Speaking | **Speak & correct**: say any English sentence, see exactly what the microphone heard ("What you said"), get the "Correct sentence" with a simple reason for each fix, tap **Speak corrected sentence** to hear the corrected version (not your original), or **Try again**. Also: repeat a sentence, free speaking, and **15 role-plays** (office meetings, interviews, everyday situations). Your words are compared with the target (green = said, red = missing), grammar mistakes are explained in Tamil, and natural alternative expressions are suggested (144 phrase tips). Everything can be listened to. |
| Progress | Streak, lessons completed, words known, quiz average, 14-day chart, backup/restore file. |
| Chat | The earlier free-chat screen (type or speak, rule-based correction, Tamil translation). |

### Rule-based vs AI (important)

All corrections in this app are **rule-based**: 49 hand-written grammar rules plus a hand-written phrase list. They run on your device, work offline, and give the same answer every time. They are **not AI**. They only know common beginner mistakes, so they miss errors and can be wrong. Every feedback card says *"Rule-based check · not AI"*. An **AI-powered** label exists in the code (`CheckerKind`) but no AI checker is included, because that would need an internet service that usually costs money.

## Requirements

- Node.js **20.19+** (or 22.12+) and npm
- A modern browser. **Voice input** works in **Chrome or Edge** with internet (it uses the browser's speech service). Firefox and some others cannot do voice input: typing always works.

## Run it

```bash
cd my-english-buddy
npm install
npm start          # opens http://localhost:4200
```

Production build (also writes the file list that offline mode needs):

```bash
npm run build      # output: dist/my-english-buddy/browser
```

Host `dist/my-english-buddy/browser` on any static host (GitHub Pages, Netlify ...). Offline mode needs **https** (or localhost). Open the site once while online: the service worker then saves the whole app and all lessons (about 2.5 MB).

## Test it

```bash
npm test           # 14 unit tests: speech comparison, spaced revision, daily plan, exercises, progress storage
npm run test:data  # 6 data tests: counts, every entry valid, no duplicates, Tamil present
npm run data:check # validate the source data files
```

Manual checklist: open **Daily** → finish the 4 steps → close the browser → reopen: Home shows the steps as done and the streak is 1. Open **Words** → search "deadline", mark a favourite, switch to ♥ Favourites. Open **Speak** → Role-play. Turn off Wi-Fi and reload: everything you opened still works.

## Where things are

```
public/data/            built JSON (manifest, vocab/<group>.json, sentences/<group>.json, grammar, roleplays, expressions)
data-src/               the editable source files (many small part-N.json files per group)
scripts/build-data.mjs  validates data-src and writes public/data   ("npm run data")
scripts/make-precache.mjs  lists built files for offline mode (runs inside "npm run build")
public/sw.js            service worker (offline)
src/app/models/         TypeScript interfaces
src/app/core/           pure logic (no Angular, unit tested): srs, plan, exercises, speech-compare, progress-state
                        + services: data, progress, storage, lesson, feedback
src/app/services/       speech (microphone + voice), correction (49 rules), tamil-translation
src/app/shared/         speak button, voice input, feedback panel, exercise runner
src/app/features/       screens: home, daily, vocabulary, sentences, grammar, revision, speaking(+role-play), progress, about
src/app/components/chat the free-chat screen
test/                   unit and data tests
docs/DATA-FORMAT.md     the JSON format
```

**Content is separate from code.** Words, sentences, lessons and role-plays are only in JSON. Each screen loads just the file it needs (one group at a time, about 100-190 KB) and shows 15-20 items per page.

### Adding or fixing content

1. Edit or add a `data-src/vocab/<group>/part-N.json` (or sentences / grammar / roleplays / expressions). Format: `docs/DATA-FORMAT.md`.
2. `npm run data` — it rejects mistakes (missing Tamil, duplicate words, a "future" sentence without *will*, an example that does not contain the word ...) and rebuilds `public/data`.
3. Raise `CACHE_VERSION` in `public/sw.js` so phones fetch the new data.

## Make an Android app (Capacitor)

Full guide, including the microphone popup, App Settings help, building and installing the APK: **`docs/ANDROID.md`**.

```bash
npm install @capacitor/core @capacitor-community/speech-recognition capacitor-native-settings   # same major as your Capacitor
npm install -D @capacitor/cli @capacitor/android      # only if you have no android folder yet
npx cap init "My English Buddy" com.example.englishbuddy --web-dir=dist/my-english-buddy/browser   # only the first time
npm run android:setup      # adds RECORD_AUDIO (and the speech-service <queries>) to AndroidManifest.xml
npm run android:sync       # build + copy into the Android project
npx cap open android       # then Build > Build APK(s)
```

Inside the Android app, voice input uses the phone's own recogniser through the plugin (Android's WebView has none). The app checks the microphone permission before listening, shows Android's popup, asks again after one denial, and opens App Settings when Android will not ask any more. **This was tested only with a simulated plugin, not on a real phone.**

## Known limits (please read)

- **Content was drafted by AI and checked only by programs** (format, duplicates, Tamil script present, consistent labels). It has **not** been reviewed by a Tamil teacher or English teacher. Expect some awkward Tamil, a few weak synonyms, and small errors. Edit the JSON when you find one.
- Voice input needs internet and Chrome/Edge; recognition can mishear. In the Android app it uses the phone's recogniser via the speech-recognition plugin (see docs/ANDROID.md).
- The role-play partner follows a fixed script. It does not understand free answers: it compares your words with the suggested replies and checks your grammar with the rules.
- Pronunciation guides are English-style respellings, not audio. Listen buttons use your device's voice (quality varies; some phones have no English voice installed).
- Progress lives in this browser only. Clearing site data deletes it. Use **Progress → Download backup**.
- Daily lessons start with the easiest words of each group. After about 114 days the sentences start again.

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails with an engine/peer error | Use Node 20.19+; delete `node_modules` and `package-lock.json`, run again. |
| Microphone button greyed out | Not Chrome/Edge, or the page is not https/localhost. Type instead. |
| "Microphone is blocked" | Click the lock icon in the address bar → Microphone → Allow → reload. |
| No sound on Listen | Your device has no English voice; install one in the system's text-to-speech settings. |
| Old data after you changed JSON | Run `npm run data`, raise `CACHE_VERSION` in `public/sw.js`, hard-reload. |
| Blank page when opened from a file | Serve it (`npm start` or any web server); do not double-click index.html. |

## How this was verified

Built and tested in a sandbox without access to the npm registry, so `npm install`, `ng serve` and `ng build` were **not** run. Instead:
the app was compiled with the real Angular **22.2.3** AOT compiler (strict templates: 0 errors, 0 warnings), bundled with esbuild, and driven in headless **Chromium** with fake speech APIs (end-to-end checks, including the Speak & correct flow with empty speech, microphone-blocked, unsupported-browser and recognition-error cases: daily lesson, all five exercise types, persistence after reload, search/filter/pagination/favourites, revision, speaking feedback, role-play, backup/corrupt-storage handling, error and retry, and the full app working with the network switched off). The unit tests (core, 49-rule correction suite) and 6 data tests also pass. `package.json` asks for Angular 20.3, which has not been installed here; if `npm install`/`ng build` reports a version problem, run `ng update` or tell me the error.


## Swapping in an AI corrector later (no UI change)

The screens only talk to the `SentenceCorrector` interface (`src/app/core/sentence-corrector.ts`). The free default is `RuleBasedCorrector`. To use an AI service later, write a class that implements `SentenceCorrector` (calling **your own backend**, never an API key inside the app) and add `{ provide: SENTENCE_CORRECTOR, useClass: MyAiCorrector }` to `providers` in `src/app/app.config.ts`. Set `kind: 'ai'` and the badge changes automatically.

## Talk with Lela (live conversation)

Open **Lela** in the menu. Pick a mode (10) and level (3), press **Start conversation**. Lela greets you in a female English voice, listens after she finishes speaking, remembers your name and answers, asks follow-ups, and never repeats a question until every topic is used.

- Wrong sentence: Lela says "That's incorrect. You should say: ...", shows original and corrected sentences, an English explanation and a Tamil explanation, asks you to repeat, checks the repeat and praises you. A sentence the rules find no mistake in gets "Excellent! Your sentence is correct."
- Commands you can say: "repeat", "I don't know", "change the topic", "let's talk about cooking", "bye".
- Controls: speed, repeat voice, stop speaking, mic on/off, Tamil on/off, topic picker, New conversation, History.

### Content: `db.json`
`db.json` in the project root holds topics, questions, dialogues, vocabulary, common mistakes, grammar notes, intents and phrases. Edit it, then run `npm run db` (it validates and copies it to `public/data/db.json`; `npm start` and `npm run build` do this automatically). `npm run db:check` only validates. See `docs/DB-FORMAT.md`. `npm run api` starts json-server on the same file (this option is untested).

### AI later
`CONVERSATION_BRAIN` and `LELA_CORRECTOR` are injection tokens. Provide your own implementation that calls **your own backend**. Never put an API key in the Angular app.

### Honest limits of Lela
- The free version is database-driven: keyword matching and stored questions. It does not understand every sentence.
- Corrections are rule-based (stored mistake patterns + grammar rules), not AI. It misses many errors, and "Excellent! Your sentence is correct." only means no rule fired.
- The English and Tamil text was drafted by AI and has not been reviewed by a teacher; please check the Tamil.
- Voice depends on the device. If no female English voice is installed Lela says so. Speech recognition needs Chrome or Edge and internet; Android WebView needs a plugin.
- Tested here with a real Angular 22 compiler, 37 unit tests and headless-browser tests with fake speech. Not tested with a real microphone, or with `npm install` on your machine.

## Conversation practice (2,000 exchanges)
Open **Talk** in the menu. Pick a group (daily life, office, friends, family, shopping, travel, telephone, interviews, restaurants, relationships, advanced), a level, or search. Each card shows what someone says (with Tamil and a speaker button); tap **Show reply** for a natural answer with Tamil. All data is in `db.json` (`conversations`) and works offline. Details: `docs/DB-FORMAT.md`.

## Layout, theme and speech (latest update)

- **Responsive:** phone (320-767) has a compact header, hamburger drawer, bottom navigation and 2-column cards; tablet 3 columns; laptop a collapsible left sidebar; large desktop 4 columns. Purple and white theme, Lucide-style icons (`src/app/shared/icon.component.ts`), no extra dependencies.
- **Speaking:** language en-IN. Interim and final text are kept apart, earlier text is kept, repeated phrases from the engine are collapsed, and low-confidence results show as `[Unclear]`. Confidence comes per result, not per word. You can Replay (text-to-speech of what was captured, not a recording), Edit, Add more, then Check. The result has three parts: What I said, Corrected English, Explanation (English + Tamil). The original is never changed silently.
- **Lela:** voice picker (Indian English female first), preview, speed and pitch, typing dots, replay button, favourites and history kept on the device. (You wrote "Leela"; the app uses "Lela".)
- **Offline:** lessons, conversations and typed correction work offline; speech recognition needs internet and Chrome/Edge, and the app says so.
- Tests: 44 unit tests, plus browser tests at 320/375/430, tablets, 1366 and 1920 with simulated speech.
- **Not tested:** a real microphone, real device voices, the Android APK, and `npm install` / `ng build` on your machine.

### Lela's spoken (female) voice
- Uses the browser's `speechSynthesis`; no paid API. Speech recognition (your microphone) is a separate feature and a separate service.
- A browser gives no gender flag, so the app **guesses from the voice name** (e.g. Heera, Veena, Zira = female; David, Mark = male). Order: female Indian English (en-IN), other female English, then English voices whose gender cannot be told (with an honest warning). **A male-named voice is never the default**: if only male voices exist, Lela stays silent, says so on screen, and lists the voices so you can choose one yourself.
- Voice settings: voice picker (labelled female / male / gender unknown), Preview, speed, pitch, volume, and a "Lela speaks every reply" switch. The choice is saved on the device so the voice is the same every time. Every Lela message has a replay button (it works even when voice mode is off).
- Tested with simulated voices in Chromium. **Not tested:** real audio on an Android phone or a desktop; whether a voice really sounds female is for your ears. Press Preview to check.

## 500 new sentences, 500 new words and one-word replies (item 12)

- **Data:** the app's existing pipeline (`data-src/` -> `npm run data` -> `public/data/`) now has 10 new word groups (50 each, 500 total) and 12 new sentence groups (500 total: 8 x 42 and 4 x 41). Totals are now 3,019 words and 1,640 sentences. The old 2,519 words and 1,140 sentences are untouched (the 18 old data files compared identical). `npm run data` fails unless the new groups are exactly 500 + 500, and it rejects duplicates, including against `db.json`.
- **New fields:** new words have `meaning` (simple English); new sentences have `explain` (simple English) and `words` (useful vocabulary), besides English, Tamil, context and category.
- **Screens:** Words and Sentences have search (it also searches meaning, explanation and useful words), group filters, a Learned / Not yet learned filter, "Mark as learned", favourites, pronunciation buttons, **Practise** (say or type, then a rule-based word-by-word check) and **Explain with Lela** (fixed wording from the data, not AI; she can read it aloud in her voice). Learned words are saved on the device.
- **Offline:** all of it is cached by the service worker.
- **Daily plan:** groups that still have unseen items are used first.
- **Lela, one word:** `db.json` has a new optional list `singleWords` (150 words) plus 6 new `phrases`. "Hungry" gets "Oh, you're hungry! You can say, 'I am feeling hungry.' What would you like to eat?" with a teaching card (what you typed, the full sentence, explanation, Tamil). A word from the vocabulary list is explained. Any other word: Lela asks what you mean and does not guess. Existing `db.json` collections are unchanged (`scripts/add-single-words.mjs` only adds).
- **Limits:** the Tamil in the new content was written by an AI model and has not been reviewed by a Tamil speaker. One-word replies work only for the 150 listed words and the 352 vocabulary words; the answer to a question like "What is your favourite colour?" may get an "I am not sure what you mean" once.

## 2,000 more words, 2,000 more sentences and Live conversation (item 14)

- **2,000 new words** in 20 groups of 100 (`data-src/vocab/<group>/part-*.json`): Workplace essentials, Business vocabulary, Digital life, Feelings and moods, Travel and tourism, Money and shopping, Health and fitness, Education and study, Everyday verbs, Useful adjectives, Phrasal verbs 1 and 2, Idioms 1 and 2, Advanced words 2, Everyday talk, Home and family, Food and cooking, Social life, News and society. Same record fields as before (word, pronunciation, simple meaning, Tamil, example + Tamil, similar words, level; the group is the category) plus a unique id (`ya001`...).
- **2,000 new sentences** in 20 groups of 100 (`data-src/sentences/<group>/part-*.json`): Daily routines, Natural conversations, Workplace discussions, Job interviews, Travel, Shopping, Social situations, Everyday questions, Giving answers, Grammar in use, Advanced communication, Health and the doctor, Education, Money and banking, Technology talk, Opinions and agreeing, Problems and solutions, Plans and invitations, Polite requests, Telling past events. Every sentence has Tamil, a simple explanation, important words, and three new fields: `usage` (real-life use), `leelaQ` (the question Leela asks) and `answer` (a suggested answer). The Sentences screen shows them, with speak/type practice on the suggested answer.
- **Checks:** `npm run data` fails unless the new groups are exactly 2,000 words and exactly 2,000 sentences and nothing is a duplicate (also against all older words, sentences, conversations and `db.json`). The earlier 500+500 and 1,000-word batches and all older data files are unchanged. The library is now 6,019 words and 3,640 sentences.
- **Leela's database:** `node scripts/add-vocab-batch2.mjs` then `node scripts/add-vocab-batch3.mjs` (always in this order) copy the words into `db.json` as vocabulary topics (`vocab-x-*`, `vocab-y-*`); they never change existing entries. Then `node scripts/sync-db.mjs`.
- **Vocabulary -> sentences:** each word card has "Sentences with this word", which opens Sentences already searched.
- **Live conversation:** on the Leela screen choose "Live conversation" (or switch back to "Normal chat" at any time; nothing is lost). The microphone stays open between turns, so you do not press it each time; the words you are saying appear as you speak; you can talk over Leela to interrupt her (or press "Interrupt Lela"); long silences get a gentle check-in and then pause listening (the chat is kept; press "Continue listening"). Echo protection ignores Leela's own voice coming back through the speaker, but without headphones some devices still hear her, so use the button then.
- **What Live is NOT:** it is not a full-duplex AI conversation. Your browser's speech recognition turns your speech into text (on most browsers this needs the internet), and Leela answers from the app's own lessons and rules, which work offline. She does not listen and talk at the same time like a person, and she cannot talk about anything outside her topics. No paid service is used.
- **Not verified:** a real microphone, real Android and desktop voices and the Android APK were not tested here (the browser tests use simulated speech). The Tamil text and examples are AI-written and not reviewed by a Tamil speaker.

## 1,000 extra vocabulary words (item 13)

- **Data:** 10 new word groups of 100 (`data-src/vocab/<group>/part-*.json` -> `npm run data`): Daily conversation, Office, Emotions, Travel, Shopping, More action verbs, Describing words, Communication, Technology, Advanced vocabulary. Every word has the English word, a simple English meaning, Tamil meaning, pronunciation, example (+ Tamil), similar words (synonyms), category (its group) and level. The library is now 4,019 words. `npm run data` fails unless the new groups are exactly 1,000 words, and it rejects duplicates (also against `db.json`). The sentence library is not changed (still 1,640).
- **Lela:** `node scripts/add-vocab-batch2.mjs` copies the 1,000 words into `db.json` as 10 new vocabulary topics (Lela's topic list, "vocab-x-..."), so Lela can teach them in vocabulary practice. It refuses to change any existing topic, word or other collection. Then `node scripts/sync-db.mjs` checks and copies `db.json`.
- **Collecting words from conversations:** while you talk to Lela, the vocabulary words that appear (in her messages, your messages and her corrections) are matched by whole word (also regular forms like walked/walking) and saved on this device in your progress. Words Lela teaches in vocabulary practice or from a one-word reply are marked "taught by Lela", other words "mentioned". Words from your saved earlier conversations are collected too. This only adds to the list: it never changes favourites, learned marks or the revision list. See Vocabulary -> "From my conversations", and the "Words from this chat" panel on the Lela screen (favourite / revise / learned).
- **Vocabulary screen:** search, group chips, favourites, level and learned filters (as before), plus a "My learning progress" panel (learned per group and for the 1,000 extra words).
- **Offline:** everything is saved in this device's localStorage and cached by the service worker.
- **Limits:** the Tamil and examples were written by an AI model and have not been reviewed by a Tamil speaker. Collection is simple word matching, not understanding: a common word such as "meeting" counts as "mentioned" whenever it appears. Only the 1,000 new and the earlier words that are in the library are matched. The 2,000 stored conversations are Lela's content, not your history, so they are not scanned.

## About data
Old vocabulary and sentences are static JSON in `public/data/` (from `data-src/`). Lela's content is `db.json`. Sentences you speak are never added to either; they only go through the corrector.
