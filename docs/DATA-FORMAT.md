# My English Buddy – dataset specification

Source files live in `data-src/` (many small "part" files per category so they are easy to edit).
`node scripts/build-data.mjs` validates everything, assigns ids, and writes the app's files into `public/data/`.
Check one file while you write it: `node scripts/build-data.mjs --file data-src/vocab/office/part-1.json`

All Tamil must be in Tamil script, natural written Tamil (not word-for-word machine output), short and clear.

## Vocabulary  `data-src/vocab/<category>/part-N.json`  (JSON array)
Categories: daily-life, office, software-development, interviews, meetings, telephone, travel, general
```json
{
  "word": "deadline",                  // lowercase, 1-3 tokens, letters/hyphen/apostrophe only
  "tamil": "கெடு தேதி",                 // short Tamil meaning (max ~8 words)
  "pos": "noun",                        // noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|phrasal verb|phrase
  "pron": "DED-line",                   // English respelling, syllables split by '-', STRESSED syllable in CAPITALS
  "example": "We must meet the deadline.",   // 4-18 words, natural; MUST contain the headword or a regular form (-s -ed -ing -d -ly)
  "exampleTamil": "நாம் கெடு தேதிக்குள் முடிக்க வேண்டும்.",
  "synonyms": ["due date", "time limit"],   // 1-4 English synonyms or near-synonyms
  "level": "beginner"                   // beginner | intermediate | advanced
}
```
Words must be unique across ALL vocab files.

## Sentences  `data-src/sentences/<category>/part-N.json`
Categories: daily-conversation, office-communication, interview-answers, requesting-help, technical-issues, asking-questions, professional-communication
```json
{
  "en": "I will send you the report tomorrow.",    // 3-22 words, ends with . ? or !
  "tamil": "நான் நாளை உங்களுக்கு அறிக்கையை அனுப்புவேன்.",
  "context": "Promising to send a document to a colleague",   // 3-14 words, English, when/where you would say it
  "tense": "future",     // present | present-continuous | past | future | present-perfect | modal | imperative
  "type": "statement",   // statement | question | negative | request
  "alt": { "en": "I'll email you the report tomorrow.", "tamil": "..." }   // OPTIONAL simple natural alternative (different wording, same meaning)
}
```
Rules: `question` must end with `?`; `negative` must contain not/n't/never/no/nothing/nobody/nowhere/none;
`future` must contain will/'ll/won't/going to/shall. Sentences must be unique across ALL files.
`request` = polite request/imperative ("Could you please...", "Please send...").

## Grammar `data-src/grammar.json`, Role-plays `data-src/roleplays.json`, Expressions `data-src/expressions.json`
See the validator (`scripts/build-data.mjs`) for the exact shape; examples are in the file headers of the authoring brief.
