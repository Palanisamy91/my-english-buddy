import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { checkAnswer } from '../core/exercises';
import { AnswerCheck, Exercise } from '../models/learning.models';
import { SpeakButtonComponent } from './speak-button.component';

export interface RunnerSummary {
  correct: number;
  total: number;
}

/** Shows one exercise at a time (quiz, fill in the blank, rearrange, translate) with instant feedback. */
@Component({
  selector: 'app-exercise-runner',
  standalone: true,
  imports: [SpeakButtonComponent],
  template: `
    @if (finished()) {
      <section class="card center">
        <h2>Finished!</h2>
        <p class="big">{{ correct() }} / {{ list().length }}</p>
        <p>{{ scoreMessage() }}</p>
        <button type="button" class="btn primary" (click)="restart()">Try again</button>
      </section>
    } @else if (current(); as ex) {
      <section class="card">
        <p class="small">Question {{ index() + 1 }} of {{ list().length }}</p>
        <div class="bar"><span [style.width.%]="(index() / list().length) * 100"></span></div>
        <h2 class="q-title">{{ ex.title }}</h2>
        <p class="prompt" [attr.lang]="isTamilPrompt(ex) ? 'ta' : 'en'">{{ ex.prompt }}</p>
        @if (ex.hint) {
          <p class="small" [attr.lang]="isTamilPrompt(ex) ? 'en' : 'ta'">{{ ex.hint }}</p>
        }

        @switch (ex.kind) {
          @case ('rearrange') {
            <div class="built" aria-label="Your sentence">
              @for (i of picked(); track i) {
                <button type="button" class="chip on" [disabled]="result() !== null" (click)="unpick(i)">{{ ex.tokens![i] }}</button>
              } @empty {
                <span class="small">Tap the words below in order.</span>
              }
            </div>
            <div class="pool">
              @for (token of ex.tokens!; track $index) {
                <button type="button" class="chip" [disabled]="result() !== null || picked().includes($index)" (click)="pick($index)">{{ token }}</button>
              }
            </div>
            <button type="button" class="btn primary" [disabled]="result() !== null || picked().length === 0" (click)="submitRearrange(ex)">Check</button>
          }
          @case ('translate-type') {
            <form (submit)="submitTyped($event, ex, box)">
              <input #box class="full" type="text" name="answer" autocomplete="off" autocapitalize="sentences"
                     placeholder="Type the English sentence" aria-label="Your English sentence" [disabled]="result() !== null" maxlength="200" />
              <button type="submit" class="btn primary" [disabled]="result() !== null">Check</button>
            </form>
          }
          @default {
            <div class="options">
              @for (option of ex.options!; track option) {
                <button type="button" class="option"
                        [class.right]="result() !== null && option === ex.answer"
                        [class.wrong]="result() !== null && option === chosen() && option !== ex.answer"
                        [disabled]="result() !== null" (click)="choose(ex, option)">{{ option }}</button>
              }
            </div>
          }
        }

        @if (result(); as r) {
          <div class="result" [class.good]="r.correct" [class.bad]="!r.correct" role="status">
            <strong>{{ r.correct ? '✅ Correct!' : '❌ Not quite.' }}</strong>
            @if (!r.correct || ex.kind === 'translate-type') {
              <span class="block">Answer: {{ ex.answer }}</span>
            }
            @if (ex.explanation && ex.kind !== 'rearrange' && ex.kind !== 'translate-type') {
              <span class="block small">{{ ex.explanation }}</span>
            }
            @if (ex.speak) { <app-speak-button [text]="ex.speak" label="Listen" /> }
          </div>
          <button type="button" class="btn primary" (click)="next()">{{ index() + 1 >= list().length ? 'See score' : 'Next' }}</button>
        }
      </section>
    } @else {
      <p class="card">No questions available yet.</p>
    }
  `,
  styles: `
    .prompt { font-size: 1.3rem; font-weight: 600; margin: 6px 0; }
    .q-title { font-size: 1rem; color: var(--primary); margin: 10px 0 0; }
    .bar { height: 6px; background: var(--border); border-radius: 4px; overflow: hidden; } .bar span { display: block; height: 100%; background: var(--primary); }
    .options { display: grid; gap: 8px; margin: 10px 0; }
    .option { text-align: left; padding: 12px; border: 2px solid var(--border); background: #fff; border-radius: 10px; font-size: 1rem; min-height: 44px; }
    .option.right { border-color: #2f9e44; background: #d3f9d8; } .option.wrong { border-color: #e03131; background: #ffe3e3; }
    .built, .pool { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; min-height: 44px; }
    .built { border-bottom: 2px solid var(--border); padding-bottom: 8px; }
    .chip { padding: 8px 12px; border: 1px solid var(--border); background: #fff; border-radius: 18px; font-size: 1rem; min-height: 40px; }
    .chip.on { background: var(--primary-soft); border-color: var(--primary); } .chip:disabled { opacity: .45; }
    .result { margin: 10px 0; padding: 10px; border-radius: 10px; } .result.good { background: #ebfbee; } .result.bad { background: #fff0f0; }
    .block { display: block; margin: 4px 0; } .full { width: 100%; margin: 8px 0; } .center { text-align: center; } .big { font-size: 2.4rem; margin: 4px 0; font-weight: 700; }
  `,
})
export class ExerciseRunnerComponent {
  readonly list = signal<Exercise[]>([]);
  readonly index = signal(0);
  readonly correct = signal(0);
  readonly result = signal<AnswerCheck | null>(null);
  readonly chosen = signal('');
  readonly picked = signal<number[]>([]);
  readonly finished = signal(false);

