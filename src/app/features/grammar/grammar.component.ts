import { Component, OnInit, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { GrammarLesson } from '../../models/learning.models';
import { SpeakButtonComponent } from '../../shared/speak-button.component';

@Component({
  selector: 'app-grammar',
  standalone: true,
  imports: [SpeakButtonComponent],
  template: `
    <h1>Grammar in simple Tamil</h1>
    <p class="small">Tenses, questions and negatives. Tap a topic to open it.</p>

    @if (loading()) {
      <p class="card">Loading…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="load()">Try again</button></p>
    }
    @for (g of lessons(); track g.id) {
      <section class="card">
        <button type="button" class="head" (click)="toggle(g.id)" [attr.aria-expanded]="openId() === g.id">
          <span><strong>{{ g.title }}</strong> <span class="small" lang="ta">{{ g.titleTamil }}</span></span>
          <span aria-hidden="true">{{ openId() === g.id ? '▲' : '▼' }}</span>
        </button>
        @if (openId() === g.id) {
          <p>{{ g.summary }}</p>
          <p lang="ta" class="tamil">{{ g.summaryTamil }}</p>
          <p class="formula">{{ g.formula }}</p>
          <h3>When to use it</h3>
          <ul>@for (u of g.uses; track u.en) { <li>{{ u.en }} <span class="small block" lang="ta">{{ u.tamil }}</span></li> }</ul>
          <h3>Examples</h3>
          <ul>
            @for (e of g.examples; track e.en) {
              <li>“{{ e.en }}” <app-speak-button [text]="e.en" /> <span class="small block" lang="ta">{{ e.tamil }}</span></li>
            }
          </ul>
          <h3>Common mistakes</h3>
          <ul>
            @for (m of g.mistakes; track m.wrong) {
              <li><span class="wrong">✗ {{ m.wrong }}</span><br /><span class="right">✓ {{ m.right }}</span><span class="small block" lang="ta">{{ m.noteTamil }}</span></li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: `
    .head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; background: none; border: none; text-align: left; font-size: 1.05rem; min-height: 44px; padding: 0; }
    .formula { font-family: ui-monospace, monospace; background: var(--primary-tint); padding: 8px 10px; border-radius: 8px; }
    h3 { margin: 14px 0 4px; font-size: 1rem; color: var(--primary); } ul { padding-left: 18px; } li { margin-bottom: 8px; } .block { display: block; }
    .wrong { color: #b71c1c; } .right { color: #1b7a2b; font-weight: 600; } .tamil { line-height: 1.7; }
  `,
})
export class GrammarComponent implements OnInit {
  private readonly data = inject(DataService);
  readonly lessons = signal<GrammarLesson[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly openId = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.lessons.set(await this.data.grammar());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the grammar lessons.');
    } finally {
      this.loading.set(false);
    }
  }

  toggle(id: string): void {
    this.openId.set(this.openId() === id ? '' : id);
  }
}
