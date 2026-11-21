/** Offline Tamil-to-English answer evaluator. It recognises contractions and punctuation,
 * accepts explicitly listed alternatives, and distinguishes near-misses from incorrect answers.
 * It is intentionally rule-based: it does not claim to understand every possible paraphrase. */
export type TranslationStatus = 'correct' | 'close' | 'review';
export interface TranslationEvaluation {
  status: TranslationStatus;
  similarity: number;
  expected: string;
  submitted: string;
  missing: string[];
  extra: string[];
}

const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "we're": 'we are', "they're": 'they are', "that's": 'that is', "there's": 'there is',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot',
  "won't": 'will not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
  "couldn't": 'could not', "wouldn't": 'would not', "shouldn't": 'should not',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will',
  "i've": 'i have', "we've": 'we have', "they've": 'they have', "let's": 'let us',
};

export function normaliseTranslation(value: string): string {
  return value.toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').flatMap((word) => (CONTRACTIONS[word] ?? word).split(' ')).join(' ');
}

function distance(a: string[], b: string[]): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

function wordChanges(expected: string[], submitted: string[]): { missing: string[]; extra: string[] } {
  const rows = expected.length + 1, cols = submitted.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = expected.length - 1; i >= 0; i--) for (let j = submitted.length - 1; j >= 0; j--) {
    dp[i][j] = expected[i] === submitted[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const missing: string[] = [], extra: string[] = [];
  let i = 0, j = 0;
  while (i < expected.length && j < submitted.length) {
    if (expected[i] === submitted[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) missing.push(expected[i++]);
    else extra.push(submitted[j++]);
  }
  missing.push(...expected.slice(i)); extra.push(...submitted.slice(j));
  return { missing: [...new Set(missing)], extra: [...new Set(extra)] };
}

export function evaluateTranslation(expected: string, submitted: string, accepted: readonly string[] = []): TranslationEvaluation {
  const target = [expected, ...accepted].map(normaliseTranslation).filter(Boolean);
  const answer = normaliseTranslation(submitted);
  const best = target.map((candidate) => {
    const a = candidate.split(' '), b = answer.split(' ');
    const similarity = 1 - distance(a, b) / Math.max(a.length, b.length, 1);
    return { candidate, similarity };
  }).sort((a, b) => b.similarity - a.similarity)[0] ?? { candidate: normaliseTranslation(expected), similarity: 0 };
  const exact = target.includes(answer);
  const expectedWords = best.candidate.split(' '), submittedWords = answer.split(' ');
  const changes = wordChanges(expectedWords, submittedWords);
  return {
    status: exact ? 'correct' : best.similarity >= 0.78 ? 'close' : 'review',
    similarity: exact ? 1 : best.similarity,
    expected,
    submitted,
    ...changes,
  };
}
