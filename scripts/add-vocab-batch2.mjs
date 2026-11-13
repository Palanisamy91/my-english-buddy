// Item 13: adds the 1,000 batch-2 words (public/data/vocab/<cat>.json, ids xd001...) to db.json as Lela vocabulary,
// with 10 new vocab topics. Existing topics/words/collections are never changed. Safe to run again.
// Run `node scripts/build-data.mjs` first (it assigns the ids), then this, then `node scripts/sync-db.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(root, 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const src = fs.readFileSync(path.join(root, 'scripts', 'build-data.mjs'), 'utf8');
const cats = [...src.matchAll(/\{ id: '([^']+)', prefix: '(x\w)', label: '([^']+)', labelTamil: '([^']+)', added: 100, batch: 2 \}/g)].map((m) => ({ id: m[1], prefix: m[2], label: m[3], labelTamil: m[4] }));
if (cats.length !== 10) throw new Error(`expected 10 batch-2 categories, found ${cats.length}`);

const frozen = JSON.stringify({ ...db, topics: undefined, vocabulary: undefined });
const oldTopics = JSON.stringify(db.topics.filter((t) => !t.id.startsWith('vocab-x-')));
const oldWords = JSON.stringify(db.vocabulary.filter((v) => !v.topicId.startsWith('vocab-x-')));
db.topics = db.topics.filter((t) => !t.id.startsWith('vocab-x-'));
db.vocabulary = db.vocabulary.filter((v) => !v.topicId.startsWith('vocab-x-'));
let order = Math.max(...db.topics.filter((t) => t.kind === 'vocab' && !t.id.startsWith('vocab-x-') && !t.id.startsWith('vocab-y-')).map((t) => t.order));
let n = 0;
for (const c of cats) {
  const list = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'vocab', `${c.id}.json`), 'utf8'));
  if (list.length !== 100) throw new Error(`${c.id}: ${list.length} words, expected 100`);
  const topicId = `vocab-x-${c.id}`;
  db.topics.push({ id: topicId, group: 'vocab', kind: 'vocab', title: c.label, titleTamil: c.labelTamil, order: ++order, keywords: [...new Set([...c.id.split('-'), 'words', 'vocabulary'])] });
  for (const w of list) {
    db.vocabulary.push({ id: w.id, topicId, word: w.word, pron: w.pron, pos: w.pos, tamil: w.tamil, example: w.example, exampleTamil: w.exampleTamil, level: w.level });
    n++;
  }
}
if (JSON.stringify(db.topics.filter((t) => !t.id.startsWith('vocab-x-'))) !== oldTopics || JSON.stringify(db.vocabulary.filter((v) => !v.topicId.startsWith('vocab-x-'))) !== oldWords) throw new Error('refusing to change existing topics/words');
if (JSON.stringify({ ...db, topics: undefined, vocabulary: undefined }) !== frozen) throw new Error('refusing to change other collections');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2) + '\n');
console.log(`db.json: +${cats.length} vocab topics, +${n} words (vocabulary now ${db.vocabulary.length}); other data untouched.`);
