import { ComparisonResult, DiffToken, ExpressionTip, Expression } from '../models/learning.models';

// Contractions are expanded on both sides, because speech recognition may write
// "I'm" or "I am" for the same spoken words.
const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "we're": 'we are', "they're": 'they are', "that's": 'that is', "there's": 'there is',
  "what's": 'what is', "where's": 'where is', "who's": 'who is', "how's": 'how is',
  "i'll": 'i will', "you'll": 'you will', "he'll": 'he will', "she'll": 'she will',
  "we'll": 'we will', "they'll": 'they will', "it'll": 'it will',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "i'd": 'i would', "you'd": 'you would', "he'd": 'he would', "she'd": 'she would',
  "we'd": 'we would', "they'd": 'they would',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot',
  "won't": 'will not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
  "couldn't": 'could not', "wouldn't": 'would not', "shouldn't": 'should not',
  "let's": 'let us',
};

/** Lower-case words without punctuation, contractions expanded. */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ');
  const out: string[] = [];
  for (const raw of cleaned.split(/\s+/)) {
    const word = raw.replace(/^'+|'+$/g, '');
    if (!word) continue;
    const expanded = Object.prototype.hasOwnProperty.call(CONTRACTIONS, word) ? CONTRACTIONS[word] : word;
    out.push(...expanded.split(' '));
  }
  return out;
}

/** Longest common subsequence table; used for the word-by-word comparison. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

/**
 * Compares what the learner said with the target sentence.
 * Target words are marked "match" (said) or "missing" (not said); words said that are not in
 * the target are listed as "extra". Order matters (a word said out of order counts as missing).
 */
export function compareSpeech(target: string, heard: string): ComparisonResult {
  const targetWords = tokenize(target);
  const heardWords = tokenize(heard);
  const table = lcsTable(targetWords, heardWords);

  const marks: DiffToken[] = targetWords.map((text) => ({ text, status: 'missing' }));
  const matchedHeard = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < targetWords.length && j < heardWords.length) {
    if (targetWords[i] === heardWords[j]) {
      marks[i].status = 'match';
      matchedHeard.add(j);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const matched = table[0][0];
  const extra = heardWords.filter((_, index) => !matchedHeard.has(index));
  const accuracy = targetWords.length === 0 ? 0 : matched / targetWords.length;
  const total = targetWords.length + heardWords.length;
  const similarity = total === 0 ? 0 : (2 * matched) / total;
  return { target: marks, extra, accuracy, similarity };
}

/** Index of the option most similar to what was heard, or -1 when nothing is close enough. */
export function closestOption(options: string[], heard: string, minimum = 0.5): number {
  let best = -1;
  let bestScore = minimum;
  options.forEach((option, index) => {
    const score = compareSpeech(option, heard).similarity;
    if (score >= bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

/** Plain-language verdict for an accuracy value. */
export function verdict(accuracy: number): { label: string; tamil: string; level: 'great' | 'good' | 'retry' } {
  if (accuracy >= 0.9) return { label: 'Excellent!', tamil: 'மிகச் சிறப்பு!', level: 'great' };
  if (accuracy >= 0.7) return { label: 'Good. Almost there.', tamil: 'நன்று. கிட்டத்தட்ட சரி.', level: 'good' };
  return { label: 'Try again, slowly.', tamil: 'மெதுவாக மீண்டும் முயலுங்கள்.', level: 'retry' };
}

// ---------- Natural alternative expressions (rule-based phrase list) ----------

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '\\s+');
  return new RegExp(`(^|[^a-z'])${escaped}(?![a-z'])`, 'i');
}

/**
 * Finds phrases from the expression list in the learner's text and returns up to `limit`
 * suggestions. Longer phrases are tried first, so "i don't know" wins over "i".
 */
export function findExpressionTips(text: string, expressions: Expression[], limit = 3): ExpressionTip[] {
  const normalized = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
  const sorted = [...expressions].sort((a, b) => b.plain.length - a.plain.length);
  const tips: ExpressionTip[] = [];
  let remaining = normalized;
  for (const expression of sorted) {
    if (tips.length >= limit) break;
    const regex = phraseRegex(expression.plain);
    if (regex.test(remaining)) {
      tips.push({
        plain: expression.plain,
        better: expression.better,
        tamil: expression.tamil,
        exampleBefore: expression.exampleBefore,
        exampleAfter: expression.exampleAfter,
      });
      // blank the match out so shorter phrases inside it are not suggested again
      remaining = remaining.replace(regex, ' ');
    }
  }
  return tips;
}
