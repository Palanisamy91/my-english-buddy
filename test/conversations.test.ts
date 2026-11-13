import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CATEGORIES, TOTAL_NEW, loadExistingTexts, norm, validateEntries } from '../scripts/conversations-lib.mjs';
import { validateDb } from '../scripts/sync-db.mjs';

const root = new URL('../', import.meta.url);
const db = JSON.parse(readFileSync(new URL('db.json', root), 'utf8'));
const conv = db.conversations as Record<string, string>[];

test('exactly 2,000 new conversations are in db.json, split as planned', () => {
  assert.equal(TOTAL_NEW, 2000);
  assert.equal(conv.length, 2000);
  for (const [id, c] of Object.entries(CATEGORIES)) assert.equal(conv.filter((x) => x.category === id).length, c.count, id);
});

test('ids, questions and replies are all unique, and ids follow cv-<prefix>-NNNN', () => {
  assert.equal(new Set(conv.map((c) => c.id)).size, 2000);
  assert.equal(new Set(conv.map((c) => norm(c.en))).size, 2000);
  assert.equal(new Set(conv.map((c) => norm(c.reply))).size, 2000);
  for (const c of conv) assert.match(c.id, /^cv-[a-z]{2}-\d{4}$/);
});

test('every conversation has English, Tamil, reply, Tamil reply and a category', () => {
  const cats = new Set((db.conversationCategories as { id: string }[]).map((c) => c.id));
  for (const c of conv) {
    assert.ok(cats.has(c.category), c.id);
    assert.ok(/[஀-௿]/.test(c.tamil) && /[஀-௿]/.test(c.replyTamil), c.id);
    assert.ok(c.en && c.reply && c.context, c.id);
  }
});

test('the new conversations do not repeat any sentence that existed before', () => {
  const old = JSON.parse(JSON.stringify(db));
  delete old.conversations;
  delete old.conversationCategories;
  // loadExistingTexts reads db.json from disk, so check the old collections directly as well
  const oldTexts = new Set<string>();
  for (const q of old.questions) { oldTexts.add(norm(q.text)); oldTexts.add(norm(q.example ?? '')); }
  for (const d of old.dialogues) for (const t of d.turns) { oldTexts.add(norm(t.lela)); oldTexts.add(norm(t.example ?? '')); }
  for (const c of conv) assert.ok(!oldTexts.has(norm(c.en)) && !oldTexts.has(norm(c.reply)), c.id);
  assert.ok(loadExistingTexts(new URL('.', root).pathname).size > 6000);
});

test('the source files in data-src/conversations rebuild exactly these 2,000 entries', () => {
  const dir = new URL('data-src/conversations/', root);
  let n = 0;
  const texts: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const arr = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Record<string, string>[];
    n += arr.length;
    arr.forEach((e) => texts.push(norm(e.en)));
  }
  assert.equal(n, 2000);
  assert.deepEqual(new Set(texts), new Set(conv.map((c) => norm(c.en))));
});

// items 13 and 14 added 30 vocab topics and 3,000 words (89 topics and 352 words existed before); everything else is unchanged.
test('the original collections still have their original sizes, and db.json validates', () => {
  const sizes = { levels: 3, modes: 10, topics: 119, questions: 592, dialogues: 33, vocabulary: 3352, mistakes: 240, grammarNotes: 16, intents: 13, phrases: 111 };
  for (const [k, v] of Object.entries(sizes)) assert.equal(db[k].length, v, k);
  assert.deepEqual(validateDb(db), []);
  assert.deepEqual(validateEntries(conv.map(({ id: _id, ...rest }) => rest), new Set(), { near: false }), []);
});
