# db.json format (Lela)

Root file `db.json`. Edit it, then `npm run db` (validate + copy to `public/data/db.json`). `npm run db:check` validates only.
Existing records are never overwritten by the generator scripts; edit by hand.

| Collection | Purpose | Key fields |
|---|---|---|
| `meta` | version, notes | |
| `levels` (3) | beginner / intermediate / advanced | speech rate, style |
| `modes` (10) | the conversation modes | `groups`, `topicIds`, `sequential` |
| `topics` (89) | conversation topics | `id`, `group`, `title`, `keywords`, `reactions` (keyword -> reply) |
| `questions` (592) | what Lela asks | `topicId`, `level`, `text`, `example`, `followUps`, Tamil hint |
| `dialogues` (33) | role-play scenes | `topicId`, `level`, `turns[{lela, example}]` |
| `vocabulary` (352 + 1,000 added in item 13 = 3,352; items 13 and 14 added 3,000 words in topics `vocab-x-*` and `vocab-y-*`) | words | `word`, `meaning`, `tamil`, `example`, `topicId` |
| `mistakes` (240) | correction rules | `pattern` (regex), `replace`, `wrongExample`, `rightExample`, `english`, `tamil` |
| `grammarNotes` (16) | grammar practice | `expect` regex, `example`, explanations |
| `intents` (13) | commands / small talk | `patterns`, `action`, `standalone` |
| `phrases` (105) | Lela's fixed sentences (greetings, praise, "That's incorrect...") | `type`, `text`; `{name}` is a placeholder |

Validation rules: Tamil text must contain Tamil characters; every mistake pattern must fix its own `wrongExample` into `rightExample` and must not match the right one; minimum amounts per topic.

## Conversations (2,000 practice exchanges)
`conversations` (2,000) and `conversationCategories` (11) were added after the first release. Nothing else in the file was changed.

| Field | Meaning |
|---|---|
| `id` | `cv-<prefix>-NNNN`, unique (prefixes: dl, of, fr, fa, sh, tv, tp, iv, rs, rl, ad) |
| `category` | daily-life, office, friends, family, shopping, travel, telephone, interviews, restaurants, relationships, advanced |
| `context` | short English description of the situation |
| `level` | beginner / intermediate / advanced |
| `en`, `tamil` | what the first speaker says, and its Tamil |
| `reply`, `replyTamil` | a natural spoken answer, and its Tamil |

Source files: `data-src/conversations/<category>-N.json` (one JSON array each, without ids).
`node scripts/add-conversations.mjs --check` validates them (unique sentences and replies, no near-duplicates, nothing equal to existing project text, exact counts). `npm run conversations:add` appends them to `db.json` once and refuses to run again; it also proves that every old collection is unchanged. To add more later, add entries to `db.json` by hand (the next id is `cv-xx-` + the next number) and run `npm run db:check`.

## AI extension points
`src/app/lela/conversation-brain.ts` (`CONVERSATION_BRAIN`) and `lela-corrector.ts` (`LELA_CORRECTOR`). Provide an implementation that calls your own server. Never ship an API key in the frontend.

## Honest limits
Keyword and regex matching only. It cannot understand every sentence, and the content is AI-drafted and unreviewed.


## singleWords (optional)

One entry per single word Lela can answer with a full sentence:
`{ id, word, say, sayTamil, sentence, sentenceTamil, ask, askTamil }`.
Lela says `say`, then "You can say, '<sentence>'", then asks `ask`. Add words in `data-src/single-words.json` and run `node scripts/add-single-words.mjs`, then `npm run db`.
The phrase types `single-vocab` and `single-unknown` (in `phrases`) are used for other single words.
