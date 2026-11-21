// Shared checks for the "conversations" collection of db.json. Pure Node, no dependencies.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const CATEGORIES = {
  'daily-life': { prefix: 'dl', label: 'Daily life', labelTamil: 'அன்றாட வாழ்க்கை', count: 200 },
  office: { prefix: 'of', label: 'Office', labelTamil: 'அலுவலகம்', count: 200 },
  friends: { prefix: 'fr', label: 'Friends', labelTamil: 'நண்பர்கள்', count: 180 },
  family: { prefix: 'fa', label: 'Family', labelTamil: 'குடும்பம்', count: 180 },
  shopping: { prefix: 'sh', label: 'Shopping', labelTamil: 'ஷாப்பிங்', count: 180 },
  travel: { prefix: 'tv', label: 'Travel', labelTamil: 'பயணம்', count: 180 },
  telephone: { prefix: 'tp', label: 'Telephone calls', labelTamil: 'தொலைபேசி அழைப்புகள்', count: 180 },
  interviews: { prefix: 'iv', label: 'Interviews', labelTamil: 'நேர்காணல்கள்', count: 180 },
  restaurants: { prefix: 'rs', label: 'Restaurants', labelTamil: 'உணவகங்கள்', count: 160 },
  relationships: { prefix: 'rl', label: 'Relationships', labelTamil: 'உறவுகள்', count: 160 },
  advanced: { prefix: 'ad', label: 'Advanced spoken English', labelTamil: 'மேம்பட்ட பேச்சு ஆங்கிலம்', count: 200 },
};
export const TOTAL_NEW = Object.values(CATEGORIES).reduce((n, c) => n + c.count, 0); // 2000
export const LEVELS = ['beginner', 'intermediate', 'advanced'];

export const norm = (t) => String(t).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (t) => norm(t).split(' ').filter(Boolean);
const tokenSet = (t) => new Set(words(t).filter((w) => w.length > 2));
export function similarity(a, b) {
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size) * 0.5 + inter / (A.size + B.size - inter) * 0.5;
}

/** Every English sentence the project already has (db.json + the static data files), normalised. */
export function loadExistingTexts(root) {
  const out = new Set();
  const add = (t) => { if (typeof t === 'string' && t.trim()) out.add(norm(t)); };
  const dbPath = join(root, 'db.json');
  if (existsSync(dbPath)) {
    const db = JSON.parse(readFileSync(dbPath, 'utf8'));
    for (const q of db.questions ?? []) { add(q.text); add(q.example); }
    for (const d of db.dialogues ?? []) for (const t of d.turns ?? []) { add(t.lela); add(t.example); }
    for (const p of db.phrases ?? []) add(p.text);
    for (const w of db.vocabulary ?? []) add(w.example);
  }
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.json') && f.name !== 'manifest.json' && f.name !== 'db.json') {
        const grab = (v) => {
          if (Array.isArray(v)) v.forEach(grab);
          else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if ((k === 'en' || k === 'example' || k === 'partner') && typeof x === 'string') add(x); else grab(x); }
        };
        grab(JSON.parse(readFileSync(p, 'utf8')));
      }
    }
  };
  walk(join(root, 'public', 'data'));
  return out;
}

/**
 * Checks a list of new conversation entries.
 * @param entries   the new entries (id optional)
 * @param existing  Set of normalised texts that already exist (never reuse them)
 * @param opts.near true = also reject near-duplicates among the new entries (slower, O(n^2))
 */
export function validateEntries(entries, existing, opts = {}) {
  const errors = [];
  const seenQ = new Map(), seenR = new Map();
  const fail = (i, msg) => errors.push(`#${i + 1} ${entries[i]?.en ? `"${String(entries[i].en).slice(0, 40)}"` : ''}: ${msg}`);
  entries.forEach((e, i) => {
    if (!e || typeof e !== 'object') return fail(i, 'not an object');
    for (const k of ['category', 'context', 'level', 'en', 'tamil', 'reply', 'replyTamil']) if (typeof e[k] !== 'string' || !e[k].trim()) fail(i, `missing "${k}"`);
    if (!CATEGORIES[e.category]) fail(i, `unknown category "${e.category}"`);
    if (!LEVELS.includes(e.level)) fail(i, `bad level "${e.level}"`);
    const en = words(e.en ?? ''), rp = words(e.reply ?? '');
    if (en.length < 3 || en.length > 28) fail(i, `en must be 3-28 words (has ${en.length})`);
    if (rp.length < 3 || rp.length > 34) fail(i, `reply must be 3-34 words (has ${rp.length})`);
    if (!/[.?!]["')]?$/.test((e.en ?? '').trim())) fail(i, 'en must end with . ? or !');
    if (!/[.?!…]["')]?$/.test((e.reply ?? '').trim())) fail(i, 'reply must end with . ? or !');
    if (norm(e.en ?? '') === norm(e.reply ?? '')) fail(i, 'reply equals the question');
    for (const k of ['tamil', 'replyTamil']) {
      const t = e[k] ?? '';
      if (!/[஀-௿]/.test(t)) fail(i, `${k} has no Tamil letters`);
      if (/[A-Za-z]/.test(t)) fail(i, `${k} contains English letters (write English words in Tamil script)`);
      if (t.length < 4 || t.length > 260) fail(i, `${k} length odd`);
    }
    const c = (e.context ?? '').trim().split(/\s+/).length;
    if (c < 2 || c > 14) fail(i, 'context must be 2-14 words');
    const q = norm(e.en ?? ''), r = norm(e.reply ?? '');
    if (existing.has(q)) fail(i, 'en already exists in the project');
    if (existing.has(r)) fail(i, 'reply already exists in the project');
    if (seenQ.has(q)) fail(i, `duplicate en (also #${seenQ.get(q) + 1})`); else seenQ.set(q, i);
    if (seenR.has(r)) fail(i, `duplicate reply (also #${seenR.get(r) + 1})`); else seenR.set(r, i);
    if (seenQ.has(r) && seenQ.get(r) !== i) fail(i, 'reply is the same as another entry\'s question');
  });
  if (opts.near) {
    const sets = entries.map((e) => [tokenSet(e.en ?? ''), tokenSet(e.reply ?? '')]);
    const sim = (A, B) => { if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n); };
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      if (sim(sets[i][0], sets[j][0]) >= 0.75) fail(j, `question nearly the same as #${i + 1} "${entries[i].en}"`);
      else if (sim(sets[i][1], sets[j][1]) >= 0.8) fail(j, `reply nearly the same as #${i + 1} "${entries[i].reply}"`);
    }
  }
  return errors;
}
