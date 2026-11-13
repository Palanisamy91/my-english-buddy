import { Word } from '../models/learning.models';

/**
 * Finds vocabulary words inside a piece of text (a Lela message, a saved conversation).
 * Pure functions, no Angular: easy to test. Matching is by whole words, so "run" is not found
 * inside "runway", but "walked", "walking" and "walks" are found for "walk".
 */

export interface VocabIndex {
  /** Single-word forms: "walking" -> ids of the words it can belong to. */
  forms: Map<string, string[]>;
  /** Multi-word or hyphenated entries: "take off", "screen share". */
  phrases: { text: string; id: string }[];
  size: number;
}

const MIN_LENGTH = 3;

/** The regular forms a headword can take in a sentence (the headword itself is always included). */
export function formsOf(word: string): string[] {
  const w = word.toLowerCase();
  const out = new Set<string>([w]);
  const endsConsonantY = /[^aeiou]y$/.test(w);
  const endsE = w.endsWith('e');
  const base = endsConsonantY ? w.slice(0, -1) : endsE ? w.slice(0, -1) : w;
  out.add(w + 's');
  if (/(s|x|z|ch|sh|o)$/.test(w)) out.add(w + 'es');
  if (endsConsonantY) { out.add(base + 'ies'); out.add(base + 'ied'); out.add(w + 'ing'); out.add(base + 'ier'); out.add(base + 'iest'); out.add(base + 'ily'); }
  else if (endsE) { out.add(base + 'ing'); out.add(w + 'd'); out.add(w + 'r'); out.add(w + 'st'); out.add(w + 'ly'); }
  else {
    out.add(w + 'ed'); out.add(w + 'ing'); out.add(w + 'er'); out.add(w + 'est'); out.add(w + 'ly');
    // doubled final consonant: stop -> stopped, stopping
    if (/[^aeiou][aeiou][bdgmnprt]$/.test(w)) { out.add(w + w.slice(-1) + 'ed'); out.add(w + w.slice(-1) + 'ing'); out.add(w + w.slice(-1) + 'er'); }
  }
  return [...out];
}

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function normPhrase(text: string): string {
  return ' ' + tokens(text.replace(/-/g, ' ')).join(' ') + ' ';
}

export function buildVocabIndex(words: readonly Pick<Word, 'id' | 'word'>[]): VocabIndex {
  const forms = new Map<string, string[]>();
  const phrases: { text: string; id: string }[] = [];
  for (const w of words) {
    const headword = w.word.trim().toLowerCase();
    if (/[\s-]/.test(headword)) {
      phrases.push({ text: normPhrase(headword), id: w.id });
      continue;
    }
    if (headword.length < MIN_LENGTH) continue;
    for (const form of formsOf(headword)) {
      const list = forms.get(form);
      if (!list) forms.set(form, [w.id]);
      else if (!list.includes(w.id)) list.push(w.id);
    }
  }
  return { forms, phrases, size: words.length };
}

/** The ids of every vocabulary word found in the text (each id once, in the order they appear). */
export function findVocab(text: string, index: VocabIndex): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (id: string): void => { if (!seen.has(id)) { seen.add(id); found.push(id); } };
  const toks = tokens(text);
  for (const t of toks) {
    const ids = index.forms.get(t);
    if (!ids) continue;
    // A form like "saw" can belong to two headwords; the exact headword wins, otherwise all candidates count.
    for (const id of ids) add(id);
  }
  if (index.phrases.length) {
    const flat = ' ' + toks.join(' ') + ' ';
    for (const p of index.phrases) if (flat.includes(p.text)) add(p.id);
  }
  return found;
}
