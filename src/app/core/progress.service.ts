import { Injectable, computed, inject, signal } from '@angular/core';
import { DailyPlan, DayRecord, ProgressState, QuizResult, Settings } from '../models/learning.models';
import { toDateKey } from './dates';
import { buildPlan } from './plan';
import {
  STORAGE_KEY,
  Stats,
  computeStats,
  defaultState,
  emptyDay,
  isLessonComplete,
  sanitizeState,
} from './progress-state';
import { grade, isDue, newEntry } from './srs';
import { StorageService } from './storage.service';
import { ContentCategory } from '../models/learning.models';

/**
 * The learner's saved progress: favourites, revision schedule, daily records and quiz scores.
 * Everything lives in this device's localStorage (no account, no server).
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly storage = inject(StorageService);
  private readonly _state = signal<ProgressState>(this.load());

  readonly state = this._state.asReadonly();
  readonly settings = computed(() => this._state().settings);
  readonly favWordSet = computed(() => new Set(this._state().favWords));
  readonly favSentenceSet = computed(() => new Set(this._state().favSentences));
  readonly learnedWordSet = computed(() => new Set(this._state().learnedWords));
  readonly learnedSentenceSet = computed(() => new Set(Object.keys(this._state().sentencesLearned)));
  readonly storageHealthy = this.storage.healthy;

  readonly stats = computed<Stats>(() => computeStats(this._state(), this.today()));
  readonly dueWordIds = computed(() => {
    const today = this.today();
    return Object.entries(this._state().srs)
      .filter(([, entry]) => isDue(entry, today))
      .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
      .map(([id]) => id);
  });
  readonly weakWordIds = computed(() =>
    Object.entries(this._state().srs)
      .filter(([, e]) => e.wrong > 0 && e.box < 3)
      .sort((a, b) => b[1].wrong - a[1].wrong)
      .map(([id]) => id),
  );

  today(): string {
    return toDateKey(new Date());
  }

  todayRecord(): DayRecord {
    return this._state().days[this.today()] ?? emptyDay();
  }

  lessonCompleteToday(): boolean {
    return isLessonComplete(this._state().days[this.today()]);
  }

  // ---------- Favourites ----------

  toggleFavWord(id: string): void {
    this.update((s) => ({ ...s, favWords: toggle(s.favWords, id) }));
  }

  toggleFavSentence(id: string): void {
    this.update((s) => ({ ...s, favSentences: toggle(s.favSentences, id) }));
  }

  /**
   * Remembers words found in Lela's conversations. Nothing is removed and the learner's own marks
   * (favourite, learned) are not touched. "taught" (Lela taught the word) is never downgraded to "seen".
   */
  collectChatWords(ids: readonly string[], how: 'taught' | 'seen'): number {
    const known = this._state().chatWords;
    const fresh = ids.filter((id) => !known[id] || (how === 'taught' && known[id].how === 'seen'));
    if (!fresh.length) return 0;
    const date = this.today();
    this.update((s) => {
      const chatWords = { ...s.chatWords };
      for (const id of fresh) chatWords[id] = { date: chatWords[id]?.date ?? date, how: how === 'taught' || chatWords[id]?.how === 'taught' ? 'taught' : 'seen' };
      return { ...s, chatWords };
    });
    return fresh.length;
  }

  /** "I know this word" on or off. */
  toggleWordLearned(id: string): void {
    this.update((s) => ({ ...s, learnedWords: toggle(s.learnedWords, id) }));
  }

  /** "I know this sentence" on or off (the daily lesson also marks sentences as learned). */
  toggleSentenceLearned(id: string): void {
    const today = this.today();
    this.update((s) => {
      const learned = { ...s.sentencesLearned };
      if (learned[id]) delete learned[id];
      else learned[id] = today;
      return { ...s, sentencesLearned: learned };
    });
  }

  // ---------- Words and revision ----------

  /** Adds a word to the revision schedule (due today) if it is not there yet. */
  addToRevision(ids: string[]): void {
    const today = this.today();
    this.update((s) => {
      const srs = { ...s.srs };
      for (const id of ids) if (!srs[id]) srs[id] = newEntry(today);
      return { ...s, srs };
    });
  }

  isInRevision(id: string): boolean {
    return id in this._state().srs;
  }

  /** Records a right or wrong answer for a word and schedules its next revision. */
  gradeWord(id: string, correct: boolean): void {
    const today = this.today();
    this.update((s) => ({ ...s, srs: { ...s.srs, [id]: grade(s.srs[id], correct, today) } }));
  }

  markSentencesLearned(ids: string[]): void {
    const today = this.today();
    this.update((s) => {
      const learned = { ...s.sentencesLearned };
      for (const id of ids) if (!learned[id]) learned[id] = today;
      return { ...s, sentencesLearned: learned };
    });
  }

  // ---------- Daily plan and records ----------

  /** Today's plan: created once per day and then kept, so a reload shows the same lesson. */
  ensurePlan(vocab: ContentCategory[], sentences: ContentCategory[]): DailyPlan {
    const today = this.today();
    const existing = this._state().plan;
    if (existing && existing.date === today) return existing;
    const result = buildPlan(today, vocab, sentences, this._state().wordCursor, this._state().sentenceCursor);
    this.update((s) => ({ ...s, plan: result.plan, wordCursor: result.wordCursor, sentenceCursor: result.sentenceCursor }));
    return result.plan;
  }

  patchToday(patch: Partial<DayRecord>, addCounts?: { correct?: number; total?: number; speaking?: number }): void {
    const today = this.today();
    this.update((s) => {
      const day = s.days[today] ?? emptyDay();
      const next: DayRecord = {
        ...day,
        ...patch,
        exercisesCorrect: day.exercisesCorrect + (addCounts?.correct ?? 0),
        exercisesTotal: day.exercisesTotal + (addCounts?.total ?? 0),
        speakingAttempts: day.speakingAttempts + (addCounts?.speaking ?? 0),
      };
      return { ...s, days: { ...s.days, [today]: next } };
    });
  }

  /** Counts one speaking attempt; three attempts in a day complete the optional speaking step. */
  recordSpeaking(): void {
    this.patchToday({}, { speaking: 1 });
    if (this.todayRecord().speakingAttempts >= 3) this.patchToday({ speakingDone: true });
  }

  recordQuiz(kind: QuizResult['kind'], correct: number, total: number): void {
    if (total <= 0) return;
    const result: QuizResult = { date: this.today(), kind, correct, total };
    this.update((s) => ({ ...s, quizzes: [...s.quizzes, result].slice(-200) }));
  }

  // ---------- Settings, backup, reset ----------

  updateSettings(patch: Partial<Settings>): void {
    this.update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  exportJson(): string {
    return JSON.stringify(this._state(), null, 2);
  }

  /** Replaces the saved progress with a backup. Throws a readable error for a bad file. */
  importJson(text: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('This file is not a valid backup (it is not JSON).');
    }
    if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
      throw new Error('This file is not a My English Buddy backup.');
    }
    this.update(() => sanitizeState(parsed));
  }

  reset(): void {
    this.storage.remove(STORAGE_KEY);
    this._state.set(defaultState());
  }

  // ---------- internals ----------

  private update(change: (state: ProgressState) => ProgressState): void {
    const next = change(this._state());
    this._state.set(next);
    this.storage.write(STORAGE_KEY, JSON.stringify(next));
  }

  private load(): ProgressState {
    const text = this.storage.read(STORAGE_KEY);
    if (!text) return defaultState();
    try {
      return sanitizeState(JSON.parse(text));
    } catch {
      return defaultState(); // damaged value: start fresh instead of crashing
    }
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
