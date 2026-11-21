import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../core/storage.service';

interface PracticeWord {
  id: string; word: string; tamil: string; pos?: string; pron?: string;
  meaning?: string; example?: string; exampleTamil?: string; synonyms?: string[];
  level?: string; savedAt?: string;
}

@Component({
  selector: 'app-practice-words', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <section class="practice-words">
      <header><h1>My Practice Words</h1><p>Words you save from My Dictionary appear here. Your list stays on this device.</p></header>
      <div class="toolbar"><strong>{{ words().length }} saved {{ words().length === 1 ? 'word' : 'words' }}</strong><a routerLink="/dictionary">+ Find new words</a></div>
      @if (!words().length) {
        <article class="empty"><h2>Your practice list is empty</h2><p>Open the dictionary, search for a word and tap “Add to My Practice Words”.</p><a routerLink="/dictionary">Open My Dictionary</a></article>
      }
      @for (item of words(); track item.word.toLowerCase()) {
        <article class="word-card">
          <div class="word-content">
            <h2>{{ item.word }}</h2>
            <p class="tamil">{{ item.tamil || 'தமிழ் அர்த்தம் சேர்க்கப்படவில்லை' }}</p>
            @if (item.meaning) { <p>{{ item.meaning }}</p> }
            @if (item.pos || item.pron) { <p class="muted">{{ item.pos }}@if (item.pos && item.pron) { · }{{ item.pron }}</p> }
            @if (item.example) { <p class="example">{{ item.example }}</p> }
            @if (item.exampleTamil) { <p class="muted">{{ item.exampleTamil }}</p> }
            @if (item.synonyms?.length) { <p class="muted">Similar: {{ item.synonyms?.join(', ') }}</p> }
          </div>
          <button type="button" class="delete" (click)="remove(item.word)" [attr.aria-label]="'Delete ' + item.word">Delete</button>
        </article>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.practice-words{max-width:760px;margin:0 auto;padding-bottom:24px}header{padding:8px 2px 12px}h1{font-size:1.9rem;margin:0 0 6px}header p,.muted{color:var(--muted);line-height:1.5}.toolbar{display:flex;justify-content:space-between;align-items:center;margin:12px 2px}.toolbar a,.empty a{color:var(--primary-dark);font-weight:700;text-decoration:none}.word-card{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;background:#fff;border:1px solid var(--border);border-radius:15px;padding:15px;margin:10px 0}.word-card h2{font-size:1.2rem;margin:0}.word-card p{margin:6px 0}.tamil{font-size:1.05rem;font-weight:700;color:var(--primary-dark)}.example{margin-top:12px!important}.delete{border:0;border-radius:9px;padding:10px 13px;background:#fff0f0;color:#a32c37;font-weight:700;cursor:pointer;flex:none}.empty{background:#fff;border:1px solid var(--border);border-radius:15px;padding:24px;text-align:center}.empty h2{margin-top:0}.empty p{color:var(--muted)}@media(max-width:480px){.word-card{padding:12px;gap:8px}}
  `]
})
export class PracticeWordsComponent {
  private readonly storage = inject(StorageService);
  private readonly storageKey = 'lela.my-dictionary.practice.v1';
  readonly words = signal<PracticeWord[]>(this.read());
  remove(word: string): void {
    const key = this.normalize(word);
    const next = this.words().filter(item => this.normalize(item.word) !== key);
    this.storage.write(this.storageKey, JSON.stringify(next));
    this.words.set(next);
  }
  private normalize(value: string): string { return value.trim().toLocaleLowerCase().replace(/\s+/g, ' '); }
  private read(): PracticeWord[] {
    try {
      const parsed = JSON.parse(this.storage.read(this.storageKey) || '[]') as PracticeWord[];
      const unique = new Map<string, PracticeWord>();
      for (const item of parsed) { const key = this.normalize(item.word || ''); if (key && !unique.has(key)) unique.set(key, item); }
      return [...unique.values()];
    } catch { return []; }
  }
}
