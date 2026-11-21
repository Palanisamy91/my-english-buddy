import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { meaningExercises, seededRng, tamilToWordExercises } from '../../core/exercises';
import { ProgressService } from '../../core/progress.service';
import { Exercise, Word } from '../../models/learning.models';
import { ExerciseRunnerComponent, RunnerSummary } from '../../shared/exercise-runner.component';
import { SpeakButtonComponent } from '../../shared/speak-button.component';

type Mode = 'menu' | 'cards' | 'quiz';

@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [RouterLink, ExerciseRunnerComponent, SpeakButtonComponent],
  template: `
    <h1>Revision</h1>

    @if (loading()) {
      <p class="card">Loading your words…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="load()">Try again</button></p>
    } @else if (mode() === 'menu') {
      <section class="card">
        <h2>{{ due().length }} words due today</h2>
        <p class="small">Words come back after 1, 2, 4, 8, 16 and 32 days while you keep answering correctly. A wrong answer brings the word back tomorrow.</p>
        <div class="row">
          <button type="button" class="btn primary" [disabled]="due().length === 0" (click)="startCards()">🃏 Flash cards</button>
          <button type="button" class="btn" [disabled]="pool().length < 4" (click)="startQuiz()">✏️ Quiz</button>
        </div>
        @if (due().length === 0) {
          <p class="small">{{ pool().length === 0 ? 'No words yet. Finish a daily lesson or add words from the Vocabulary page.' : 'Nothing is due. Come back tomorrow, or take a quiz on all your words.' }}</p>
        }
      </section>

      @if (weak().length > 0) {
        <section class="card">
          <h2>Words that need more practice ({{ weak().length }})</h2>
          @for (w of weak(); track w.id) {
            <p class="line"><strong>{{ w.word }}</strong> <app-speak-button [text]="w.word" /> <span lang="ta">{{ w.tamil }}</span></p>
          }
        </section>
      }
    } @else if (mode() === 'cards') {
      @if (card(); as w) {
        <section class="card center">
          <p class="small">Card {{ cardIndex() + 1 }} of {{ due().length }}</p>
          <h2 class="big-word">{{ w.word }}</h2>
          <p>{{ w.pron }} <app-speak-button [text]="w.word" /></p>
          @if (revealed()) {
            <p class="tamil" lang="ta">{{ w.tamil }}</p>
            <p>“{{ w.example }}” <app-speak-button [text]="w.example" /></p>
            <div class="row">
              <button type="button" class="btn bad grow" (click)="grade(w, false)">Again</button>
              <button type="button" class="btn primary grow" (click)="grade(w, true)">I knew it</button>
            </div>
          } @else {
            <p class="small">Try to remember the Tamil meaning first.</p>
            <button type="button" class="btn primary" (click)="revealed.set(true)">Show meaning</button>
          }
        </section>
      } @else {
        <section class="card center">
          <h2>Done!</h2>
          <p>{{ knew() }} of {{ due().length }} remembered. Words you missed come back tomorrow.</p>
          <button type="button" class="btn primary" (click)="finishCards()">Back</button>
        </section>
      }
    } @else {
      <app-exercise-runner [exercises]="quiz()" (answered)="onAnswered($event.exercise, $event.correct)" (done)="onQuizDone($event)" />
      <button type="button" class="btn" (click)="mode.set('menu')">Back to revision</button>
    }
    <p class="small">New here? <a routerLink="/daily">Start with today's lesson.</a></p>
  `,
  styles: `
    .big-word { font-size: 2rem; margin: 4px 0; } .tamil { font-size: 1.3rem; } .center { text-align: center; } .line { margin: 6px 0; }
    .btn.bad { background: #ffe3e3; border-color: #e03131; }
  `,
})
export class RevisionComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly data = inject(DataService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly mode = signal<Mode>('menu');
  /** Every word the learner has met (due or not), used for quizzes. */
  readonly pool = signal<Word[]>([]);
  readonly cardIndex = signal(0);
  readonly revealed = signal(false);
  readonly knew = signal(0);
  readonly quiz = signal<Exercise[]>([]);
  private dueSnapshot = signal<Word[]>([]);

  readonly due = this.dueSnapshot.asReadonly();
  readonly card = computed(() => this.due()[this.cardIndex()]);
  readonly weak = computed(() => {
    const ids = new Set(this.progress.weakWordIds());
    return this.pool().filter((w) => ids.has(w.id));
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const known = Object.keys(this.progress.state().srs);
      const words = await this.data.wordsByIds(known);
      this.pool.set(words);
      const dueIds = new Set(this.progress.dueWordIds());
      this.dueSnapshot.set(words.filter((w) => dueIds.has(w.id)));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load your words.');
    } finally {
      this.loading.set(false);
    }
  }

  startCards(): void {
    this.cardIndex.set(0);
    this.knew.set(0);
    this.revealed.set(false);
    this.mode.set('cards');
  }

  grade(word: Word, correct: boolean): void {
    this.progress.gradeWord(word.id, correct);
    if (correct) this.knew.update((n) => n + 1);
    this.revealed.set(false);
    this.cardIndex.update((i) => i + 1);
  }

  finishCards(): void {
    this.progress.recordQuiz('revision', this.knew(), this.due().length);
    this.mode.set('menu');
    void this.load();
  }

  async startQuiz(): Promise<void> {
    const rng = seededRng('revision-' + this.progress.today() + '-' + Date.now());
    // up to 10 words: the due ones first, then others
    const dueIds = new Set(this.due().map((w) => w.id));
    const chosen = [...this.pool().filter((w) => dueIds.has(w.id)), ...this.pool().filter((w) => !dueIds.has(w.id))].slice(0, 10);
    let extra: Word[] = [];
    try {
      extra = await this.data.distractorWords();
    } catch {
      extra = [];
    }
    const wrongAnswerPool = [...this.pool(), ...extra];
    this.quiz.set([...meaningExercises(chosen, wrongAnswerPool, rng), ...tamilToWordExercises(chosen.slice(0, 5), wrongAnswerPool, rng)]);
    this.mode.set('quiz');
  }

  onAnswered(exercise: Exercise, correct: boolean): void {
    if (exercise.wordId) this.progress.gradeWord(exercise.wordId, correct);
  }

  onQuizDone(summary: RunnerSummary): void {
    this.progress.recordQuiz('revision', summary.correct, summary.total);
  }
}