  readonly current = computed(() => this.list()[this.index()]);
  readonly scoreMessage = computed(() => {
    const total = this.list().length;
    const ratio = total === 0 ? 0 : this.correct() / total;
    if (ratio >= 0.9) return 'Excellent work!';
    if (ratio >= 0.7) return 'Good job. Keep practising.';
    return 'Keep going. The words you missed will come back for revision.';
  });

  @Input({ required: true })
  set exercises(value: Exercise[]) {
    this.list.set(value);
    this.restart();
  }

  /** Fires after every answer, so the parent can update word progress. */
  @Output() readonly answered = new EventEmitter<{ exercise: Exercise; correct: boolean }>();
  @Output() readonly done = new EventEmitter<RunnerSummary>();

  isTamilPrompt(ex: Exercise): boolean {
    return ex.kind === 'tamil-word' || ex.kind === 'rearrange' || ex.kind === 'translate-choose' || ex.kind === 'translate-type';
  }

  choose(ex: Exercise, option: string): void {
    if (this.result() !== null) return;
    this.chosen.set(option);
    this.finish(ex, checkAnswer(ex, option));
  }

  pick(i: number): void {
    this.picked.update((p) => [...p, i]);
  }

  unpick(i: number): void {
    this.picked.update((p) => p.filter((x) => x !== i));
  }

  submitRearrange(ex: Exercise): void {
    const given = this.picked().map((i) => ex.tokens![i]).join(' ');
    this.finish(ex, checkAnswer(ex, given));
  }

  submitTyped(event: Event, ex: Exercise, box: HTMLInputElement): void {
    event.preventDefault();
    if (this.result() !== null || !box.value.trim()) return;
    this.finish(ex, checkAnswer(ex, box.value));
  }

  next(): void {
    if (this.index() + 1 >= this.list().length) {
      this.finished.set(true);
      this.done.emit({ correct: this.correct(), total: this.list().length });
      return;
    }
    this.index.update((i) => i + 1);
    this.result.set(null);
    this.chosen.set('');
    this.picked.set([]);
  }

  restart(): void {
    this.index.set(0);
    this.correct.set(0);
    this.result.set(null);
    this.chosen.set('');
    this.picked.set([]);
    this.finished.set(false);
  }

  private finish(ex: Exercise, check: AnswerCheck): void {
    this.result.set(check);
    if (check.correct) this.correct.update((c) => c + 1);
    this.answered.emit({ exercise: ex, correct: check.correct });
  }
}
