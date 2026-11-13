// Makes the Android project allow the microphone:
//   node scripts/android-setup.mjs            -> patches android/app/src/main/AndroidManifest.xml
//   node scripts/android-setup.mjs --check    -> only reports, changes nothing (exit code 1 if something is missing)
// Safe to run again. It keeps a copy of the original as AndroidManifest.xml.bak the first time it changes the file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(process.argv.find((a) => a.endsWith('.xml')) ?? path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(file)) {
  console.error(`Cannot find ${file}\nRun "npx cap add android" first (see docs/ANDROID.md), then run this again.`);
  process.exit(2);
}

let xml = fs.readFileSync(file, 'utf8');
const missing = [];
const has = (re) => re.test(xml);

const wantPermissions = [
  ['android.permission.RECORD_AUDIO', '<uses-permission android:name="android.permission.RECORD_AUDIO" />'],
  ['android.permission.INTERNET', '<uses-permission android:name="android.permission.INTERNET" />'],
];
for (const [name, line] of wantPermissions) {
  if (!has(new RegExp(`<uses-permission[^>]*android:name="${name.replace(/\./g, '\\.')}"`))) missing.push({ kind: 'permission', name, line });
}
// Android 11+ hides other apps from yours unless you ask: the speech service must be visible to be used.
const queriesBlock = `    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>`;
if (!has(/android\.speech\.RecognitionService/)) missing.push({ kind: 'queries', name: 'RecognitionService <queries>' });

if (missing.length === 0) {
  console.log('AndroidManifest.xml is already set up: RECORD_AUDIO, INTERNET and the speech-service <queries> are present.');
  process.exit(0);
}
console.log(`${checkOnly ? 'Missing' : 'Adding'}: ${missing.map((m) => m.name).join(', ')}`);
if (checkOnly) process.exit(1);

if (!/<manifest[\s>]/.test(xml) || !/<\/manifest>/.test(xml)) {
  console.error('This does not look like an AndroidManifest.xml (no <manifest> element). Nothing was changed.');
  process.exit(2);
}

const bak = file + '.bak';
if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);

const permLines = missing.filter((m) => m.kind === 'permission').map((m) => `    ${m.line}`);
if (permLines.length > 0) {
  // after the last existing <uses-permission>, otherwise just before </manifest>
  const all = [...xml.matchAll(/<uses-permission[^>]*\/>/g)];
  if (all.length > 0) {
    const last = all[all.length - 1];
    const at = last.index + last[0].length;
    xml = xml.slice(0, at) + '\n' + permLines.join('\n') + xml.slice(at);
  } else {
    xml = xml.replace(/<\/manifest>/, `${permLines.join('\n')}\n</manifest>`);
  }
}
if (missing.some((m) => m.kind === 'queries')) {
  if (/<queries>[\s\S]*?<\/queries>/.test(xml)) {
    xml = xml.replace(/<\/queries>/, `    <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>`);
  } else {
    xml = xml.replace(/<\/manifest>/, `${queriesBlock}\n</manifest>`);
  }
}
fs.writeFileSync(file, xml);
console.log(`Updated ${file}\n(the original is saved as ${path.basename(bak)}). Now run: npm run build && npx cap sync android`);
