import { DayRecord, ProgressState, QuizResult, Settings, SrsEntry } from '../models/learning.models';
import { addDays } from './dates';
import { KNOWN_BOX, MAX_BOX } from './srs';

export const STORAGE_KEY = 'my-english-buddy.progress.v1';
const MAX_QUIZ_HISTORY = 200;

export function emptyDay(): DayRecord {
  return {
    wordsLearned: false,
    sentencesLearned: false,
    practiceDone: false,
    speakingDone: false,
    exercisesCorrect: 0,
    exercisesTotal: 0,
    speakingAttempts: 0,
  };
}

export function defaultSettings(): Settings {
  return { speechRate: 0.9, showTamil: true };
}

export function defaultState(): ProgressState {
  return {
    version: 1,
    favWords: [],
    favSentences: [],
    learnedWords: [],
    chatWords: {},
    srs: {},
    sentencesLearned: {},
    wordCursor: {},
    sentenceCursor: {},
    days: {},
    quizzes: [],
    plan: null,
    settings: defaultSettings(),
  };
}

// ---------- Defensive reading of saved data ----------
// localStorage can hold anything (an old version, a hand-edited file, a half-written value).
// Everything is checked, and bad parts are dropped instead of crashing the app.

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isKey(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 40;
}
function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function num(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isKey))].slice(0, 5000) : [];
}
function bool(value: unknown): boolean {
  return value === true;
}

export function sanitizeState(raw: unknown): ProgressState {
  const out = defaultState();
  if (!isObject(raw)) return out;

  out.favWords = stringList(raw['favWords']);
  out.favSentences = stringList(raw['favSentences']);
  out.learnedWords = stringList(raw['learnedWords']);

  if (isObject(raw['srs'])) {
    for (const [id, value] of Object.entries(raw['srs'])) {
      if (!isKey(id) || !isObject(value) || !isDate(value['due'])) continue;
      const entry: SrsEntry = {
        box: Math.round(num(value['box'], 0, MAX_BOX, 0)),
        due: value['due'],
        seen: Math.round(num(value['seen'], 0, 100000, 0)),
        wrong: Math.round(num(value['wrong'], 0, 100000, 0)),
      };
      out.srs[id] = entry;
    }
  }
  if (isObject(raw['chatWords'])) {
    for (const [id, value] of Object.entries(raw['chatWords'])) {
      if (isKey(id) && isObject(value) && isDate(value['date'])) out.chatWords[id] = { date: value['date'], how: value['how'] === 'taught' ? 'taught' : 'seen' };
    }
  }
  if (isObject(raw['sentencesLearned'])) {
    for (const [id, value] of Object.entries(raw['sentencesLearned'])) {
      if (isKey(id) && isDate(value)) out.sentencesLearned[id] = value;
    }
  }
  for (const field of ['wordCursor', 'sentenceCursor'] as const) {
    const source = raw[field];
    if (!isObject(source)) continue;
    for (const [id, value] of Object.entries(source)) {
      if (isKey(id)) out[field][id] = Math.round(num(value, 0, 1_000_000, 0));
    }
  }
  if (isObject(raw['days'])) {
    for (const [date, value] of Object.entries(raw['days'])) {
      if (!isDate(date) || !isObject(value)) continue;
      out.days[date] = {
        wordsLearned: bool(value['wordsLearned']),
        sentencesLearned: bool(value['sentencesLearned']),
        practiceDone: bool(value['practiceDone']),
        speakingDone: bool(value['speakingDone']),
        exercisesCorrect: Math.round(num(value['exercisesCorrect'], 0, 100000, 0)),
        exercisesTotal: Math.round(num(value['exercisesTotal'], 0, 100000, 0)),
        speakingAttempts: Math.round(num(value['speakingAttempts'], 0, 100000, 0)),
      };
    }
  }
  if (Array.isArray(raw['quizzes'])) {
    for (const value of raw['quizzes']) {
      if (!isObject(value) || !isDate(value['date'])) continue;
      const kind = value['kind'];
      if (kind !== 'daily' && kind !== 'revision' && kind !== 'quick') continue;
      const total = Math.round(num(value['total'], 1, 1000, 1));
      const quiz: QuizResult = { date: value['date'], kind, total, correct: Math.round(num(value['correct'], 0, total, 0)) };
      out.quizzes.push(quiz);
    }
    out.quizzes = out.quizzes.slice(-MAX_QUIZ_HISTORY);
  }
  const plan = raw['plan'];
  if (isObject(plan) && isDate(plan['date'])) {
    const wordIds = stringList(plan['wordIds']);
    const sentenceIds = stringList(plan['sentenceIds']);
    if (wordIds.length > 0 && sentenceIds.length > 0) out.plan = { date: plan['date'], wordIds, sentenceIds };
  }
  if (isObject(raw['settings'])) {
    out.settings = {
      speechRate: num(raw['settings']['speechRate'], 0.5, 1.5, 0.9),
      showTamil: raw['settings']['showTamil'] !== false,
    };
  }
  return out;
}

// ---------- Statistics ----------

/** A day counts for the streak when the three main lesson steps are done. */
export function isLessonComplete(day: DayRecord | undefined): boolean {
  return !!day && day.wordsLearned && day.sentencesLearned && day.practiceDone;
}

/** Days in a row with a finished lesson. Today does not break the streak while it is still open. */
export function currentStreak(days: Record<string, DayRecord>, today: string): number {
  let cursor = isLessonComplete(days[today]) ? today : addDays(today, -1);
  let count = 0;
  while (isLessonComplete(days[cursor])) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function bestStreak(days: Record<string, DayRecord>): number {
  const done = Object.keys(days).filter((d) => isLessonComplete(days[d])).sort();
  let best = 0;
  let run = 0;
  let previous = '';
  for (const date of done) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

export interface Stats {
  wordsIntroduced: number;
  wordsKnown: number;
  wordsNeedingRevision: number;
  sentencesLearned: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  averageScore: number | null;
  streak: number;
  bestStreak: number;
}

export function computeStats(state: ProgressState, today: string): Stats {
  const entries = Object.values(state.srs);
  const quizzes = state.quizzes;
  const correct = quizzes.reduce((n, q) => n + q.correct, 0);
  const total = quizzes.reduce((n, q) => n + q.total, 0);
  return {
    wordsIntroduced: entries.length,
    wordsKnown: entries.filter((e) => e.box >= KNOWN_BOX).length,
    wordsNeedingRevision: entries.filter((e) => e.wrong > 0 && e.box < KNOWN_BOX).length,
    sentencesLearned: Object.keys(state.sentencesLearned).length,
    lessonsCompleted: Object.values(state.days).filter(isLessonComplete).length,
    quizzesTaken: quizzes.length,
    averageScore: total === 0 ? null : Math.round((correct / total) * 100),
    streak: currentStreak(state.days, today),
    bestStreak: bestStreak(state.days),
  };
}
