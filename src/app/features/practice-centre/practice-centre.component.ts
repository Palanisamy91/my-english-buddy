import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProgressService } from '../../core/progress.service';
import { evaluateTranslation, TranslationEvaluation } from '../../core/translation-evaluator';

interface PracticeItem {
  id: string;
  tamil: string;
  answer: string;
  accepted?: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'interview';
  topic: string;
  explanationTamil: string;
  grammarNote: string;
}

@Component({
  selector: 'app-practice-centre',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="intro">
      <p class="eyebrow">LELA • DAILY PRACTICE</p>
      <h1>Tamil to English practice</h1>
      <p>Translate one sentence at a time. Lela will show a natural answer and explain the grammar in Tamil.</p>
    </section>

    <section class="card controls">
      <label for="level">Practice level</label>
      <select id="level" [ngModel]="level()" (ngModelChange)="changeLevel($event)">
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
        <option value="interview">Interview & workplace</option>
      </select>
      <span class="counter">{{ attempted() }} attempted · {{ correct() }} correct</span>
    </section>

    @if (loading()) {
      <section class="card">Loading practice sentences…</section>
    } @else if (error()) {
      <section class="card error" role="alert">{{ error() }}</section>
    } @else if (current()) {
      <section class="card question">
        <div class="meta"><span>{{ current()!.topic }}</span><span>{{ current()!.level }}</span></div>
        <p class="prompt" lang="ta">{{ current()!.tamil }}</p>
        <label for="answer">Your English translation</label>
        <textarea id="answer" [(ngModel)]="answer" rows="3" placeholder="Type your English sentence here…" [disabled]="checked()"></textarea>
        <div class="actions">
          <button class="primary" type="button" (click)="checkAnswer()" [disabled]="!answer.trim() || checked()">Check answer</button>
          <button class="secondary" type="button" (click)="showHint()" [disabled]="checked()">Show answer</button>
        </div>
      </section>
      @if (checked()) {
        <section class="card feedback" [class.good]="wasCorrect()">
          <h2>{{ evaluation()?.status === 'correct' ? 'Excellent! That is correct.' : evaluation()?.status === 'close' ? 'Very close! Check these small changes.' : 'Let us learn from this' }}</h2>
          <p class="small">Your answer</p><p>{{ submittedAnswer() }}</p>
          <p class="small">Natural English</p><p class="correct-answer">{{ current()!.answer }}</p>
          @if (evaluation()?.status !== 'correct') {
            <div class="changes">
              @if (evaluation()?.missing?.length) { <p><strong>Words to add/check:</strong> {{ evaluation()!.missing.join(', ') }}</p> }
              @if (evaluation()?.extra?.length) { <p><strong>Extra words to review:</strong> {{ evaluation()!.extra.join(', ') }}</p> }
            </div>
          }
          <p lang="ta">{{ current()!.explanationTamil }}</p>
          <div class="grammar"><strong>Grammar tip:</strong> {{ current()!.grammarNote }}</div>
          @if (evaluation()?.status !== 'correct') { <p class="small">This offline checker compares your words with the model answer and listed alternatives. Another natural translation may also be valid; Lela cannot reliably judge every paraphrase without an AI language model.</p> }
          <button class="primary" type="button" (click)="next()">Next sentence</button>
        </section>
      }
    } @else {
      <section class="card">No more sentences at this level. Change the level or restart this practice set.</section>
    }
  `,
  styles: `
    :host{display:block;max-width:850px;margin:auto}.intro{margin-bottom:18px}.eyebrow{color:var(--primary);font-size:.75rem;font-weight:800;letter-spacing:.12em}.intro h1{margin:.2rem 0}.intro>p:last-child{color:var(--muted);line-height:1.6}.card{background:var(--surface,#fff);border:1px solid var(--border);border-radius:18px;padding:18px;margin:14px 0;box-shadow:var(--shadow,0 3px 14px rgba(40,20,70,.05))}.controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.controls label{font-weight:700}.controls select{padding:10px;border:1px solid var(--border);border-radius:10px;background:#fff;color:var(--text)}.counter{margin-left:auto;color:var(--muted);font-size:.85rem}.meta{display:flex;justify-content:space-between;color:var(--muted);font-size:.8rem;text-transform:capitalize}.prompt{font-size:1.45rem;line-height:1.8;font-weight:700;margin:22px 0}.question label{display:block;font-weight:700;margin-bottom:8px}.question textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--border);border-radius:12px;font:inherit;resize:vertical;background:var(--surface,#fff);color:var(--text)}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}button{border:0;border-radius:11px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}.primary{background:var(--primary);color:white}.secondary{background:var(--primary-tint);color:var(--primary-dark)}.feedback h2{margin-top:0}.feedback.good{border-color:#75b98b}.correct-answer{font-size:1.15rem;font-weight:800;color:var(--primary-dark)}.small{font-size:.85rem;color:var(--muted);margin-bottom:4px}.changes{background:#fff7e8;border:1px solid #f1d7a8;border-radius:10px;padding:10px 12px;margin:12px 0}.changes p{margin:4px 0}.grammar{background:var(--primary-tint);border-radius:10px;padding:12px;line-height:1.6;margin:14px 0}.error{color:#a11}.feedback p[lang=ta]{line-height:1.8}.intro p{max-width:700px}
  `,
})
export class PracticeCentreComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly progress = inject(ProgressService);
  readonly all = signal<PracticeItem[]>([]);
  readonly current = signal<PracticeItem | null>(null);
  readonly level = signal<PracticeItem['level']>('beginner');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly checked = signal(false);
  readonly wasCorrect = signal(false);
  readonly evaluation = signal<TranslationEvaluation | null>(null);
  readonly submittedAnswer = signal('');
  readonly attempted = signal(0);
  readonly correct = signal(0);
  answer = '';
  private used = new Set<string>();

  async ngOnInit(): Promise<void> {
    try {
      this.all.set(await firstValueFrom(this.http.get<PracticeItem[]>('data/practice/tamil-to-english.json')));
      this.pickNext();
    } catch {
      this.error.set('Practice data could not be loaded. Please check that public/data/practice/tamil-to-english.json exists.');
    } finally { this.loading.set(false); }
  }

  changeLevel(value: PracticeItem['level']): void {
    this.level.set(value); this.used.clear(); this.answer = ''; this.checked.set(false); this.evaluation.set(null); this.pickNext();
  }

  checkAnswer(): void {
    const item = this.current();
    const typed = this.answer.trim();
    if (!item || !typed || this.checked()) return;
    const result = evaluateTranslation(item.answer, typed, item.accepted ?? []);
    const isCorrect = result.status === 'correct';
    this.evaluation.set(result);
    this.submittedAnswer.set(typed); this.wasCorrect.set(isCorrect); this.checked.set(true);
    this.attempted.update(n => n + 1);
    if (isCorrect) this.correct.update(n => n + 1);
    this.progress.recordQuiz('quick', isCorrect ? 1 : 0, 1);
    this.progress.patchToday({ practiceDone: true }, { correct: isCorrect ? 1 : 0, total: 1 });
  }

  showHint(): void {
    const item = this.current(); if (!item || this.checked()) return;
    this.submittedAnswer.set('Answer revealed');
    this.evaluation.set(null);
    this.wasCorrect.set(false);
    this.checked.set(true);
    this.attempted.update(n => n + 1);
    this.progress.recordQuiz('quick', 0, 1);
    this.progress.patchToday({ practiceDone: true }, { total: 1 });
  }

  next(): void { this.answer = ''; this.checked.set(false); this.evaluation.set(null); this.pickNext(); }

  private pickNext(): void {
    const pool = this.all().filter(item => item.level === this.level() && !this.used.has(item.id));
    if (!pool.length) { this.current.set(null); return; }
    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.used.add(selected.id); this.current.set(selected);
  }
}
