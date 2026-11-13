#!/usr/bin/env node
/**
 * db.json (project root) is the conversation database of "Lela".
 * This script checks it and copies it to public/data/db.json, which is the file the app loads
 * (a browser app cannot read the project root, and the copy keeps the app working offline).
 *
 *   node scripts/sync-db.mjs              check db.json, then copy it to public/data/db.json
 *   node scripts/sync-db.mjs --check      check only, write nothing
 *   node scripts/sync-db.mjs --part <collection> <file> [--topics <topics.json>]
 *                                         check ONE collection file (an array) while writing content
 *
 * It never changes db.json. Edit db.json by hand (or with the tools you like), then run it again.
 * No dependencies. Exit code 1 when any problem is found.
 *
 * The same file also works with json-server (every top-level array becomes an endpoint such as
 * /topics, /questions, /dialogues, /mistakes). See docs/DB-FORMAT.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const KINDS = ['chat', 'scene', 'grammar', 'vocab'];
export const GROUPS = ['personal', 'daily', 'office', 'software', 'interview', 'reallife', 'telephone', 'travel', 'advanced', 'grammar', 'vocab'];
export const PHRASE_TYPES = {
  greeting: 3, 'greeting-plain': 3, 'greeting-return': 3, 'ack-positive': 8, 'ack-neutral': 8, 'ack-short': 5, 'topic-intro': 5,
  'topic-switch': 4, 'topic-more': 4, 'correction-intro': 4, 'repeat-ask': 4, 'praise-repeat': 5, retry: 4,
  'give-up': 3, correct: 3, 'no-speech': 3, 'hint-intro': 3, 'scene-end': 3, end: 3, goodbye: 3,
  'vocab-intro': 3, 'vocab-praise': 3, 'vocab-retry': 3, 'grammar-intro': 3, 'grammar-expect': 3,
  'not-understood': 4, 'no-more-questions': 2, 'nice-to-meet': 3,
};
// Added later; only required when db.json has the optional singleWords list.
export const OPTIONAL_PHRASE_TYPES = { 'single-vocab': 3, 'single-unknown': 3 };
export const INTENT_ACTIONS = ['reply', 'repeat', 'change-topic', 'end', 'help', 'slower', 'faster', 'skip'];
const TAMIL = /[஀-௿]/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
const COLLECTIONS = ['levels', 'modes', 'topics', 'questions', 'dialogues', 'vocabulary', 'mistakes', 'grammarNotes', 'intents', 'phrases'];

function str(o, key, problems, where, { min = 1, max = 300, tamil = false, optional = false } = {}) {
  const v = o[key];
  if (v === undefined && optional) return;
  if (typeof v !== 'string' || v.trim() !== v || v.length < min || v.length > max) {
    problems.push(`${where}: "${key}" must be a trimmed string of ${min}-${max} characters`);
    return;
  }
  if (/[\u0000-\u001f]/.test(v)) problems.push(`${where}: "${key}" has control characters`);
  if (tamil && !TAMIL.test(v)) problems.push(`${where}: "${key}" must contain Tamil text`);
  if (!tamil && TAMIL.test(v) && key !== 'labelTamil') problems.push(`${where}: "${key}" must be English (Tamil goes in the Tamil field)`);
}
function oneOf(o, key, list, problems, where) {
  if (!list.includes(o[key])) problems.push(`${where}: "${key}" must be one of ${list.join(', ')}`);
}
function list(o, key, problems, where, { min = 0, max = 50, each } = {}) {
  const v = o[key];
  if (!Array.isArray(v) || v.length < min || v.length > max) {
    problems.push(`${where}: "${key}" must be a list of ${min}-${max} items`);
    return [];
  }
  if (each) v.forEach((item, i) => each(item, `${where}.${key}[${i}]`));
  return v;
}
function compile(pattern, problems, where) {
  if (typeof pattern !== 'string' || pattern.length < 2 || pattern.length > 200) {
    problems.push(`${where}: pattern must be a string of 2-200 characters`);
    return null;
  }
  try {
    return new RegExp(pattern, 'i');
  } catch {
    problems.push(`${where}: pattern is not a valid regular expression`);
    return null;
  }
}

// ---------- one validator per collection ----------

const validators = {
  levels(o, p, w) {
    str(o, 'id', p, w, { max: 20 }); oneOf(o, 'id', LEVELS, p, w);
    str(o, 'label', p, w, { max: 30 }); str(o, 'labelTamil', p, w, { max: 40, tamil: true });
    str(o, 'description', p, w, { max: 200 });
    if (typeof o.defaultRate !== 'number' || o.defaultRate < 0.5 || o.defaultRate > 1.3) p.push(`${w}: defaultRate must be 0.5-1.3`);
  },
  modes(o, p, w) {
    str(o, 'id', p, w, { max: 30 }); str(o, 'label', p, w, { max: 40 }); str(o, 'labelTamil', p, w, { max: 50, tamil: true });
    str(o, 'icon', p, w, { max: 8 }); str(o, 'description', p, w, { max: 200 }); str(o, 'descriptionTamil', p, w, { max: 250, tamil: true });
    const groups = list(o, 'groups', p, w, { max: 12, each: (g, ww) => { if (!GROUPS.includes(g)) p.push(`${ww}: unknown group "${g}"`); } });
    const topicIds = list(o, 'topicIds', p, w, { max: 60, each: (t, ww) => { if (typeof t !== 'string') p.push(`${ww}: must be text`); } });
    if (typeof o.sequential !== 'boolean') p.push(`${w}: sequential must be true or false`);
    if (groups.length === 0 && topicIds.length === 0) p.push(`${w}: needs groups or topicIds`);
  },
  topics(o, p, w) {
    str(o, 'id', p, w, { max: 40 }); if (typeof o.id === 'string' && !ID.test(o.id)) p.push(`${w}: id must be lower-case letters, digits and dashes`);
    oneOf(o, 'group', GROUPS, p, w); oneOf(o, 'kind', KINDS, p, w);
    str(o, 'title', p, w, { max: 60 }); str(o, 'titleTamil', p, w, { max: 80, tamil: true });
    if (!Number.isInteger(o.order) || o.order < 1 || o.order > 99) p.push(`${w}: order must be a whole number 1-99`);
    list(o, 'keywords', p, w, { min: 1, max: 12, each: (k, ww) => { if (typeof k !== 'string' || k !== k.toLowerCase() || k.length < 2) p.push(`${ww}: keywords are lower-case text`); } });
    if (o.kind === 'grammar') str(o, 'grammarNoteId', p, w, { max: 60 });
  },
  questions(o, p, w) {
    str(o, 'id', p, w, { max: 60 }); str(o, 'topicId', p, w, { max: 40 }); oneOf(o, 'level', LEVELS, p, w);
    str(o, 'text', p, w, { max: 200 }); str(o, 'tamil', p, w, { max: 260, tamil: true });
    str(o, 'example', p, w, { max: 220 });
    if (o.capture !== undefined && !['name', 'age', 'hometown', 'job'].includes(o.capture)) p.push(`${w}: capture must be name, age, hometown or job`);
    if (o.reactions !== undefined) {
      list(o, 'reactions', p, w, { max: 4, each: (r, ww) => {
        list(r, 'if', p, ww, { min: 1, max: 8, each: (k, w3) => { if (typeof k !== 'string' || k !== k.toLowerCase() || !/^[a-z0-9' -]{2,30}$/.test(k)) p.push(`${w3}: keywords are lower-case words`); } });
        str(r, 'say', p, ww, { max: 170 });
        if (r.ask !== undefined) { str(r, 'ask', p, ww, { max: 170 }); str(r, 'askTamil', p, ww, { max: 220, tamil: true }); if (typeof r.ask === 'string' && !r.ask.endsWith('?')) p.push(`${ww}: ask must end with ?`); }
      } });
    }
    if (o.expect !== undefined) {
      if (typeof o.expect !== 'object' || o.expect === null) p.push(`${w}: expect must be an object`);
      else {
        const re = compile(o.expect.pattern, p, `${w}.expect`);
        str(o.expect, 'hint', p, `${w}.expect`, { max: 160 }); str(o.expect, 'hintTamil', p, `${w}.expect`, { max: 220, tamil: true });
        if (re && typeof o.example === 'string' && !re.test(o.example)) p.push(`${w}: the example answer does not match its own expect pattern`);
      }
    }
  },
  dialogues(o, p, w) {
    str(o, 'id', p, w, { max: 60 }); str(o, 'topicId', p, w, { max: 40 }); oneOf(o, 'level', LEVELS, p, w);
    str(o, 'title', p, w, { max: 80 }); str(o, 'titleTamil', p, w, { max: 100, tamil: true });
    if (typeof o.setup !== 'object' || o.setup === null) p.push(`${w}: setup must be {en, tamil}`);
    else { str(o.setup, 'en', p, `${w}.setup`, { max: 220 }); str(o.setup, 'tamil', p, `${w}.setup`, { max: 280, tamil: true }); }
    list(o, 'turns', p, w, { min: 5, max: 10, each: (t, ww) => {
      str(t, 'lela', p, ww, { max: 200 }); str(t, 'lelaTamil', p, ww, { max: 260, tamil: true });
      str(t, 'example', p, ww, { max: 200 }); str(t, 'exampleTamil', p, ww, { max: 260, tamil: true });
    } });
  },
  vocabulary(o, p, w) {
    str(o, 'id', p, w, { max: 20 }); str(o, 'topicId', p, w, { max: 40 }); str(o, 'word', p, w, { max: 40 });
    str(o, 'pron', p, w, { max: 40 }); str(o, 'pos', p, w, { max: 20 }); str(o, 'tamil', p, w, { max: 80, tamil: true });
    str(o, 'example', p, w, { max: 200 }); str(o, 'exampleTamil', p, w, { max: 260, tamil: true }); oneOf(o, 'level', LEVELS, p, w);
  },
  mistakes(o, p, w) {
    str(o, 'id', p, w, { max: 50 }); oneOf(o, 'level', LEVELS, p, w);
    const re = compile(o.pattern, p, w);
    str(o, 'replace', p, w, { max: 100, min: 0 });
    str(o, 'wrongExample', p, w, { max: 160 }); str(o, 'rightExample', p, w, { max: 160 });
    str(o, 'english', p, w, { max: 220 }); str(o, 'tamil', p, w, { max: 300, tamil: true });
    if (re && typeof o.wrongExample === 'string' && typeof o.rightExample === 'string') {
      if (!re.test(o.wrongExample)) p.push(`${w}: the pattern does not match its own wrongExample`);
      else {
        const fixed = o.wrongExample.replace(new RegExp(o.pattern, 'i'), o.replace ?? '').replace(/\s+/g, ' ').trim();
        if (fixed.toLowerCase() !== o.rightExample.toLowerCase()) p.push(`${w}: applying the rule to wrongExample gives "${fixed}", not rightExample "${o.rightExample}"`);
      }
      if (new RegExp(o.pattern, 'i').test(o.rightExample)) p.push(`${w}: the pattern also matches the correct sentence (it would loop)`);
    }
  },
  grammarNotes(o, p, w) {
    str(o, 'id', p, w, { max: 60 }); str(o, 'title', p, w, { max: 60 }); str(o, 'titleTamil', p, w, { max: 80, tamil: true });
    str(o, 'summary', p, w, { max: 400 }); str(o, 'summaryTamil', p, w, { max: 600, tamil: true }); str(o, 'formula', p, w, { max: 120 });
    list(o, 'examples', p, w, { min: 1, max: 6, each: (e, ww) => { str(e, 'en', p, ww, { max: 160 }); str(e, 'tamil', p, ww, { max: 220, tamil: true }); } });
  },
  intents(o, p, w) {
    str(o, 'id', p, w, { max: 40 }); oneOf(o, 'action', INTENT_ACTIONS, p, w);
    if (typeof o.standalone !== 'boolean') p.push(`${w}: standalone must be true or false`);
    list(o, 'patterns', p, w, { min: 1, max: 40, each: (x, ww) => { compile(x, p, ww); } });
    list(o, 'replies', p, w, { min: o.action === 'reply' ? 1 : 0, max: 8, each: (r, ww) => { str(r, 'en', p, ww, { max: 220 }); str(r, 'tamil', p, ww, { max: 280, tamil: true }); } });
  },
  phrases(o, p, w) {
    str(o, 'id', p, w, { max: 50 });
    if (![...Object.keys(PHRASE_TYPES), ...Object.keys(OPTIONAL_PHRASE_TYPES)].includes(o.type)) p.push(`${w}: unknown type "${o.type}"`);
    str(o, 'text', p, w, { max: 260 }); str(o, 'tamil', p, w, { max: 320, tamil: true, optional: true });
    if (o.level !== undefined) oneOf(o, 'level', LEVELS, p, w);
  },
};

/** Checks one collection (an array). `ctx` carries the other collections for cross-checks (optional). */
export function validateCollection(name, items, ctx = {}) {
  const problems = [];
  if (!Array.isArray(items)) return [`${name}: must be a list`];
  const ids = new Set();
  items.forEach((item, i) => {
    const where = `${name}[${i}]${item && item.id ? ` (${item.id})` : ''}`;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) { problems.push(`${where}: must be an object`); return; }
    validators[name](item, problems, where);
    if (typeof item.id === 'string') {
      if (ids.has(item.id)) problems.push(`${where}: duplicate id`);
      ids.add(item.id);
    }
  });
  const topics = new Map((ctx.topics ?? []).map((t) => [t.id, t]));
  if (topics.size > 0) {
    if (name === 'questions') for (const q of items) {
      const t = topics.get(q.topicId);
      if (!t) problems.push(`question ${q.id}: unknown topicId "${q.topicId}"`);
      else if (t.kind !== 'chat' && t.kind !== 'grammar') problems.push(`question ${q.id}: topic "${t.id}" is a ${t.kind} topic and takes no questions`);
      else if (t.kind === 'grammar' && !q.expect) problems.push(`question ${q.id}: grammar questions need an "expect" pattern`);
    }
    if (name === 'dialogues') for (const d of items) {
      const t = topics.get(d.topicId);
      if (!t) problems.push(`dialogue ${d.id}: unknown topicId "${d.topicId}"`);
      else if (t.kind !== 'scene') problems.push(`dialogue ${d.id}: topic "${t.id}" is not a scene topic`);
    }
    if (name === 'vocabulary') for (const v of items) {
      const t = topics.get(v.topicId);
      if (!t) problems.push(`word ${v.id}: unknown topicId "${v.topicId}"`);
      else if (t.kind !== 'vocab') problems.push(`word ${v.id}: topic "${t.id}" is not a vocab topic`);
    }
  }
  return problems;
}

