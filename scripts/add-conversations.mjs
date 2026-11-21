// Adds the 2,000 new conversations (data-src/conversations/*.json) to the "conversations" collection of db.json.
// Safe by design: it never edits an existing collection, refuses to run twice, and proves afterwards that
// every original collection is identical. Usage: node scripts/add-conversations.mjs [--check]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { CATEGORIES, TOTAL_NEW, loadExistingTexts, validateEntries } from './conversations-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'db.json');
const checkOnly = process.argv.includes('--check');
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };

const original = readFileSync(dbPath, 'utf8');
const db = JSON.parse(original);
if (db.conversations) {
  console.log(`db.json already has ${db.conversations.length} conversations - nothing to do. (Run "npm run db:check" to validate.)`);
  process.exit(0);
}

const dir = join(root, 'data-src', 'conversations');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const order = Object.keys(CATEGORIES);
files.sort((a, b) => {
  const [ca, na] = [a.replace(/-\d+\.json$/, ''), Number(/-(\d+)\.json$/.exec(a)?.[1])];
  const [cb, nb] = [b.replace(/-\d+\.json$/, ''), Number(/-(\d+)\.json$/.exec(b)?.[1])];
  return order.indexOf(ca) - order.indexOf(cb) || na - nb;
});
let entries = [];
for (const f of files) entries = entries.concat(JSON.parse(readFileSync(join(dir, f), 'utf8')));

const errors = validateEntries(entries, loadExistingTexts(root), { near: true });
for (const [id, c] of Object.entries(CATEGORIES)) {
  const n = entries.filter((e) => e.category === id).length;
  if (n !== c.count) errors.push(`category ${id}: ${n} entries, expected ${c.count}`);
}
if (entries.length !== TOTAL_NEW) errors.push(`${entries.length} entries in total, expected ${TOTAL_NEW}`);
if (errors.length) { errors.slice(0, 40).forEach((e) => console.error(' - ' + e)); die(`${errors.length} problem(s); db.json was NOT changed.`); }

// ids: cv-<prefix>-0001 ... per category, never colliding with any id already in db.json
const used = new Set();
const grab = (v) => { if (Array.isArray(v)) v.forEach(grab); else if (v && typeof v === 'object') { if (typeof v.id === 'string') used.add(v.id); Object.values(v).forEach(grab); } };
grab(db);
const counters = {};
const added = entries.map((e) => {
  const c = CATEGORIES[e.category];
  counters[e.category] = (counters[e.category] ?? 0) + 1;
  const id = `cv-${c.prefix}-${String(counters[e.category]).padStart(4, '0')}`;
  if (used.has(id)) die('id clash: ' + id);
  used.add(id);
  return { id, category: e.category, context: e.context, level: e.level, en: e.en, tamil: e.tamil, reply: e.reply, replyTamil: e.replyTamil };
});
console.log(`${added.length} new conversations pass every check.`);
if (checkOnly) process.exit(0);

const next = { ...db };
next.conversationCategories = Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label, labelTamil: c.labelTamil, count: c.count }));
next.conversations = added;
const out = JSON.stringify(next, null, 1);

// Proof that nothing existing changed: re-read the new text and compare every old collection.
const back = JSON.parse(out);
for (const key of Object.keys(db)) if (!isDeepStrictEqual(back[key], db[key])) die(`collection "${key}" would change - aborting, db.json untouched.`);
if (!out.startsWith(original.slice(0, original.lastIndexOf('}') - 1).trimEnd())) console.log('(note: key order/format kept; existing collections verified equal)');
writeFileSync(dbPath, out + (original.endsWith('\n') ? '\n' : ''));
console.log(`db.json updated: +${added.length} conversations, ${Object.keys(db).length} original collections verified unchanged.`);
