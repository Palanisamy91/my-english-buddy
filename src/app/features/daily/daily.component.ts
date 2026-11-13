import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Exercise } from '../../models/learning.models';
import { FeedbackService, SpeakingFeedback } from '../../core/feedback.service';
import { LessonService, TodayLesson } from '../../core/lesson.service';
import { ProgressService } from '../../core/progress.service';
import { ExerciseRunnerComponent, RunnerSummary } from '../../shared/exercise-runner.component';
import { FeedbackPanelComponent } from '../../shared/feedback-panel.component';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { VoiceInputComponent } from '../../shared/voice-input.component';

type Step = 'words' | 'sentences' | 'practice' | 'speak' | 'done';

@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [RouterLink, ExerciseRunnerComponent, FeedbackPanelComponent, SpeakButtonComponent, VoiceInputComponent],
  template: `
    <h1>Today's lesson</h1>

    @if (loading()) {
      <p class="card">Preparing today's lesson…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="load()">Try again</button></p>
    } @else if (lesson(); as l) {
      <nav class="steps" aria-label="Lesson steps">
        @for (s of steps; track s.id) {
          <button type="button" class="step" [class.active]="step() === s.id" [class.done]="isDone(s.id)" (click)="go(s.id)">
            {{ isDone(s.id) ? '✓' : s.icon }} {{ s.label }}
          </button>
        }
      </nav>

      @switch (step()) {
        @case ('words') {
          @let w = l.words[wordIndex()];
          <section class="card word-card">
            <p class="small">Word {{ wordIndex() + 1 }} of {{ l.words.length }} · {{ w.level }}</p>
            <h2 class="big-word">{{ w.word }}</h2>
            <p class="pron">{{ w.pron }} · {{ w.pos }} <app-speak-button [text]="w.word" /></p>
            <p class="tamil" lang="ta">{{ w.tamil }}</p>
            <p class="ex">“{{ w.example }}” <app-speak-button [text]="w.example" /></p>
            @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ w.exampleTamil }}</p> }
            <p class="small">Similar: {{ w.synonyms.join(', ') }}</p>
            <div class="row">
              <button type="button" class="btn" [disabled]="wordIndex() === 0" (click)="wordIndex.set(wordIndex() - 1)">Back</button>
              <button type="button" class="btn primary grow" (click)="nextWord(l)">{{ wordIndex() + 1 === l.words.length ? 'Finish words' : 'Next word' }}</button>
            </div>
          </section>
        }
        @case ('sentences') {
          @let s = l.sentences[sentenceIndex()];
          <section class="card">
            <p class="small">Sentence {{ sentenceIndex() + 1 }} of {{ l.sentences.length }} · {{ s.tense }} · {{ s.type }}</p>
            <p class="ex big">“{{ s.en }}” <app-speak-button [text]="s.en" /></p>
            @if (progress.settings().showTamil) { <p class="tamil" lang="ta">{{ s.tamil }}</p> }
            <p class="small">When to use: {{ s.context }}</p>
            @if (s.alt; as alt) {
              <div class="alt">
                <p class="label">Simple, natural alternative:</p>
                <p>“{{ alt.en }}” <app-speak-button [text]="alt.en" /></p>
                @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ alt.tamil }}</p> }
              </div>
            }
            <div class="row">
              <button type="button" class="btn" [disabled]="sentenceIndex() === 0" (click)="sentenceIndex.set(sentenceIndex() - 1)">Back</button>
              <button type="button" class="btn primary grow" (click)="nextSentence(l)">{{ sentenceIndex() + 1 === l.sentences.length ? 'Finish sentences' : 'Next sentence' }}</button>
            </div>
          </section>
        }
        @case ('practice') {
          @if (practiceLoading()) {
            <p class="card">Preparing practice questions…</p>
          } @else if (practice().length > 0) {
            <app-exercise-runner [exercises]="practice()" (answered)="onAnswered($event.exercise, $event.correct)" (done)="onPracticeDone($event)" />
          }
          @if (practiceError()) { <p class="card notice warn">{{ practiceError() }}</p> }
        }
        @case ('speak') {
          <section class="card">
            <p class="small">Say it aloud · {{ speakIndex() + 1 }} of {{ speakTargets(l).length }}</p>
            <p class="ex big">“{{ speakTargets(l)[speakIndex()].en }}” <app-speak-button [text]="speakTargets(l)[speakIndex()].en" label="Listen first" /></p>
            <app-voice-input (heard)="onSpoken($event, speakTargets(l)[speakIndex()].en)" />
          </section>
          <app-feedback-panel [feedback]="feedback()" />
          <div class="row">
            <button type="button" class="btn" (click)="nextSpeak(l)">{{ speakIndex() + 1 >= speakTargets(l).length ? 'Finish' : 'Next sentence' }}</button>
            <button type="button" class="btn" (click)="finishSpeaking()">Skip speaking</button>
          </div>
        }
        @case ('done') {
          <section class="card center">
            <h2>🎉 Lesson complete!</h2>
            <p>You learned {{ l.words.length }} words and {{ l.sentences.length }} sentences today.</p>
            <p class="small">Words are saved for revision. Open <a routerLink="/revision">Revision</a> tomorrow.</p>
            <a class="btn primary" routerLink="/progress">See my progress</a>
          </section>
        }
      }
    }
  `,
  styles: `
    .steps { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 10px; padding-bottom: 4px; }
    .step { white-space: nowrap; padding: 8px 12px; border-radius: 18px; border: 1px solid var(--border); background: #fff; min-height: 40px; }
    .step.active { background: var(--primary); color: #fff; border-color: var(--primary); } .step.done:not(.active) { background: #ebfbee; border-color: #8ce99a; }
    .big-word { font-size: 2rem; margin: 4px 0; } .pron { color: #495057; margin: 0 0 6px; } .tamil { font-size: 1.25rem; margin: 6px 0; }
    .ex { margin: 6px 0; } .ex.big { font-size: 1.25rem; } .alt { background: var(--primary-tint); border-radius: 10px; padding: 8px 12px; margin: 10px 0; }
    .center { text-align: center; }
  `,
})
export class DailyComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly lessons = inject(LessonService);
  private readonly feedbackService = inject(FeedbackService);

  readonly steps: { id: Step; label: string; icon: string }[] = [
    { id: 'words', label: '10 Words', icon: '📘' },
    { id: 'sentences', label: '10 Sentences', icon: '💬' },
    { id: 'practice', label: 'Practice', icon: '✏️' },
    { id: 'speak', label: 'Speak', icon: '🎤' },
  ];

  readonly lesson = signal<TodayLesson | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly step = signal<Step>('words');
  readonly wordIndex = signal(0);
  readonly sentenceIndex = signal(0);
  readonly speakIndex = signal(0);
  readonly practice = signal<Exercise[]>([]);
  readonly practiceLoading = signal(false);
  readonly practiceError = signal('');
  readonly feedback = signal<SpeakingFeedback | null>(null);

  private practiceTotals = { correct: 0, total: 0 };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const lesson = await this.lessons.today();
      this.lesson.set(lesson);
      this.step.set(this.firstOpenStep());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not prepare the lesson.');
    } finally {
      this.loading.set(false);
    }
  }

  isDone(step: Step): boolean {
    const day = this.progress.todayRecord();
    if (step === 'words') return day.wordsLearned;
    if (step === 'sentences') return day.sentencesLearned;
    if (step === 'practice') return day.practiceDone;
    if (step === 'speak') return day.speakingDone;
    return false;
  }

  go(step: Step): void {
    this.step.set(step);
    this.feedback.set(null);
    if (step === 'practice') void this.preparePractice();
  }

  nextWord(lesson: TodayLesson): void {
    if (this.wordIndex() + 1 < lesson.words.length) {
      this.wordIndex.update((i) => i + 1);
      return;
    }
    this.progress.addToRevision(lesson.words.map((w) => w.id));
    this.progress.patchToday({ wordsLearned: true });
    this.wordIndex.set(0);
    this.go('sentences');
  }

  nextSentence(lesson: TodayLesson): void {
    if (this.sentenceIndex() + 1 < lesson.sentences.length) {
      this.sentenceIndex.update((i) => i + 1);
      return;
    }
    this.progress.markSentencesLearned(lesson.sentences.map((s) => s.id));
    this.progress.patchToday({ sentencesLearned: true });
    this.sentenceIndex.set(0);
    this.go('practice');
  }

  async preparePractice(): Promise<void> {
    const lesson = this.lesson();
    if (!lesson || this.practice().length > 0 || this.practiceLoading()) return;
    this.practiceLoading.set(true);
    this.practiceError.set('');
    try {
      this.practice.set(await this.lessons.practiceFor(lesson));
    } catch (err) {
      this.practiceError.set(err instanceof Error ? err.message : 'Could not prepare the questions.');
    } finally {
      this.practiceLoading.set(false);
    }
  }

  onAnswered(exercise: Exercise, correct: boolean): void {
    if (exercise.wordId) this.progress.gradeWord(exercise.wordId, correct);
  }

  onPracticeDone(summary: RunnerSummary): void {
    this.practiceTotals = summary;
    this.progress.recordQuiz('daily', summary.correct, summary.total);
    this.progress.patchToday({ practiceDone: true }, { correct: summary.correct, total: summary.total });
    this.go('speak');
  }

  /** Three of today's sentences are used for speaking, spread over the list. */
  speakTargets(lesson: TodayLesson) {
    const picks = [0, 3, 6].map((i) => lesson.sentences[i]).filter((s) => s !== undefined);
    return picks.length > 0 ? picks : lesson.sentences.slice(0, 1);
  }

  async onSpoken(heard: string, target: string): Promise<void> {
    this.feedback.set(await this.feedbackService.analyse(heard, target));
    this.progress.recordSpeaking();
  }

  nextSpeak(lesson: TodayLesson): void {
    this.feedback.set(null);
    if (this.speakIndex() + 1 >= this.speakTargets(lesson).length) {
      this.finishSpeaking();
      return;
    }
    this.speakIndex.update((i) => i + 1);
  }

  finishSpeaking(): void {
    if (this.progress.todayRecord().speakingAttempts > 0) this.progress.patchToday({ speakingDone: true });
    this.speakIndex.set(0);
    this.feedback.set(null);
    this.step.set('done');
  }

  private firstOpenStep(): Step {
    const day = this.progress.todayRecord();
    if (!day.wordsLearned) return 'words';
    if (!day.sentencesLearned) return 'sentences';
    if (!day.practiceDone) {
      void this.preparePractice();
      return 'practice';
    }
    return 'done';
  }
}
