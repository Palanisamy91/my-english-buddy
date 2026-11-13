import { ContentCategory, DailyPlan } from '../models/learning.models';
import { daysBetween } from './dates';

export const WORDS_PER_DAY = 10;
export const SENTENCES_PER_DAY = 10;

export interface PlanResult {
  plan: DailyPlan;
  wordCursor: Record<string, number>;
  sentenceCursor: Record<string, number>;
}

function idOf(category: ContentCategory, index: number): string {
  return `${category.prefix}${String(index + 1).padStart(3, '0')}`;
}

/**
 * Takes `count` ids by visiting the categories in turn, starting at `start`.
 * Each category keeps its own cursor: the files are sorted easiest-first, so every
 * category is learned from easy to hard. Categories that still have unseen items are used first, so a small
 * group does not start repeating while larger groups still have new material. When every category has been
 * used up, they start again.
 */
function takeRoundRobin(
  categories: ContentCategory[],
  cursor: Record<string, number>,
  count: number,
  start: number,
): { ids: string[]; cursor: Record<string, number> } {
  const next = { ...cursor };
  const ids: string[] = [];
  const usable = categories.filter((c) => c.count > 0);
  if (usable.length === 0) return { ids, cursor: next };
  for (let i = 0; ids.length < count && i < count * 3; i++) {
    const fresh = usable.filter((c) => (next[c.id] ?? 0) < c.count);
    const pool = fresh.length > 0 ? fresh : usable;
    const category = pool[(start + i) % pool.length];
    const position = (next[category.id] ?? 0) % category.count;
    const id = idOf(category, position);
    if (!ids.includes(id)) ids.push(id);
    next[category.id] = position + 1;
  }
  return { ids, cursor: next };
}

/**
 * Chooses today's lesson: 10 new words and 10 new sentences, without loading any data files.
 * The rotation start depends on the date, so different days begin with different categories.
 */
export function buildPlan(
  date: string,
  vocabCategories: ContentCategory[],
  sentenceCategories: ContentCategory[],
  wordCursor: Record<string, number>,
  sentenceCursor: Record<string, number>,
): PlanResult {
  const dayNumber = Math.abs(daysBetween('2024-01-01', date));
  const words = takeRoundRobin(vocabCategories, wordCursor, WORDS_PER_DAY, dayNumber);
  const sentences = takeRoundRobin(sentenceCategories, sentenceCursor, SENTENCES_PER_DAY, dayNumber * 3);
  return {
    plan: { date, wordIds: words.ids, sentenceIds: sentences.ids },
    wordCursor: words.cursor,
    sentenceCursor: sentences.cursor,
  };
}

/** The category prefix of an id such as "of012" is "of". */
export function prefixOf(id: string): string {
  return id.replace(/\d+$/, '');
}
