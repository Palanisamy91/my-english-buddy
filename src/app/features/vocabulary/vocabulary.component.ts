import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { ProgressService } from '../../core/progress.service';
import { ContentCategory, Level, Word } from '../../models/learning.models';
import { prefixOf } from '../../core/plan';
import { explainWord } from '../../core/lela-explain';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { StudyToolsComponent } from '../../shared/study-tools.component';

const PAGE_SIZE = 20;
type Source = 'all' | 'favourites' | 'conversations' | string;

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [RouterLink, SpeakButtonComponent, StudyToolsComponent],
  template: `
    <h1>Vocabulary</h1>
    <p class="small">{{ totalCount() }} words in {{ categories().length }} groups. Each group loads when you open it. You have marked <b data-testid="learned-count">{{ progress.state().learnedWords.length }}</b> as learned. Everything works offline once the app has loaded.</p>

    <details class="card progress" data-testid="progress-panel">
      <summary><b>My learning progress</b>: {{ progress.state().learnedWords.length }} of {{ totalCount() }} words learned · {{ newLearned() }} of {{ newTotal() }} extra words learned</summary>
      <ul class="plist">
        @for (r of progressRows(); track r.id) {
          <li><span>{{ r.label }}</span> <progress [value]="r.learned" [max]="r.count" [attr.aria-label]="r.label + ' progress'"></progress> <span class="small">{{ r.learned }}/{{ r.count }}</span></li>
        }
      </ul>
    </details>

    <div class="chips" role="tablist" aria-label="Word groups">
      <button type="button" class="chip" [class.on]="source() === 'all'" (click)="setSource('all')">All</button>
      <button type="button" class="chip" [class.on]="source() === 'favourites'" (click)="setSource('favourites')">♥ Favourites ({{ progress.state().favWords.length }})</button>
      <button type="button" class="chip" [class.on]="source() === 'conversations'" (click)="setSource('conversations')" data-testid="chat-chip">💬 From my conversations ({{ chatCount() }})</button>
      @for (c of categories(); track c.id) {
        <button type="button" class="chip" [class.on]="source() === c.id" (click)="setSource(c.id)">{{ c.label }}</button>
      }
    </div>

    <div class="row filters">
      <input type="search" class="grow" placeholder="Search word, Tamil or example…" aria-label="Search words"
             [value]="query()" (input)="onQuery($event)" maxlength="60" />
      <select aria-label="Learning status" (change)="onStatus($event)" data-testid="status-filter">
        <option value="">All words</option>
        <option value="learned">Learned</option>
        <option value="notyet">Not yet learned</option>
      </select>
      <select aria-label="Level" (change)="onLevel($event)">
        <option value="">All levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
    </div>

    @if (loading()) {
      <p class="card">Loading words…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="reload()">Try again</button></p>
    } @else {
      @if (source() === 'conversations') {
        <p class="small" data-testid="chat-note">Words that came up in your conversations with Lela (saved on this device). “Taught” means Lela taught you the word; “mentioned” means it appeared in a message. Nothing here changes your favourites or learned marks.</p>
      }
      <p class="small">{{ filtered().length }} {{ filtered().length === 1 ? 'word' : 'words' }} found</p>
      @for (w of page(); track w.id) {
        <article class="card word">
          <div class="head">
            <div>
              <h2>{{ w.word }} <span class="pos">{{ w.pos }}</span></h2>
              <p class="pron">{{ w.pron }} <app-speak-button [text]="w.word" /></p>
            </div>
            <div class="col">
              <span class="badge lvl-{{ w.level }}">{{ w.level }}</span>
              @if (chatEntry(w.id); as e) { <span class="badge" data-testid="chat-badge">{{ e.how === 'taught' ? 'taught by Lela' : 'mentioned' }}</span> }
              <button type="button" class="icon" (click)="progress.toggleFavWord(w.id)"
                      [attr.aria-pressed]="progress.favWordSet().has(w.id)" [attr.aria-label]="progress.favWordSet().has(w.id) ? 'Remove from favourites' : 'Add to favourites'">
                {{ progress.favWordSet().has(w.id) ? '♥' : '♡' }}
              </button>
            </div>
          </div>
          @if (w.meaning) { <p class="meaning" data-testid="meaning">{{ w.meaning }}</p> }
          <p class="tamil" lang="ta">{{ w.tamil }}</p>
          <p>“{{ w.example }}” <app-speak-button [text]="w.example" /></p>
          @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ w.exampleTamil }}</p> }
          <p class="small">Similar: {{ w.synonyms.join(', ') }}</p>
          <div class="row acts">
            <button type="button" class="btn small" [class.on]="progress.learnedWordSet().has(w.id)" (click)="progress.toggleWordLearned(w.id)" [attr.aria-pressed]="progress.learnedWordSet().has(w.id)" data-testid="learned-btn">
              {{ progress.learnedWordSet().has(w.id) ? '✓ Learned' : 'Mark as learned' }}
            </button>
            <button type="button" class="btn small" [disabled]="progress.isInRevision(w.id)" (click)="progress.addToRevision([w.id])">
              {{ progress.isInRevision(w.id) ? '✓ In revision list' : '＋ Add to revision' }}
            </button>
            <a class="btn small" [routerLink]="['/sentences']" [queryParams]="{ q: w.word }" data-testid="word-sentences">Sentences with this word</a>
          </div>
          <app-study-tools [target]="w.example" [explanation]="explain(w)" [tamil]="w.tamil + ' · ' + w.exampleTamil" />
        </article>
      } @empty {
        <p class="card">No words match. Try a different search or group.</p>
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
    .filters { margin-bottom: 8px; } .filters select { min-height: 44px; }
    .word h2 { margin: 0; font-size: 1.3rem; } .pos { font-size: .8rem; font-weight: 400; color: #495057; font-style: italic; }
    .head { display: flex; justify-content: space-between; gap: 8px; } .col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .pron { margin: 2px 0 6px; color: #495057; } .tamil { font-size: 1.15rem; margin: 4px 0; }
    .icon { background: none; border: none; font-size: 1.6rem; color: #e03131; min-width: 44px; min-height: 44px; }
    .meaning { margin: 2px 0; color: var(--muted); } .acts { flex-wrap: wrap; margin: 6px 0; } .btn.on { background: var(--primary-soft); border-color: var(--primary); }
    .progress { margin-bottom: 8px; } .plist { list-style: none; padding: 0; margin: 8px 0 0; } .plist li { display: grid; grid-template-columns: 1fr 90px auto; gap: 8px; align-items: center; margin: 4px 0; } .plist progress { width: 100%; }
    .pager { margin: 12px 0; } .center { text-align: center; }
  `,
})
export class VocabularyComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly data = inject(DataService);

  readonly categories = signal<ContentCategory[]>([]);
  readonly source = signal<Source>('daily-life');
  readonly query = signal('');
  readonly level = signal<Level | ''>('');
  readonly status = signal<'' | 'learned' | 'notyet'>('');
  readonly pageIndex = signal(0);
  readonly words = signal<Word[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly chatCount = computed(() => Object.keys(this.progress.state().chatWords).length);
  readonly progressRows = computed(() => {
    const learned = new Map<string, number>();
    for (const id of this.progress.state().learnedWords) learned.set(prefixOf(id), (learned.get(prefixOf(id)) ?? 0) + 1);
    return this.categories().map((c) => ({ id: c.id, label: c.label, count: c.count, learned: learned.get(c.prefix) ?? 0, batch: c.batch ?? 0 }));
  });
  readonly newTotal = computed(() => this.progressRows().filter((r) => r.batch === 2).reduce((n, r) => n + r.count, 0));
  readonly newLearned = computed(() => this.progressRows().filter((r) => r.batch === 2).reduce((n, r) => n + r.learned, 0));

  chatEntry(id: string) {
    return this.progress.state().chatWords[id] ?? null;
  }

  readonly totalCount = computed(() => this.categories().reduce((n, c) => n + c.count, 0));

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const level = this.level();
    const favOnly = this.source() === 'favourites';
    const favs = this.progress.favWordSet();
    const status = this.status();
    const learned = this.progress.learnedWordSet();
    return this.words().filter(
      (w) =>
        (!level || w.level === level) &&
        (!status || (status === 'learned') === learned.has(w.id)) &&
        (!favOnly || favs.has(w.id)) &&
        (!q || w.word.includes(q) || w.tamil.includes(q) || (w.meaning ?? '').toLowerCase().includes(q) || w.example.toLowerCase().includes(q) || w.synonyms.some((s) => s.toLowerCase().includes(q))),
    );
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly page = computed(() => {
    const start = Math.min(this.pageIndex(), this.pageCount() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      this.categories.set((await this.data.manifest()).vocabCategories);
    } catch (err) {
      this.fail(err);
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
    // searching "All" needs every group: load them now (they are cached afterwards)
  }

  onStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as '' | 'learned' | 'notyet');
    this.pageIndex.set(0);
  }

  explain(w: Word): string {
    return explainWord(w);
  }

  onLevel(event: Event): void {
    this.level.set((event.target as HTMLSelectElement).value as Level | '');
    this.pageIndex.set(0);
  }

  setPage(index: number): void {
    this.pageIndex.set(index);
    globalThis.scrollTo?.({ top: 0 });
  }

  /** Loads the words for the current choice: one category, or (for All / Favourites) every category in turn. */
  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const source = this.source();
      if (source === 'all' || source === 'favourites') {
        const lists = await Promise.all(this.categories().map((c) => this.data.vocabulary(c.id)));
        this.words.set(lists.flat());
      } else if (source === 'conversations') {
        const ids = Object.entries(this.progress.state().chatWords).sort((a, b) => b[1].date.localeCompare(a[1].date) || a[0].localeCompare(b[0])).map(([id]) => id);
        this.words.set(await this.data.wordsByIds(ids));
      } else {
        this.words.set(await this.data.vocabulary(source));
      }
    } catch (err) {
      this.fail(err);
    } finally {
      this.loading.set(false);
    }
  }

  private fail(err: unknown): void {
    this.error.set(err instanceof Error ? err.message : 'Could not load the words.');
    this.loading.set(false);
  }
}
