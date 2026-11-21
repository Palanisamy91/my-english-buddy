import { Injectable, inject } from '@angular/core';
import { Exercise, Sentence, Word } from '../models/learning.models';
import { DataService } from './data.service';
import { buildDailySet } from './exercises';
import { ProgressService } from './progress.service';

export interface TodayLesson {
  date: string;
  words: Word[];
  sentences: Sentence[];
}

/** Puts the daily plan together with the actual words and sentences. */
@Injectable({ providedIn: 'root' })
export class LessonService {
  private readonly data = inject(DataService);
  private readonly progress = inject(ProgressService);

  async today(): Promise<TodayLesson> {
    const manifest = await this.data.manifest();
    const plan = this.progress.ensurePlan(manifest.vocabCategories, manifest.sentenceCategories);
    const [words, sentences] = await Promise.all([
      this.data.wordsByIds(plan.wordIds),
      this.data.sentencesByIds(plan.sentenceIds),
    ]);
    return { date: plan.date, words, sentences };
  }

  /** Practice questions for the lesson; the same lesson always gives the same questions. */
  async practiceFor(lesson: TodayLesson): Promise<Exercise[]> {
    const [wordPool, sentencePool] = await Promise.all([this.data.distractorWords(), this.data.distractorSentences()]);
    return buildDailySet(lesson.words, lesson.sentences, wordPool, sentencePool, 'daily-' + lesson.date);
  }
}
