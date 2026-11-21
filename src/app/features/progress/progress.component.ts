import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { addDays, shortDayLabel } from '../../core/dates';
import { isLessonComplete } from '../../core/progress-state';
import { ProgressService } from '../../core/progress.service';
import { Word } from '../../models/learning.models';

interface DayBar {
  date: string;
  label: string;
  complete: boolean;
  percent: number | null;
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>My progress</h1>
    @let s = progress.stats();
    <div class="grid">
      <section class="card stat"><strong>{{ s.streak }}</strong><span>day streak</span></section>
      <section class="card stat"><strong>{{ s.lessonsCompleted }}</strong><span>lessons done</span></section>
      <section class="card stat"><strong>{{ s.wordsIntroduced }}</strong><span>words met</span></section>
      <section class="card stat"><strong>{{ s.wordsKnown }}</strong><span>words known</span></section>
      <section class="card stat"><strong>{{ s.sentencesLearned }}</strong><span>sentences learned</span></section>
      <section class="card stat"><strong>{{ s.averageScore === null ? '–' : s.averageScore + '%' }}</strong><span>quiz average ({{ s.quizzesTaken }})</span></section>
    </div>

    <section class="card">
      <h2>Last 14 days</h2>
      <div class="bars" role="img" aria-label="Lessons completed in the last 14 days">
        @for (d of bars(); track d.date) {
          <div class="bar-col">
            <div class="bar" [class.complete]="d.complete" [style.height.%]="d.percent === null ? 6 : d.percent"></div>
            <span class="lbl">{{ d.label }}</span>
          </div>
        }
      </div>
      <p class="small">Tall bar = quiz score that day. Green = full lesson finished.</p>
    </section>

    <section class="card">
      <h2>Words to revise ({{ weak().length }})</h2>
      @if (loadError()) {
        <p class="notice warn">{{ loadError() }}</p>
      } @else if (weak().length === 0) {
        <p class="small">No difficult words right now. Wrong answers in quizzes will appear here.</p>
      } @else {
        @for (w of weak(); track w.id) { <p class="line"><strong>{{ w.word }}</strong> <span lang="ta">{{ w.tamil }}</span></p> }
        <a class="btn primary" routerLink="/revision">Revise now</a>
      }
    </section>

    <section class="card">
      <h2>Backup</h2>
      <p class="small">Progress is saved only in this browser. Download a backup before clearing browser data or changing phone.</p>
      <div class="row">
        <button type="button" class="btn" (click)="download()">⬇️ Download backup</button>
        <label class="btn">⬆️ Restore backup<input type="file" accept="application/json,.json" hidden (change)="restore($event)" /></label>
      </div>
      @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; } .grid .card { margin: 0; }
    .stat { text-align: center; } .stat strong { display: block; font-size: 1.8rem; color: var(--primary); } .stat span { font-size: .85rem; color: #495057; }
    .bars { display: flex; align-items: flex-end; gap: 4px; height: 110px; margin-top: 10px; padding-right: 26px; margin-bottom: 18px; } .bar-col { min-width: 0; } .bar-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; }
    .bar { width: 100%; background: #adb5bd; border-radius: 4px 4px 0 0; min-height: 4px; } .bar.complete { background: #2f9e44; } .lbl { font-size: .6rem; margin-top: 4px; white-space: nowrap; transform: rotate(-35deg); }
    .line { margin: 4px 0; } h2 { margin-top: 0; }
  `,
})
export class ProgressComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly data = inject(DataService);

  readonly weak = signal<Word[]>([]);
  readonly loadError = signal('');
  readonly message = signal('');

  readonly bars = computed<DayBar[]>(() => {
    const state = this.progress.state();
    const today = this.progress.today();
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today, i - 13);
      const day = state.days[date];
      const quizzes = state.quizzes.filter((q) => q.date === date);
      const total = quizzes.reduce((n, q) => n + q.total, 0);
      const correct = quizzes.reduce((n, q) => n + q.correct, 0);
      return { date, label: shortDayLabel(date), complete: isLessonComplete(day), percent: total === 0 ? null : Math.round((correct / total) * 100) };
    });
  });

  ngOnInit(): void {
    void this.loadWeak();
  }

  private async loadWeak(): Promise<void> {
    try {
      this.weak.set(await this.data.wordsByIds(this.progress.weakWordIds().slice(0, 15)));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Could not load the word list.');
    }
  }

  download(): void {
    try {
      const blob = new Blob([this.progress.exportJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-english-buddy-backup-${this.progress.today()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.message.set('Backup downloaded.');
    } catch {
      this.message.set('Could not create the backup file in this browser.');
    }
  }

  async restore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 2_000_000) {
      this.message.set('This file is too large to be a backup.');
      return;
    }
    try {
      this.progress.importJson(await file.text());
      this.message.set('Backup restored.');
      void this.loadWeak();
    } catch (err) {
      this.message.set(err instanceof Error ? err.message : 'Could not restore this file.');
    }
  }
}
