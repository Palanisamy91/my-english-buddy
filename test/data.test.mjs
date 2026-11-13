// Integrity tests for the built learning data in public/data (run: npm run test:data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVocab, checkSentence, checkGrammar, checkRoleplay, checkExpression } from '../scripts/build-data.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../public/data/' + p, import.meta.url), 'utf8'));
const manifest = read('manifest.json');
const TAMIL = /[஀-௿]/;

test('requirements: at least 2,000 words and 1,000 sentences', () => {
  assert.ok(manifest.totals.vocab >= 2000, 'vocab ' + manifest.totals.vocab);
  assert.ok(manifest.totals.sentences >= 1000, 'sentences ' + manifest.totals.sentences);
  assert.equal(manifest.vocabCategories.length, 48); // 8 original + 10 (item 12) + 10 (item 13) + 20 (item 14)
  assert.equal(manifest.sentenceCategories.length, 39); // 7 original + 12 (item 12) + 20 (item 14)
});

test('every vocabulary file matches the manifest and every entry is valid, with unique words and ids', () => {
  const words = new Set(); const ids = new Set();
  for (const c of manifest.vocabCategories) {
    const list = read(c.file);
    assert.equal(list.length, c.count, c.id);
    list.forEach((e, i) => {
      const {id, ...rest} = e;
      assert.deepEqual(checkVocab(rest, c.id + '#' + i, { needMeaning: !!c.added }), []);
      assert.ok(id.startsWith(c.prefix) && !ids.has(id), id); ids.add(id);
      assert.ok(!words.has(e.word), 'duplicate word ' + e.word); words.add(e.word);
    });
  }
  assert.equal(words.size, manifest.totals.vocab);
});

test('vocabulary covers all levels and every entry has Tamil', () => {
  const levels = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const c of manifest.vocabCategories) for (const e of read(c.file)) { levels[e.level]++; assert.ok(TAMIL.test(e.tamil) && TAMIL.test(e.exampleTamil)); }
  for (const [k, v] of Object.entries(levels)) assert.ok(v >= 200, k + ' ' + v);
});

test('sentences: valid, unique, Tamil + context, all tenses and types present', () => {
  const seen = new Set(); const tense = {}; const type = {}; let alt = 0;
  for (const c of manifest.sentenceCategories) {
    const list = read(c.file);
    assert.equal(list.length, c.count, c.id);
    list.forEach((e, i) => {
      const {id, ...rest} = e;
      assert.deepEqual(checkSentence(rest, c.id + '#' + i, { needExtras: !!c.added, needLeela: c.batch === 3 }), []);
      assert.ok(TAMIL.test(e.tamil) && e.context.length > 5);
      const key = e.en.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      assert.ok(!seen.has(key), 'duplicate ' + e.en); seen.add(key);
      tense[e.tense] = (tense[e.tense] ?? 0) + 1; type[e.type] = (type[e.type] ?? 0) + 1; if (e.alt) alt++;
    });
  }
  for (const t of ['present', 'past', 'future']) assert.ok(tense[t] >= 150, t + ' ' + tense[t]);
  assert.ok((tense['present'] ?? 0) + (tense['present-continuous'] ?? 0) >= 300);
  assert.ok(type['question'] >= 200 && type['negative'] >= 150, JSON.stringify(type));
  assert.ok(alt >= 250, 'alternatives ' + alt);
});

test('grammar, role-plays and expressions are valid', () => {
  read('grammar.json').forEach((g, i) => assert.deepEqual(checkGrammar(g, 'g' + i), []));
  const rps = read('roleplays.json');
  rps.forEach((r, i) => assert.deepEqual(checkRoleplay(r, 'r' + i), []));
  for (const g of ['office-meeting', 'interview', 'everyday']) assert.ok(rps.filter((r) => r.group === g).length >= 3, g);
  const ex = read('expressions.json');
  ex.forEach((x, i) => assert.deepEqual(checkExpression(x, 'e' + i), []));
  assert.equal(new Set(ex.map((x) => x.plain)).size, ex.length);
  assert.ok(ex.length >= 100);
});

test('validator rejects bad entries (negative control)', () => {
  assert.ok(checkVocab({ word: 'x', tamil: 'abc', pos: 'noun?', pron: 'x', example: 'hi', exampleTamil: 'x', synonyms: [], level: 'easy' }, 't').length >= 5);
  assert.ok(checkSentence({ en: 'Is it done', tamil: 'முடிந்ததா?', context: 'asking about work', tense: 'present', type: 'question' }, 't').length >= 1);
  assert.ok(checkSentence({ en: 'We will go.', tamil: 'x', context: 'plan', tense: 'future', type: 'statement' }, 't').length >= 1);
});

