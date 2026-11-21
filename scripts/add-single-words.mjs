// Adds Lela's one-word replies (data-src/single-words.json) to db.json as the optional "singleWords" collection.
// Safe to run again: it only sets that one key and leaves every other collection untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'data-src', 'single-words.json'), 'utf8'));
const dbPath = path.join(root, 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
// Lela's lines for one-word answers (added to "phrases"; existing phrases are kept exactly as they are).
const NEW_PHRASES = [
  { id: 'ph-single-vocab-01', type: 'single-vocab', text: 'I know that word! "{word}" means "{tamil}" in Tamil. You can say, "{example}" Now can you make your own sentence with "{word}"?', tamil: '"{word}" என்றால் "{tamil}". இப்போது இந்த வார்த்தையில் உங்கள் சொந்த வாக்கியம் சொல்ல முடியுமா?' },
  { id: 'ph-single-vocab-02', type: 'single-vocab', text: 'Nice word! "{word}" means "{tamil}". For example: "{example}" Try a full sentence with it.', tamil: '"{word}" = "{tamil}". இதை வைத்து ஒரு முழு வாக்கியம் சொல்லுங்கள்.' },
  { id: 'ph-single-vocab-03', type: 'single-vocab', text: 'Good one, "{word}"! It means "{tamil}". You can say, "{example}" Now you try, in a full sentence.', tamil: '"{word}" என்றால் "{tamil}". இப்போது நீங்கள் முழு வாக்கியத்தில் சொல்லுங்கள்.' },
  { id: 'ph-single-unknown-01', type: 'single-unknown', text: 'Hmm, I am not sure what you mean by "{word}". Can you tell me more? Try a full sentence, like "I want to talk about {word}."', tamil: '"{word}" என்று நீங்கள் என்ன சொல்ல வருகிறீர்கள் என்று எனக்குத் தெரியவில்லை. இன்னும் கொஞ்சம் சொல்ல முடியுமா? முழு வாக்கியத்தில் சொல்லிப் பாருங்கள்.' },
  { id: 'ph-single-unknown-02', type: 'single-unknown', text: 'I did not quite understand "{word}". What do you mean? Please say it in a sentence, and I will help you.', tamil: '"{word}" எனக்குச் சரியாகப் புரியவில்லை. நீங்கள் என்ன சொல்ல வருகிறீர்கள்? ஒரு வாக்கியத்தில் சொல்லுங்கள், நான் உதவுகிறேன்.' },
  { id: 'ph-single-unknown-03', type: 'single-unknown', text: 'Sorry, I am not sure about "{word}". Can you explain what you mean in a few words?', tamil: 'மன்னிக்கவும், "{word}" பற்றி எனக்குத் தெரியவில்லை. சில வார்த்தைகளில் விளக்க முடியுமா?' },
];
const oldPhrases = JSON.stringify(db.phrases.filter((p) => !p.type.startsWith('single-')));
const have = new Set(db.phrases.map((p) => p.id));
for (const p of NEW_PHRASES) if (!have.has(p.id)) db.phrases.push(p);
if (JSON.stringify(db.phrases.filter((p) => !p.type.startsWith('single-'))) !== oldPhrases) throw new Error('refusing to change existing phrases');
const before = Object.fromEntries(Object.entries(db).filter(([k]) => k !== 'singleWords' && k !== 'phrases').map(([k, v]) => [k, JSON.stringify(v)]));
db.singleWords = words.map((w, i) => ({ id: `sw${String(i + 1).padStart(3, '0')}`, ...w }));
for (const [k, v] of Object.entries(before)) if (JSON.stringify(db[k]) !== v) throw new Error(`refusing to change "${k}"`);
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');
console.log(`db.json: singleWords = ${db.singleWords.length}; other collections untouched.`);
