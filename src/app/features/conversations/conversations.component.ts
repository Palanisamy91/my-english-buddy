import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LelaDataService } from '../../lela/lela-data.service';
import type { Conversation, ConversationCategory } from '../../lela/lela.models';
import { ProgressService } from '../../core/progress.service';
import { SpeakButtonComponent } from '../../shared/speak-button.component';

const PAGE_SIZE = 12;

/**
 * Browse and practise the 2,000 conversations stored in db.json ("conversations").
 * Works offline: db.json is cached by the service worker. The reply is hidden until you tap
 * "Show reply", so you can first try to answer yourself.
 */
@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [SpeakButtonComponent],
  template: `
    <h1>Conversation practice</h1>
    <p class="small">{{ total() }} everyday exchanges. Read or listen to the first line, try to answer, then check the natural reply.</p>

    <div class="chips" role="tablist" aria-label="Conversation groups">
      <button type="button" class="chip" [class.on]="category() === ''" (click)="setCategory('')">All</button>
      @for (c of categories(); track c.id) {
        <button type="button" class="chip" [class.on]="category() === c.id" (click)="setCategory(c.id)">{{ c.label }}</button>
      }
    </div>

    <div class="row filters">
      <input type="search" class="grow" placeholder="Search conversations…" aria-label="Search conversations" [value]="query()" (input)="onQuery($event)" maxlength="60" />
      <select aria-label="Level" (change)="onLevel($event)">
        <option value="">Any level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <button type="button" class="btn" (click)="shuffle()">🔀 Random</button>
    </div>

    @if (loading()) {
      <p class="card">Loading conversations…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="load()">Try again</button></p>
    } @else {
      <p class="small">{{ filtered().length }} found</p>
      @for (c of page(); track c.id) {
        <article class="card">
          <p class="small"><span class="badge">{{ c.level }}</span> {{ c.context }}</p>
          <p class="en">“{{ c.en }}” <app-speak-button [text]="c.en" /></p>
          @if (progress.settings().showTamil) { <p class="tamil" lang="ta">{{ c.tamil }}</p> }
          @if (shown().has(c.id)) {
            <div class="reply">
              <p class="label">Natural reply:</p>
              <p>“{{ c.reply }}” <app-speak-button [text]="c.reply" /></p>
              @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ c.replyTamil }}</p> }
            </div>
          }
          <div class="row">
            <button type="button" class="btn small" [attr.aria-expanded]="shown().has(c.id)" (click)="toggle(c.id)">
              {{ shown().has(c.id) ? 'Hide reply' : 'Show reply' }}
            </button>
          </div>
        </article>
      } @empty {
        <p class="card">No conversations match your choices.</p>
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
    .filters { margin-bottom: 8px; flex-wrap: wrap; } .filters select { min-height: 44px; }
    .en { font-size: 1.15rem; margin: 0 0 4px; } .tamil { font-size: 1.1rem; margin: 4px 0; }
    .reply { background: var(--primary-tint); border-radius: 10px; padding: 8px 12px; margin: 8px 0; } .reply p { margin: 2px 0; }
    .pager { margin: 12px 0; } .center { text-align: center; }
  `,
})
export class ConversationsComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly lela = inject(LelaDataService);

  readonly categories = signal<ConversationCategory[]>([]);
  readonly all = signal<Conversation[]>([]);
  readonly category = signal('');
  readonly level = signal('');
  readonly query = signal('');
  readonly pageIndex = signal(0);
  readonly shown = signal<ReadonlySet<string>>(new Set());
  readonly loading = signal(true);
  readonly error = signal('');

  readonly total = computed(() => this.all().length);
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    const level = this.level();
    return this.all().filter(
      (c) =>
        (!cat || c.category === cat) &&
        (!level || c.level === level) &&
        (!q || c.en.toLowerCase().includes(q) || c.reply.toLowerCase().includes(q) || c.context.toLowerCase().includes(q) || c.tamil.includes(q) || c.replyTamil.includes(q)),
    );
  });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly page = computed(() => {
    const start = Math.min(this.pageIndex(), this.pageCount() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const db = await this.lela.db();
      if (!db.conversations || db.conversations.length === 0) {
        this.error.set('This db.json has no conversations yet. Run "npm run db" to update it.');
      } else {
        this.all.set(db.conversations);
        this.categories.set(db.conversationCategories ?? []);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the conversations.');
    }
    this.loading.set(false);
  }

  setCategory(id: string): void { this.category.set(id); this.pageIndex.set(0); }
  onQuery(e: Event): void { this.query.set((e.target as HTMLInputElement).value); this.pageIndex.set(0); }
  onLevel(e: Event): void { this.level.set((e.target as HTMLSelectElement).value); this.pageIndex.set(0); }
  setPage(n: number): void { this.pageIndex.set(Math.max(0, Math.min(n, this.pageCount() - 1))); }

  toggle(id: string): void {
    const next = new Set(this.shown());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.shown.set(next);
  }

  /** Jump to a random page so you do not always practise the same first lines. */
  shuffle(): void {
    this.setPage(Math.floor(Math.random() * this.pageCount()));
  }
}
