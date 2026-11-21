import { SrsEntry } from '../models/learning.models';
import { addDays } from './dates';

/**
 * Spaced revision with Leitner boxes (a simple, well-known method, not AI):
 * a word you answer correctly moves up one box and comes back after a longer gap;
 * a word you miss goes back to box 0 and comes back tomorrow.
 */
export const BOX_GAP_DAYS = [1, 2, 4, 8, 16, 32];
export const MAX_BOX = BOX_GAP_DAYS.length - 1;
/** A word in this box or higher counts as "well known". */
export const KNOWN_BOX = 3;

export function newEntry(today: string): SrsEntry {
  return { box: 0, due: today, seen: 0, wrong: 0 };
}

export function grade(entry: SrsEntry | undefined, correct: boolean, today: string): SrsEntry {
  const base = entry ?? newEntry(today);
  const box = correct ? Math.min(base.box + 1, MAX_BOX) : 0;
  const gap = BOX_GAP_DAYS[correct ? box : 0] ?? 1;
  return {
    box,
    due: addDays(today, gap),
    seen: base.seen + 1,
    wrong: base.wrong + (correct ? 0 : 1),
  };
}

export function isDue(entry: SrsEntry, today: string): boolean {
  return entry.due <= today; // yyyy-mm-dd strings sort in date order
}

/** Words that need work: missed recently or still in the lowest boxes after being missed. */
export function needsRevision(entry: SrsEntry): boolean {
  return entry.wrong > 0 && entry.box < KNOWN_BOX;
}
