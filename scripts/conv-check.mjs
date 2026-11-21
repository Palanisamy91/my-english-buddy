// Usage: node scripts/conv-check.mjs <file.json> [more.json ...]   (each file is a JSON array of entries)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadExistingTexts, validateEntries } from './conversations-lib.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const existing = loadExistingTexts(root);
let all = [];
for (const f of process.argv.slice(2)) {
  const arr = JSON.parse(readFileSync(f, 'utf8'));
  if (!Array.isArray(arr)) { console.error(f + ': not an array'); process.exit(1); }
  all = all.concat(arr);
}
const errors = validateEntries(all, existing, { near: true });
console.log(`${all.length} entries checked, ${errors.length} problem(s).`);
errors.slice(0, 60).forEach((e) => console.log(' - ' + e));
process.exit(errors.length ? 1 : 0);