/** Checks the whole database, including minimum amounts, so a half-filled db.json cannot ship. */
export function validateDb(db) {
  const problems = [];
  if (typeof db !== 'object' || db === null || Array.isArray(db)) return ['db.json must be an object'];
  for (const name of COLLECTIONS) {
    if (!Array.isArray(db[name])) problems.push(`db.json: "${name}" is missing or is not a list`);
  }
  if (problems.length > 0) return problems;
  const ctx = { topics: db.topics };
  for (const name of COLLECTIONS) problems.push(...validateCollection(name, db[name], ctx));

  const topicIds = new Set(db.topics.map((t) => t.id));
  for (const m of db.modes) for (const id of m.topicIds) if (!topicIds.has(id)) problems.push(`mode ${m.id}: unknown topic "${id}"`);
  const noteIds = new Set(db.grammarNotes.map((g) => g.id));
  for (const t of db.topics) if (t.kind === 'grammar' && !noteIds.has(t.grammarNoteId)) problems.push(`topic ${t.id}: unknown grammarNoteId "${t.grammarNoteId}"`);

  const count = (list, key, value) => list.filter((x) => x[key] === value).length;
  for (const t of db.topics) {
    if (t.kind === 'chat' || t.kind === 'grammar') {
      const qs = db.questions.filter((q) => q.topicId === t.id);
      const need = t.kind === 'chat' ? 8 : 6;
      if (qs.length < need) problems.push(`topic ${t.id}: needs at least ${need} questions (has ${qs.length})`);
      if (t.kind === 'chat') for (const [lv, min] of [['beginner', 2], ['intermediate', 2], ['advanced', 1]]) {
        if (count(qs, 'level', lv) < min) problems.push(`topic ${t.id}: needs at least ${min} ${lv} questions`);
      }
    }
    if (t.kind === 'scene' && count(db.dialogues, 'topicId', t.id) < 2) problems.push(`topic ${t.id}: needs at least 2 dialogues`);
    if (t.kind === 'vocab' && count(db.vocabulary, 'topicId', t.id) < 20) problems.push(`topic ${t.id}: needs at least 20 words`);
  }
  for (const [type, min] of Object.entries(PHRASE_TYPES)) {
    if (count(db.phrases, 'type', type) < min) problems.push(`phrases: type "${type}" needs at least ${min} entries`);
  }
  if (db.singleWords !== undefined) for (const [type, min] of Object.entries(OPTIONAL_PHRASE_TYPES)) {
    if (count(db.phrases, 'type', type) < min) problems.push(`phrases: type "${type}" needs at least ${min} entries`);
  }
  for (const lv of LEVELS) if (!db.levels.some((l) => l.id === lv)) problems.push(`levels: "${lv}" is missing`);
  if (db.mistakes.length < 100) problems.push(`mistakes: needs at least 100 entries (has ${db.mistakes.length})`);
  // Optional collection: practice conversations (see scripts/add-conversations.mjs).
  if (db.conversations !== undefined) {
    if (!Array.isArray(db.conversations)) problems.push('db.json: "conversations" is not a list');
    else {
      const seenId = new Set();
      const seenQ = new Set();
      const cats = new Set((db.conversationCategories ?? []).map((c) => c.id));
      db.conversations.forEach((c, i) => {
        const where = `conversations[${i}]`;
        for (const k of ['id', 'category', 'context', 'level', 'en', 'tamil', 'reply', 'replyTamil']) if (typeof c?.[k] !== 'string' || !c[k].trim()) problems.push(`${where}: missing "${k}"`);
        if (c?.id && seenId.has(c.id)) problems.push(`${where}: duplicate id ${c.id}`);
        seenId.add(c?.id);
        const q = String(c?.en ?? '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (seenQ.has(q)) problems.push(`${where}: duplicate sentence "${c.en}"`);
        seenQ.add(q);
        if (cats.size && !cats.has(c?.category)) problems.push(`${where}: unknown category "${c?.category}"`);
        if (!/[஀-௿]/.test(c?.tamil ?? '') || !/[஀-௿]/.test(c?.replyTamil ?? '')) problems.push(`${where}: Tamil text missing`);
      });
    }
  }
  // Optional collection: one-word replies (see scripts/add-single-words.mjs).
  if (db.singleWords !== undefined) {
    if (!Array.isArray(db.singleWords)) problems.push('db.json: "singleWords" is not a list');
    else {
      const seen = new Set();
      db.singleWords.forEach((w, i) => {
        const where = `singleWords[${i}]`;
        for (const k of ['id', 'word', 'say', 'sayTamil', 'sentence', 'sentenceTamil', 'ask', 'askTamil']) if (typeof w?.[k] !== 'string' || !w[k].trim()) problems.push(`${where}: missing "${k}"`);
        if (!/^[a-z]+$/.test(w?.word ?? '')) problems.push(`${where}: word must be one lowercase word`);
        if (seen.has(w?.word)) problems.push(`${where}: duplicate word "${w?.word}"`);
        seen.add(w?.word);
        if (!/\?$/.test(w?.ask ?? '')) problems.push(`${where}: ask must end with ?`);
        for (const k of ['sayTamil', 'sentenceTamil', 'askTamil']) if (!/[஀-௿]/.test(w?.[k] ?? '')) problems.push(`${where}: ${k} has no Tamil`);
      });
    }
  }
  return problems;
}

// ---------- command line ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const fail = (problems) => {
    for (const p of problems.slice(0, 60)) console.error('  ✗ ' + p);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    console.error(`\ndb check FAILED: ${problems.length} problem(s).`);
    process.exit(1);
  };
  const partAt = args.indexOf('--part');
  if (partAt >= 0) {
    const [name, file] = [args[partAt + 1], args[partAt + 2]];
    const topicsAt = args.indexOf('--topics');
    let ctx = {};
    if (topicsAt >= 0) ctx = { topics: JSON.parse(fs.readFileSync(args[topicsAt + 1], 'utf8')) };
    if (!COLLECTIONS.includes(name)) { console.error(`Unknown collection "${name}".`); process.exit(1); }
    const problems = validateCollection(name, JSON.parse(fs.readFileSync(file, 'utf8')), ctx);
    if (problems.length > 0) fail(problems);
    console.log(`${name}: ${JSON.parse(fs.readFileSync(file, 'utf8')).length} records OK`);
  } else {
    const src = path.join(root, 'db.json');
    if (!fs.existsSync(src)) { console.error(`db.json not found at ${src}`); process.exit(1); }
    let db;
    try { db = JSON.parse(fs.readFileSync(src, 'utf8')); } catch (e) { console.error(`db.json is not valid JSON: ${e.message}`); process.exit(1); }
    const problems = validateDb(db);
    if (problems.length > 0) fail(problems);
    const summary = COLLECTIONS.map((n) => `${n} ${db[n].length}`).join(', ');
    if (args.includes('--check')) {
      console.log(`db.json OK (${summary}).`);
    } else {
      const out = path.join(root, 'public', 'data', 'db.json');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(db));
      console.log(`db.json OK (${summary}). Copied to public/data/db.json (${Math.round(fs.statSync(out).size / 1024)} KB).`);
    }
  }
}
