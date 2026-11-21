import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface PrepositionPractice {
  id: string; word: string; tamil: string; example: string;
  exampleTamil: string; group: string; level: string;
}

@Component({
  selector: 'app-prepositions', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './prepositions.component.html',
  styles: [`
    :host{display:block;color:var(--text)}.wrap{max-width:900px;margin:0 auto}.hero{padding:10px 2px 18px}.eyebrow{font-size:.75rem;letter-spacing:.12em;font-weight:800;color:var(--primary)}h1{font-size:clamp(1.7rem,5vw,2.25rem);margin:6px 0}.hero p,.muted{color:var(--muted);line-height:1.55}.stats{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.stats span{background:var(--primary-soft);color:var(--primary-dark);border-radius:12px;padding:8px 11px;font-size:.86rem}.tabs{display:flex;gap:8px;margin:8px 0 14px}.tabs button{border:1px solid var(--border);background:#fff;color:var(--text);padding:10px 16px;border-radius:12px;font:inherit;font-weight:700}.tabs button.active{background:var(--primary);border-color:var(--primary);color:#fff}.filters{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:14px}.filters label{display:block;font-weight:700;margin-bottom:8px}.filters input{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:12px;padding:12px;font:inherit}.suggestions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.suggestions button{border:1px solid var(--border);background:var(--primary-soft);color:var(--primary-dark);padding:6px 9px;border-radius:20px;font-size:.82rem}.practice-card{background:#fff;border:1px solid var(--border);border-radius:20px;padding:clamp(16px,4vw,24px);box-shadow:0 8px 24px rgba(60,35,100,.07)}.topline{display:flex;justify-content:space-between;align-items:center}.level{background:var(--primary-soft);color:var(--primary-dark);border-radius:20px;padding:5px 10px;font-size:.76rem;text-transform:capitalize;font-weight:700}.counter{color:var(--muted);font-weight:700;font-size:.88rem}.instruction{color:var(--muted);margin:24px 0 8px}.practice-card h2{font-size:clamp(1.25rem,4vw,1.65rem);line-height:1.5;margin:8px 0 22px}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.choices button{border:1px solid var(--border);background:#fff;color:var(--text);padding:13px;border-radius:12px;font:inherit;font-weight:750}.choices button:disabled{opacity:1}.choices button.correct{background:#e4f7eb;border-color:#269653;color:#176b38}.choices button.wrong{background:#fff0f0;border-color:#d65a62;color:#a32c37}.feedback{margin-top:16px;padding:14px;border-radius:13px;line-height:1.45}.feedback p{margin:7px 0 0}.feedback.good{background:#eaf8ef;color:#176b38}.feedback.bad{background:#fff3e9;color:#8a4b13}.feedback .muted{color:inherit;opacity:.8}.actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.actions button{border:0;border-radius:12px;padding:11px 14px;font:inherit;font-weight:700}.secondary{background:var(--primary-soft);color:var(--primary-dark)}.next{background:var(--primary);color:#fff;margin-left:auto}.next:disabled{opacity:.45}.hint{background:var(--primary-soft);padding:10px 12px;border-radius:10px}.progress-track{height:7px;background:var(--primary-soft);border-radius:9px;margin:16px 2px 5px;overflow:hidden}.progress-fill{height:100%;background:var(--primary);border-radius:9px;transition:width .2s}.progress-label{font-size:.82rem;color:var(--muted);margin:0 2px}.word-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px}.word-grid button{text-align:left;border:1px solid var(--border);border-radius:13px;padding:12px;background:#fff;color:var(--text);min-width:0}.word-grid b,.word-grid small,.word-grid span{display:block}.word-grid small{color:var(--muted);margin-top:5px;font-size:.95rem}.word-grid span{color:var(--muted);font-size:.72rem;margin-top:7px;text-transform:capitalize}.error{padding:12px;background:#fff0f0;color:#a32c37;border-radius:12px}@media(max-width:480px){.word-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.choices{grid-template-columns:repeat(2,minmax(0,1fr))}.tabs button{flex:1}}
  `]
})
export class PrepositionsComponent {
  private readonly http = inject(HttpClient);
  readonly all = signal<PrepositionPractice[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly section = signal<'practice' | 'words'>('practice');
  readonly search = signal('');
  readonly index = signal(0);
  readonly selected = signal('');
  readonly answered = signal(false);
  readonly showHint = signal(false);
  readonly score = signal(0);
  readonly answeredCount = signal(0);

  readonly allWords = computed(() => {
    const map = new Map<string, PrepositionPractice>();
    for (const item of this.all()) if (!map.has(item.word.toLowerCase())) map.set(item.word.toLowerCase(), item);
    return [...map.values()];
  });
  readonly items = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    const matches = this.all().filter(x => !q || x.word.toLocaleLowerCase().includes(q) || x.tamil.includes(q) || x.example.toLocaleLowerCase().includes(q));
    return matches;
  });
  readonly filteredWords = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    return this.allWords().filter(x => !q || x.word.toLocaleLowerCase().includes(q) || x.tamil.includes(q));
  });
  readonly suggestions = computed(() => this.filteredWords().slice(0, 8));
  readonly current = computed(() => this.items()[this.index()] ?? this.all()[0] ?? this.emptyItem);
  readonly choices = computed(() => {
    const correct = this.current().word;
    const words = this.allWords().map(x => x.word).filter(w => w !== correct);
    const start = (this.index() * 3) % Math.max(1, words.length);
    const distractors = [words[start], words[(start + 7) % words.length], words[(start + 13) % words.length]].filter(Boolean);
    return [...new Set([correct, ...distractors])].sort((a, b) => a.localeCompare(b));
  });
  readonly questionText = computed(() => {
    const sentence = this.current().example;
    const word = this.current().word;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return sentence.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '________');
  });
  readonly progress = computed(() => this.items().length ? Math.min(100, this.answeredCount() / this.items().length * 100) : 0);
  private readonly emptyItem: PrepositionPractice = { id: '', word: '', tamil: '', example: '', exampleTamil: '', group: '', level: 'beginner' };

  constructor() { void this.load(); }
  async load(): Promise<void> {
    try { this.all.set(await firstValueFrom(this.http.get<PrepositionPractice[]>('data/prepositions-500.json'))); }
    catch { this.error.set('Could not load preposition practice. Please check that the app data file is included in the build.'); }
    finally { this.loading.set(false); }
  }
  resetQuestion(): void { this.index.set(0); this.selected.set(''); this.answered.set(false); this.showHint.set(false); this.answeredCount.set(0); }
  chooseWord(word: string): void { this.search.set(word); this.resetQuestion(); this.section.set('practice'); }
  answer(word: string): void {
    if (this.answered()) return;
    this.selected.set(word); this.answered.set(true); this.answeredCount.update(n => n + 1);
    if (word === this.current().word) this.score.update(n => n + 1);
  }
  next(): void {
    if (!this.answered()) return;
    this.index.set((this.index() + 1) % this.items().length);
    this.selected.set(''); this.answered.set(false); this.showHint.set(false);
  }
}