test('item 12: exactly 500 new words and 500 new sentences, all loaded, none duplicated', async () => {
  const fs = await import('node:fs');
  const dir = new URL('../public/data/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dir), 'utf8'));
  const words = manifest.vocabCategories.filter((c) => c.added && !c.batch);
  const sents = manifest.sentenceCategories.filter((c) => c.added && !c.batch);
  assert.equal(words.length, 10);
  assert.equal(sents.length, 12);
  let w = 0, s = 0;
  const seen = new Set();
  for (const c of words) {
    const list = JSON.parse(fs.readFileSync(new URL(c.file, dir), 'utf8'));
    assert.equal(list.length, c.count);
    w += list.length;
    for (const e of list) { assert.ok(e.meaning && e.tamil && e.example && e.exampleTamil, e.word); assert.ok(!seen.has(e.word), 'duplicate ' + e.word); seen.add(e.word); }
  }
  seen.clear();
  for (const c of sents) {
    const list = JSON.parse(fs.readFileSync(new URL(c.file, dir), 'utf8'));
    assert.equal(list.length, c.count);
    s += list.length;
    for (const e of list) { assert.ok(e.explain && e.tamil && e.words?.length, e.en); assert.ok(!seen.has(e.en), 'duplicate ' + e.en); seen.add(e.en); }
  }
  assert.equal(w, 500);
  assert.equal(s, 500);
});

test('item 13: exactly 1,000 more words in 10 groups, unique across the whole library, sentences unchanged', async () => {
  const fs = await import('node:fs');
  const dir = new URL('../public/data/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dir), 'utf8'));
  const batch = manifest.vocabCategories.filter((c) => c.batch === 2);
  assert.equal(batch.length, 10);
  const all = new Set();
  let n = 0, total = 0;
  for (const c of manifest.vocabCategories) {
    for (const e of JSON.parse(fs.readFileSync(new URL(c.file, dir), 'utf8'))) {
      total++;
      assert.ok(!all.has(e.word), 'duplicate word ' + e.word); all.add(e.word);
      if (c.batch === 2) {
        n++;
        assert.ok(e.word && e.meaning && e.tamil && e.pron && e.example && e.exampleTamil && e.level && e.synonyms?.length, e.word);
        assert.ok(/[\u0B80-\u0BFF]/.test(e.tamil));
      }
    }
  }
  assert.equal(n, 1000);
  assert.equal(total, 6019);
  assert.equal(manifest.totals.sentences, 3640);
  const db = JSON.parse(fs.readFileSync(new URL('db.json', dir), 'utf8'));
  assert.equal(db.vocabulary.filter((v) => v.topicId.startsWith('vocab-x-')).length, 1000);
  assert.equal(db.vocabulary.length, 3352);
  assert.equal(db.conversations.length, 2000);
});

test('item 14: exactly 2,000 more words and 2,000 more sentences, unique, with the new sentence fields', async () => {
  const fs = await import('node:fs');
  const dir = new URL('../public/data/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dir), 'utf8'));
  const wordGroups = manifest.vocabCategories.filter((c) => c.batch === 3);
  const sentGroups = manifest.sentenceCategories.filter((c) => c.batch === 3);
  assert.equal(wordGroups.length, 20);
  assert.equal(sentGroups.length, 20);
  const ids = new Set();
  let words = 0;
  for (const c of wordGroups) for (const e of JSON.parse(fs.readFileSync(new URL(c.file, dir), 'utf8'))) {
    words++; assert.ok(!ids.has(e.id), 'duplicate id ' + e.id); ids.add(e.id);
    assert.ok(e.word && e.meaning && e.tamil && e.pron && e.example && e.exampleTamil && e.synonyms?.length && e.level, e.id);
    assert.ok(/[஀-௿]/.test(e.tamil) && /[஀-௿]/.test(e.exampleTamil));
  }
  assert.equal(words, 2000);
  const seen = new Set();
  let sentences = 0;
  for (const c of sentGroups) for (const e of JSON.parse(fs.readFileSync(new URL(c.file, dir), 'utf8'))) {
    sentences++; assert.ok(!ids.has(e.id), 'duplicate id ' + e.id); ids.add(e.id);
    const key = e.en.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    assert.ok(!seen.has(key), 'duplicate sentence ' + e.en); seen.add(key);
    assert.ok(e.tamil && e.explain && e.words?.length && e.usage && e.leelaQ?.endsWith('?') && e.answer && e.context && e.tense && e.type, e.id);
    assert.ok(/[஀-௿]/.test(e.tamil));
  }
  assert.equal(sentences, 2000);
  const db = JSON.parse(fs.readFileSync(new URL('db.json', dir), 'utf8'));
  assert.equal(db.vocabulary.filter((v) => v.topicId.startsWith('vocab-y-')).length, 2000);
  assert.equal(db.conversations.length, 2000);
});
