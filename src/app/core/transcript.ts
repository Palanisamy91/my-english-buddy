// Turns the raw results of the browser's speech recogniser into clean text. Pure functions (no Angular,
// no browser), so they can be unit-tested. What it does and does NOT do:
//  - keeps FINAL text and INTERIM (still changing) text separate, and keeps earlier final text;
//  - chooses the most confident of the alternatives the engine offers;
//  - removes duplicated results (some Android engines send the same sentence twice, or a growing copy of it);
//  - shows a very low-confidence result as [Unclear] instead of guessing words;
//  - NEVER corrects grammar or "fixes" wording: the original speech stays exactly as the engine heard it.
// It cannot make the engine itself more accurate, and the browser gives a confidence per result, not per word.

export const UNCLEAR = '[Unclear]';
/** A final result below this confidence is shown as [Unclear]. 0 means "the engine gave no confidence". */
export const UNCLEAR_BELOW = 0.3;
/** A final result below this is kept, but flagged so the learner can check it. */
export const CHECK_BELOW = 0.6;

export interface RawAlternative { transcript: string; confidence?: number }
export interface RawResult { isFinal: boolean; alternatives: readonly RawAlternative[] }

export interface Segment {
  text: string;
  confidence: number;
  isFinal: boolean;
  unclear: boolean;
  /** Kept, but the engine was not very sure. */
  check: boolean;
}

export interface Transcript {
  /** Final segments only, joined, with [Unclear] markers. Safe to show as "what I said". */
  finalMarked: string;
  /** Final segments only, joined, without markers. This is what is sent to the corrector. */
  finalClean: string;
  /** The text of the result that is still changing (empty when everything is final). */
  interim: string;
  /** finalMarked + interim, for live display. */
  live: string;
  segments: Segment[];
  hasUnclear: boolean;
  hasCheck: boolean;
}

const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const same = (a: string, b: string) => words(a).join(' ') === words(b).join(' ');
export const tidy = (t: string) => t.replace(/\s+/g, ' ').trim();

export function bestAlternative(result: RawResult): { text: string; confidence: number } {
  let best = { text: '', confidence: -1 };
  result.alternatives.forEach((alt, i) => {
    const text = tidy(alt.transcript ?? '');
    const confidence = typeof alt.confidence === 'number' && alt.confidence > 0 ? alt.confidence : 0;
    // The first alternative is the engine's own best guess; another only wins when clearly more confident.
    if (text && (best.confidence < 0 || (i > 0 && confidence > best.confidence + 0.15))) best = { text, confidence };
  });
  return best.confidence < 0 ? { text: '', confidence: 0 } : best;
}

/**
 * Removes a phrase of 3 or more words that is immediately repeated ("how are you how are you" -> "how are you").
 * Shorter repeats ("very very good", "no no") are kept, because people really say those.
 */
export function collapseRepeatedPhrases(text: string): string {
  const w = tidy(text).split(' ').filter(Boolean);
  const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
  let changed = true;
  while (changed) {
    changed = false;
    for (let n = Math.floor(w.length / 2); n >= 3 && !changed; n--) {
      for (let i = 0; i + 2 * n <= w.length; i++) {
        let equal = true;
        for (let k = 0; k < n; k++) if (key(w[i + k]) !== key(w[i + n + k])) { equal = false; break; }
        if (equal) { w.splice(i + n, n); changed = true; break; }
      }
    }
  }
  return w.join(' ');
}

/** Joins two pieces of recognised text without repeating words (used when a session is restarted). */
export function mergeTranscripts(previous: string, next: string): string {
  const a = tidy(previous), b = tidy(next);
  if (!a) return collapseRepeatedPhrases(b);
  if (!b) return a;
  const na = words(a).join(' '), nb = words(b).join(' ');
  if (nb === na || na.endsWith(nb)) return a; // the same words again
  if (nb.startsWith(na)) return collapseRepeatedPhrases(b); // the engine sent a longer copy of what we already have
  return collapseRepeatedPhrases(`${a} ${b}`);
}

export function buildTranscript(results: readonly RawResult[]): Transcript {
  const segments: Segment[] = [];
  let interim = '';
  for (const result of results) {
    const { text, confidence } = bestAlternative(result);
    if (!text) continue;
    if (!result.isFinal) { interim = text; continue; }
    const prev = segments[segments.length - 1];
    if (prev && same(prev.text, text)) continue; // exact duplicate result
    if (prev && words(text).join(' ').startsWith(words(prev.text).join(' ')) && words(prev.text).length >= 2) {
      segments[segments.length - 1] = mk(text, confidence); // a growing copy: keep the longer one
      continue;
    }
    segments.push(mk(text, confidence));
  }
  const marked = (s: Segment) => (s.unclear ? UNCLEAR : s.text);
  const finalMarked = collapseRepeatedPhrases(segments.map(marked).join(' '));
  const finalClean = collapseRepeatedPhrases(segments.filter((s) => !s.unclear).map((s) => s.text).join(' '));
  // Interim text that only repeats the end of the final text is not shown twice.
  const interimShown = interim && words(finalClean).join(' ').endsWith(words(interim).join(' ')) ? '' : interim;
  return {
    finalMarked, finalClean, interim: interimShown,
    live: tidy(`${finalMarked} ${interimShown}`),
    segments,
    hasUnclear: segments.some((s) => s.unclear),
    hasCheck: segments.some((s) => s.check && !s.unclear),
  };
}

function mk(text: string, confidence: number): Segment {
  const unclear = confidence > 0 && confidence < UNCLEAR_BELOW;
  return { text, confidence, isFinal: true, unclear, check: confidence > 0 && confidence < CHECK_BELOW };
}

/** Removes [Unclear] markers (and the extra spaces they leave) so the text can be checked or edited. */
export function stripUnclear(text: string): string {
  return tidy(text.replace(/\[Unclear\]/gi, ' '));
}
