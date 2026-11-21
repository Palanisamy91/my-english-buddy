import type { LelaIntent, LelaMemory, LelaMistake, LelaReaction, LelaTopic } from './lela.models';

// Small, pure helpers (no Angular, no browser) so that they can be unit-tested.

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lower-case words and apostrophes only, single spaces. "I'm FINE!" -> "i'm fine". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  const n = normalize(text);
  return n === '' ? 0 : n.split(' ').length;
}

/** True when the normalized text contains the word or phrase (a plural or -ing/-ed ending is accepted). */
export function containsKeyword(norm: string, keyword: string): boolean {
  const k = normalize(keyword);
  if (!k) return false;
  return new RegExp(`(^| )${escapeRegex(k)}(s|es|ed|ing)?( |$)`).test(norm);
}

/** The reaction with the most keyword hits (the first one wins a tie), or null. */
export function matchReaction(reactions: readonly LelaReaction[], norm: string): { reaction: LelaReaction; index: number } | null {
  let best: { reaction: LelaReaction; index: number; hits: number } | null = null;
  reactions.forEach((reaction, index) => {
    const hits = reaction.if.filter((k) => containsKeyword(norm, k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { reaction, index, hits };
  });
  return best ? { reaction: (best as { reaction: LelaReaction }).reaction, index: (best as { index: number }).index } : null;
}

/**
 * Fills {name}, {title} ... in a stored line. A missing {name} is removed together with the comma
 * before it, so "Nice to meet you, {name}!" becomes "Nice to meet you!".
 */
export function fillTemplate(text: string, vars: Record<string, string | undefined>): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined || value === '') {
      out = out.replace(new RegExp(`\\s*,?\\s*\\{${key}\\}`, 'g'), key === 'name' ? '' : ' ');
    } else {
      out = out.split(`{${key}}`).join(value);
    }
  }
  return out.replace(/\s*,?\s*\{[a-z]+\}/g, '').replace(/\s+([!?.,])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function capitalizeWords(text: string): string {
  return text.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

// ---------- Capturing facts about the learner ----------

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

export function parseAge(text: string): string | undefined {
  const n = normalize(text.replace(/-/g, ' '));
  const digits = /\b(\d{1,3})\b/.exec(n);
  if (digits) {
    const age = Number(digits[1]);
    return age >= 1 && age <= 110 ? String(age) : undefined;
  }
  const tokens = n.split(' ');
  for (let i = 0; i < tokens.length; i++) {
    const tens = NUMBER_WORDS[tokens[i]];
    if (tens === undefined || tens < 20) {
      if (tens !== undefined && tens >= 1) return String(tens);
      continue;
    }
    const unit = NUMBER_WORDS[tokens[i + 1] ?? ''];
    return String(tens + (unit !== undefined && unit < 10 ? unit : 0));
  }
  return undefined;
}

const NOT_A_NAME = new Set(['fine', 'good', 'ok', 'okay', 'not', 'from', 'sorry', 'yes', 'no', 'hello', 'hi', 'well', 'great', 'tired', 'busy', 'happy']);

export function parseName(text: string): string | undefined {
  let n = normalize(text);
  n = n.replace(/^(hello|hi|hey)( lela)?( |$)/, '');
  n = n.replace(/^(my (good )?name is|my name's|my self|myself|i am|i'm|im|this is|it is|it's|its|call me|they call me|people call me|everyone calls me|you can call me)\s+/, '');
  const words = n.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 4) return undefined;
  const take = words.slice(0, 2).filter((w) => /^[a-z]{2,20}$/.test(w) && !NOT_A_NAME.has(w));
  if (take.length === 0) return undefined;
  return capitalizeWords(take.join(' '));
}

export function parseHometown(text: string): string | undefined {
  let n = normalize(text);
  n = n.replace(/^(i am from|i'm from|im from|i come from|i am living in|i am staying in|i live in|i stay in|i was born in|i belong to|my (home ?town|native( place)?|village|city) is|from|it is|it's|its)\s+/, '');
  n = n.replace(/\s+(city|town|village|district)$/, '');
  const words = n.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 4) return undefined;
  if (words.some((w) => NOT_A_NAME.has(w))) return undefined;
  return capitalizeWords(words.join(' '));
}

export function parseJob(text: string): string | undefined {
  const n = normalize(text);
  const m = /(?:i am|i'm|im|i work as|i am working as|working as|i work like)\s+(?:a |an |the )?(.+)$/.exec(n);
  const job = (m ? m[1] : n).split(' ').slice(0, 5).join(' ').trim();
  return job.length >= 3 ? job : undefined;
}

export function captureFact(kind: 'name' | 'age' | 'hometown' | 'job', text: string): Partial<LelaMemory> {
  const value = kind === 'name' ? parseName(text) : kind === 'age' ? parseAge(text) : kind === 'hometown' ? parseHometown(text) : parseJob(text);
  return value ? { [kind]: value } : {};
}

// ---------- Things the learner says that are not answers ----------

/** Finds an intent (a command or small talk). Standalone intents must be (almost) the whole utterance. */
export function matchIntent(intents: readonly LelaIntent[], text: string): LelaIntent | null {
  const norm = normalize(text);
  if (!norm) return null;
  const words = norm.split(' ').length;
  for (const intent of intents) {
    for (const source of intent.patterns) {
      let re: RegExp;
      try {
        re = new RegExp(source, 'i');
      } catch {
        continue;
      }
      if (!re.test(norm)) continue;
      if (intent.standalone && words > 9) continue;
      return intent;
    }
  }
  return null;
}

/** "let's talk about cooking" -> the cooking topic. Returns null when no known topic is named. */
export function findTopicRequest(text: string, topics: readonly LelaTopic[]): LelaTopic | null {
  const norm = normalize(text);
  // Only a request counts ("let's talk about cooking"), not an answer that happens to contain "talk about".
  const asking = /^(?:(?:ok|okay|now|please|so|hey|lela)\s+)*(?:let'?s|lets|can we|could we|shall we|i want to|i wanna|i would like to|i'd like to|i need to|can i|could i|how about|what about|talk|speak|chat|discuss|practi[sc]e|topic)\b/.test(norm);
  if (!asking) return null;
  const m = /\b(?:talk|speak|chat|discuss|practi[sc]e|learn|ask me)\s+(?:about\s+|on\s+)?(?:my\s+|the\s+|some\s+)?(.+)$/.exec(norm) ?? /\b(?:topic|subject)\s+(?:of\s+|is\s+)?(.+)$/.exec(norm);
  if (!m) return null;
  const wanted = m[1];
  let best: { topic: LelaTopic; len: number } | null = null;
  for (const topic of topics) {
    const names = [normalize(topic.title), ...topic.keywords.map(normalize)];
    for (const name of names) {
      if (name.length >= 3 && containsKeyword(wanted, name) && (!best || name.length > best.len)) best = { topic, len: name.length };
    }
  }
  return best ? best.topic : null;
}

// ---------- Common-mistake rules from db.json ----------

export interface MistakeFix {
  id: string;
  found: string;
  replacement: string;
  english: string;
  tamil: string;
}

function matchCaseOf(source: string, replacement: string): string {
  if (!replacement) return replacement;
  return /^[A-Z]/.test(source) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
}

/** Applies the stored mistake rules, in order. Each rule is applied once; bad patterns are skipped. */
export function applyMistakes(text: string, mistakes: readonly LelaMistake[], compiled: Map<string, RegExp | null>): { text: string; fixes: MistakeFix[] } {
  let out = text;
  const fixes: MistakeFix[] = [];
  for (const rule of mistakes) {
    let re = compiled.get(rule.id);
    if (re === undefined) {
      try {
        re = new RegExp(rule.pattern, 'i');
      } catch {
        re = null;
      }
      compiled.set(rule.id, re);
    }
    if (!re) continue;
    const match = re.exec(out);
    if (!match) continue;
    const filled = rule.replace.replace(/\$(\d)/g, (_all, d: string) => match[Number(d)] ?? '');
    const replacement = matchCaseOf(match[0], filled);
    out = (out.slice(0, match.index) + replacement + out.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim();
    fixes.push({ id: rule.id, found: match[0].trim(), replacement: replacement.trim(), english: rule.english, tamil: rule.tamil });
  }
  return { text: out, fixes };
}

/** true when two sentences differ only by capital letters, punctuation or spacing. */
export function sameIgnoringStyle(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
