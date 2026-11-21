import { AnswerCheck, Exercise, Sentence, Word } from '../models/learning.models';
import { compareSpeech } from './speech-compare';

// ---------- Seeded random numbers, so that a day's exercises are the same after a reload ----------

export type Rng = () => number;

export function seededRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(pool: readonly T[], count: number, rng: Rng, exclude: (item: T) => boolean): T[] {
  return shuffle(pool.filter((item) => !exclude(item)), rng).slice(0, count);
}

// ---------- Helpers ----------

/** Same rule the data validator uses: the example sentence contains the headword or a regular form. */
export function stemOf(word: string): string {
  let w = word.toLowerCase().split(/[\s-]+/)[0] ?? '';
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  else if (w.length > 3 && w.endsWith('y')) w = w.slice(0, -1);
  return w;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces the headword (or a regular form of it) in its example sentence with a blank. */
export function blankOut(word: Word): string | null {
  if (/[\s-]/.test(word.word)) return null; // phrases: the blank would hide only part of them
  const regex = new RegExp(`(^|[^A-Za-z'])(${escapeRegex(stemOf(word.word))}[a-z']*)`, 'i');
  const match = regex.exec(word.example);
  if (!match) return null;
  return word.example.replace(regex, (_all, before: string) => `${before}_____`);
}

// ---------- Builders ----------

/** "What does this word mean?" with 4 Tamil choices. */
export function meaningExercises(words: Word[], pool: Word[], rng: Rng): Exercise[] {
  return words.map((w) => {
    const distractors = pick(pool, 3, rng, (x) => x.id === w.id || x.tamil === w.tamil);
    return {
      id: `meaning-${w.id}`,
      kind: 'meaning',
      title: 'What does this word mean?',
      prompt: w.word,
      hint: `${w.pron} · ${w.pos}`,
      options: shuffle([w.tamil, ...distractors.map((d) => d.tamil)], rng),
      answer: w.tamil,
      explanation: `${w.word} = ${w.tamil}. Example: ${w.example}`,
      speak: w.word,
      wordId: w.id,
    };
  });
}

/** Tamil meaning shown; choose the English word. */
export function tamilToWordExercises(words: Word[], pool: Word[], rng: Rng): Exercise[] {
  return words.map((w) => {
    const distractors = pick(pool, 3, rng, (x) => x.id === w.id || x.word === w.word);
    return {
      id: `tamil-word-${w.id}`,
      kind: 'tamil-word',
      title: 'Which English word means this?',
      prompt: w.tamil,
      options: shuffle([w.word, ...distractors.map((d) => d.word)], rng),
      answer: w.word,
      explanation: `${w.tamil} = ${w.word} (${w.pron}). Example: ${w.example}`,
      speak: w.word,
      wordId: w.id,
    };
  });
}

/** Fill in the blank in the word's example sentence. Words without a usable blank are skipped. */
export function fillBlankExercises(words: Word[], pool: Word[], rng: Rng): Exercise[] {
  const out: Exercise[] = [];
  for (const w of words) {
    const blank = blankOut(w);
    if (!blank) continue;
    const distractors = pick(
      pool.filter((x) => !/[\s-]/.test(x.word) && x.pos === w.pos),
      3,
      rng,
      (x) => x.id === w.id || x.word === w.word,
    );
    if (distractors.length < 3) continue;
    out.push({
      id: `fill-${w.id}`,
      kind: 'fill-blank',
      title: 'Choose the word that fits the blank',
      prompt: blank,
      hint: w.exampleTamil,
      options: shuffle([w.word, ...distractors.map((d) => d.word)], rng),
      answer: w.word,
      explanation: `${w.example}  (${w.word} = ${w.tamil})`,
      speak: w.example,
      wordId: w.id,
    });
  }
  return out;
}

/** Put the shuffled words in the right order. Only short sentences are used. */
export function rearrangeExercises(sentences: Sentence[], rng: Rng): Exercise[] {
  const out: Exercise[] = [];
  for (const s of sentences) {
    const tokens = s.en.split(/\s+/);
    if (tokens.length < 4 || tokens.length > 11) continue;
    let mixed = shuffle(tokens, rng);
    // make sure the shuffle is really different from the answer
    for (let tries = 0; tries < 5 && mixed.join(' ') === tokens.join(' '); tries++) mixed = shuffle(tokens, rng);
    out.push({
      id: `rearrange-${s.id}`,
      kind: 'rearrange',
      title: 'Put the words in the right order',
      prompt: s.tamil,
      hint: s.context,
      tokens: mixed,
      answer: s.en,
      explanation: s.en,
      speak: s.en,
      sentenceId: s.id,
    });
  }
  return out;
}

/** Tamil sentence shown; choose the right English sentence. */
export function translateChooseExercises(sentences: Sentence[], pool: Sentence[], rng: Rng): Exercise[] {
  return sentences.map((s) => {
    const sameKind = pool.filter((x) => x.type === s.type);
    const distractors = pick(sameKind.length >= 4 ? sameKind : pool, 3, rng, (x) => x.id === s.id || x.en === s.en);
    return {
      id: `translate-choose-${s.id}`,
      kind: 'translate-choose',
      title: 'Choose the correct English sentence',
      prompt: s.tamil,
      hint: s.context,
      options: shuffle([s.en, ...distractors.map((d) => d.en)], rng),
      answer: s.en,
      explanation: s.en,
      speak: s.en,
      sentenceId: s.id,
    };
  });
}

/** Tamil sentence shown; type the English sentence. */
export function translateTypeExercises(sentences: Sentence[]): Exercise[] {
  return sentences.map((s) => ({
    id: `translate-type-${s.id}`,
    kind: 'translate-type',
    title: 'Write this in English',
    prompt: s.tamil,
    hint: s.context,
    answer: s.en,
    explanation: s.en,
    speak: s.en,
    sentenceId: s.id,
  }));
}

/**
 * Builds the daily practice set from today's words and sentences:
 * 10 meaning + 4 fill-blank + 4 rearrange + 4 translation-choose + 2 typed translations (at most).
 */
export function buildDailySet(words: Word[], sentences: Sentence[], wordPool: Word[], sentencePool: Sentence[], seed: string): Exercise[] {
  const rng = seededRng(seed);
  const mixedWords = shuffle(words, rng);
  const mixedSentences = shuffle(sentences, rng);
  const set: Exercise[] = [
    ...meaningExercises(words.slice(0, 6), wordPool, rng),
    ...tamilToWordExercises(mixedWords.slice(0, 4), wordPool, rng),
    ...fillBlankExercises(mixedWords, wordPool, rng).slice(0, 4),
    ...rearrangeExercises(mixedSentences, rng).slice(0, 4),
    ...translateChooseExercises(mixedSentences.slice(0, 4), sentencePool, rng),
    ...translateTypeExercises(mixedSentences.slice(4, 6)),
  ];
  // alternate the kinds a little so that similar questions are not in a row
  return interleave(set, rng);
}

function interleave(items: Exercise[], rng: Rng): Exercise[] {
  const byKind = new Map<string, Exercise[]>();
  for (const item of items) byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item]);
  const queues = shuffle([...byKind.values()], rng);
  const out: Exercise[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

// ---------- Checking ----------

/** A typed translation is accepted when at least 80% of the words match in order. */
export const TYPED_PASS = 0.8;

export function checkAnswer(exercise: Exercise, given: string): AnswerCheck {
  if (exercise.kind === 'translate-type') {
    const closeness = compareSpeech(exercise.answer, given).accuracy;
    // extra wrong words should not pass: also require the symmetrical similarity to be reasonable
    const similarity = compareSpeech(exercise.answer, given).similarity;
    return { correct: closeness >= TYPED_PASS && similarity >= 0.7, closeness };
  }
  if (exercise.kind === 'rearrange') {
    const same = given.trim().replace(/\s+/g, ' ') === exercise.answer.trim().replace(/\s+/g, ' ');
    return { correct: same };
  }
  return { correct: given === exercise.answer };
}
