import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { ProgressService } from '../../core/progress.service';
import { ContentCategory, Sentence, SentenceType, Tense } from '../../models/learning.models';
import { explainSentence } from '../../core/lela-explain';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { StudyToolsComponent } from '../../shared/study-tools.component';

const PAGE_SIZE = 15;
type Source = 'all' | 'favourites' | string;

@Component({
  selector: 'app-sentences',
  standalone: true,
  imports: [RouterLink, SpeakButtonComponent, StudyToolsComponent],
  template: `
    <h1>Sentence library</h1>
    <p class="small">{{ totalCount() }} practical sentences with Tamil meaning and a simple alternative.</p>

    <div class="chips" role="tablist" aria-label="Sentence groups">
      <button type="button" class="chip" [class.on]="source() === 'all'" (click)="setSource('all')">All</button>
      <button type="button" class="chip" [class.on]="source() === 'favourites'" (click)="setSource('favourites')">♥ Favourites ({{ progress.state().favSentences.length }})</button>
      @for (c of categories(); track c.id) {
        <button type="button" class="chip" [class.on]="source() === c.id" (click)="setSource(c.id)">{{ c.label }}</button>
      }
    </div>

    <div class="row filters">
      <input type="search" class="grow" placeholder="Search sentences…" aria-label="Search sentences" [value]="query()" (input)="onQuery($event)" maxlength="60" />
    </div>
    <div class="row filters">
      <select aria-label="Tense" class="grow" (change)="onTense($event)">
        <option value="">Any tense</option>
        <option value="present">Present</option>
        <option value="present-continuous">Present continuous</option>
        <option value="past">Past</option>
        <option value="future">Future</option>
        <option value="present-perfect">Present perfect</option>
        <option value="modal">Modal (can, could, should…)</option>
        <option value="imperative">Imperative</option>
      </select>
      <select aria-label="Sentence type" class="grow" (change)="onType($event)">
        <option value="">Any type</option>
        <option value="statement">Statements</option>
        <option value="question">Questions</option>
        <option value="negative">Negatives</option>
        <option value="request">Requests</option>
      </select>
      <select aria-label="Learning status" class="grow" (change)="onStatus($event)" data-testid="status-filter">
        <option value="">All sentences</option>
        <option value="learned">Learned</option>
        <option value="notyet">Not yet learned</option>
      </select>
      <label class="check"><input type="checkbox" [checked]="onlyAlt()" (change)="onlyAlt.set(!onlyAlt()); pageIndex.set(0)" /> With alternative</label>
    </div>

    @if (loading()) {
      <p class="card">Loading sentences…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="reload()">Try again</button></p>
    } @else {
      <p class="small">{{ filtered().length }} found</p>
      @for (s of page(); track s.id) {
        <article class="card">
          <p class="en">“{{ s.en }}” <app-speak-button [text]="s.en" /></p>
          @if (progress.settings().showTamil) { <p class="tamil" lang="ta">{{ s.tamil }}</p> }
          @if (s.explain) { <p class="explain" data-testid="explain-line">{{ s.explain }}</p> }
          @if (s.words?.length) { <p class="small" data-testid="useful-words">Useful words: <b>{{ s.words!.join(', ') }}</b></p> }
          @if (s.usage) { <p class="small" data-testid="usage-line"><b>Real-life use:</b> {{ s.usage }}</p> }
          @if (s.leelaQ && s.answer) {
            <details class="alt" data-testid="leela-q">
              <summary><b>Leela asks:</b> {{ s.leelaQ }} <app-speak-button [text]="s.leelaQ" /></summary>
              <p class="small">Say or type your own answer first. Then compare it with a suggested answer:</p>
              <p data-testid="suggested-answer">“{{ s.answer }}” <app-speak-button [text]="s.answer" /></p>
              <app-study-tools [target]="s.answer" [explanation]="'Suggested answer to: ' + s.leelaQ" />
            </details>
          }
          <p class="small"><span class="badge">{{ s.tense }}</span> <span class="badge">{{ s.type }}</span> · {{ s.context }}</p>
          @if (s.alt; as alt) {
            <div class="alt">
              <p class="label">Simple, natural alternative:</p>
              <p>“{{ alt.en }}” <app-speak-button [text]="alt.en" /></p>
              @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ alt.tamil }}</p> }
            </div>
          }
          <div class="row">
            <button type="button" class="btn small" (click)="progress.toggleFavSentence(s.id)" [attr.aria-pressed]="progress.favSentenceSet().has(s.id)">
              {{ progress.favSentenceSet().has(s.id) ? '♥ Saved' : '♡ Save' }}
            </button>
            <button type="button" class="btn small" [class.on]="progress.learnedSentenceSet().has(s.id)" (click)="progress.toggleSentenceLearned(s.id)" [attr.aria-pressed]="progress.learnedSentenceSet().has(s.id)" data-testid="learned-btn">
              {{ progress.learnedSentenceSet().has(s.id) ? '✓ Learned' : 'Mark as learned' }}
            </button>
            <a class="btn small" [routerLink]="['/speaking']" [queryParams]="{ sentence: s.id }">Open in Speaking practice</a>
          </div>
          <app-study-tools [target]="s.en" [explanation]="explain(s)" [tamil]="s.tamil" />
        </article>
      } @empty {
        <p class="card">No sentences match your choices.</p>
      }
      @if (pageCount() > 1) {
        <div class="row pager">
          <button type="button" class="btn" [disabled]="pageIndex() === 0" (click)="setPage(pageIndex() - 1)">← Previous</button>
          <span class="grow center">Page {{ pageIndex() + 1 }} of {{ pageCount() }}</span>
          <button type="button" class="btn" [disabled]="pageIndex() + 1 >= pageCount()" (click)="setPage(pageIndex() + 1)">Next →</button>
        </div>
      }
    }
  `,
  styles: `
    .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px; }
    .chip { white-space: nowrap; padding: 8px 12px; border: 1px solid var(--border); border-radius: 18px; background: #fff; min-height: 40px; }
    .chip.on { background: var(--primary); color: #fff; border-color: var(--primary); }
    .filters { margin-bottom: 8px; flex-wrap: wrap; } .filters select { min-height: 44px; } .check { display: flex; align-items: center; gap: 6px; min-height: 44px; }
    .en { font-size: 1.15rem; margin: 0 0 4px; } .tamil { font-size: 1.1rem; margin: 4px 0; }
    .alt { background: var(--primary-tint); border-radius: 10px; padding: 8px 12px; margin: 8px 0; } .alt p { margin: 2px 0; }
    .explain { margin: 4px 0; color: var(--muted); } .btn.on { background: var(--primary-soft); border-color: var(--primary); }
    .pager { margin: 12px 0; } .center { text-align: center; }
  `,
})
export class SentencesComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = signal<ContentCategory[]>([]);
  readonly source = signal<Source>('daily-conversation');
  readonly query = signal('');
  readonly tense = signal<Tense | ''>('');
  readonly type = signal<SentenceType | ''>('');
  readonly onlyAlt = signal(false);
  readonly status = signal<'' | 'learned' | 'notyet'>('');
  readonly pageIndex = signal(0);
  readonly sentences = signal<Sentence[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly totalCount = computed(() => this.categories().reduce((n, c) => n + c.count, 0));
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const tense = this.tense();
    const type = this.type();
    const favOnly = this.source() === 'favourites';
    const favs = this.progress.favSentenceSet();
    const alt = this.onlyAlt();
    const status = this.status();
    const learned = this.progress.learnedSentenceSet();
    return this.sentences().filter(
      (s) =>
        (!status || (status === 'learned') === learned.has(s.id)) &&
        (!tense || s.tense === tense) &&
        (!type || s.type === type) &&
        (!favOnly || favs.has(s.id)) &&
        (!alt || !!s.alt) &&
        (!q || s.en.toLowerCase().includes(q) || s.tamil.includes(q) || s.context.toLowerCase().includes(q) || (s.explain ?? '').toLowerCase().includes(q) || (s.usage ?? '').toLowerCase().includes(q) || (s.leelaQ ?? '').toLowerCase().includes(q) || (s.words ?? []).some((w) => w.includes(q))),
    );
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly page = computed(() => {
    const start = Math.min(this.pageIndex(), this.pageCount() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    // "Sentences with this word" on the Vocabulary screen opens here with the word already searched, across all groups.
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) { this.query.set(q.slice(0, 60)); this.source.set('all'); }
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      this.categories.set((await this.data.manifest()).sentenceCategories);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the sentences.');
      this.loading.set(false);
      return;
    }
    await this.reload();
  }

  setSource(source: Source): void {
    this.source.set(source);
    this.pageIndex.set(0);
    void this.reload();
  }
  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }
  onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | 'learned' | 'notyet');
    this.pageIndex.set(0);
  }

  explain(s: Sentence): string {
    return explainSentence(s);
  }

  onTense(event: Event): void {
    this.tense.set((event.target as HTMLSelectElement).value as Tense | '');
    this.pageIndex.set(0);
  }
  onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as SentenceType | '');
    this.pageIndex.set(0);
  }
  setPage(index: number): void {
    this.pageIndex.set(index);
    globalThis.scrollTo?.({ top: 0 });
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const source = this.source();
      if (source === 'all' || source === 'favourites') {
        const lists = await Promise.all(this.categories().map((c) => this.data.sentences(c.id)));
        this.sentences.set(lists.flat());
      } else {
        this.sentences.set(await this.data.sentences(source));
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the sentences.');
    } finally {
      this.loading.set(false);
    }
  }
}
