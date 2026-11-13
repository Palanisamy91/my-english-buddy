import type { Sentence, Word } from '../models/learning.models';

/**
 * Lela's explanation of a word or sentence. Built from the data fields with fixed wording,
 * so it works offline and is not AI. English only: this is the text Lela reads aloud.
 */
export function explainWord(w: Word): string {
  const parts: string[] = [];
  parts.push(w.meaning ? `"${w.word}" means ${lowerFirst(trimDot(w.meaning))}.` : `"${w.word}" is ${article(w.pos)} ${w.pos}.`);
  parts.push(`You say it like this: ${w.pron}.`);
  parts.push(`For example: ${w.example}`);
  if (w.synonyms.length > 0) parts.push(`You can also say ${list(w.synonyms)}.`);
  parts.push(`Now try to make your own sentence with "${w.word}".`);
  return parts.join(' ');
}

export function explainSentence(s: Sentence): string {
  const parts: string[] = [];
  parts.push(s.en);
  parts.push(s.explain ? ensureDot(s.explain) : `You can say this when: ${lowerFirst(ensureDot(s.context))}`);
  if (s.words && s.words.length > 0) parts.push(`Useful words here: ${list(s.words)}.`);
  if (s.alt) parts.push(`A simple way to say it is: ${s.alt.en}`);
  parts.push('Say it once out loud. I am listening.');
  return parts.join(' ');
}

function trimDot(t: string): string { return t.replace(/[.\s]+$/, ''); }
function ensureDot(t: string): string { return /[.!?]$/.test(t) ? t : t + '.'; }
function lowerFirst(t: string): string { return t.charAt(0).toLowerCase() + t.slice(1); }
function article(pos: string): string { return /^[aeiou]/i.test(pos) ? 'an' : 'a'; }
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1];
}
