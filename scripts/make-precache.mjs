#!/usr/bin/env node
// After `ng build`: writes precache.json (every built file) so the service worker can save the whole app.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? 'dist/my-english-buddy/browser');
if (!fs.existsSync(dir)) {
  console.error(`Build folder not found: ${dir}. Run "ng build" first.`);
  process.exit(1);
}
const skip = new Set(['precache.json', 'sw.js']);
const files = [];
(function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const rel = path.relative(dir, full).split(path.sep).join('/');
      if (!skip.has(rel) && !rel.startsWith('data/') && !rel.endsWith('.map') && !rel.endsWith('.txt')) files.push(rel);
    }
  }
})(dir);
fs.writeFileSync(path.join(dir, 'precache.json'), JSON.stringify({ files: files.sort() }));
console.log(`precache.json written with ${files.length} files (data files are listed from data/manifest.json by the service worker).`);
