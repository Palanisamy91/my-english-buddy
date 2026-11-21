import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { StorageService } from '../../core/storage.service';
import { Word } from '../../models/learning.models';
import { SpeechService } from '../../services/speech.service';
import { Subscription } from 'rxjs';

interface SavedWord {
  id: string; word: string; tamil: string; pos: string; pron: string;
  meaning?: string; example: string; exampleTamil: string; synonyms: string[];
  level: 'beginner' | 'intermediate' | 'advanced'; savedAt: string;
}
interface OnlineWord extends Word { audioUrl?: string; source: string; }
interface DictionaryApiEntry {
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string; synonyms?: string[] }> }>;
}

// Exact, dependable Tamil meanings for common function words. Online dictionary
// APIs provide English definitions, not Tamil translations, so these must be
// resolved locally before trying a free translation service.
const COMMON_TAMIL_MEANINGS: Record<string, string> = {
  a: 'ஒரு', an: 'ஒரு', the: 'அந்த', and: 'மற்றும்', or: 'அல்லது', but: 'ஆனால்',
  if: 'என்றால்', because: 'ஏனெனில்', so: 'எனவே', although: 'இருப்பினும்',
  what: 'என்ன', when: 'எப்போது', where: 'எங்கே', why: 'ஏன்', who: 'யார்',
  whom: 'யாரை', whose: 'யாருடைய', which: 'எது', how: 'எப்படி', whether: 'என்பதா',
  yes: 'ஆம்', no: 'இல்லை', not: 'இல்லை', never: 'ஒருபோதும் இல்லை', always: 'எப்போதும்',
  in: 'உள்ளே; இல்', on: 'மேல்; அன்று', at: 'இடத்தில்; மணிக்கு', by: 'மூலம்; அருகில்',
  for: 'க்காக; க்கு', from: 'இருந்து', to: 'க்கு; நோக்கி', with: 'உடன்', without: 'இல்லாமல்',
  of: 'உடைய; இன்', about: 'பற்றி', under: 'கீழே', over: 'மேலே', above: 'மேலே',
  below: 'கீழே', between: 'இடையில்', among: 'மத்தியில்', behind: 'பின்னால்',
  beside: 'அருகில்', near: 'அருகில்', inside: 'உள்ளே', outside: 'வெளியே',
  before: 'முன்பு', after: 'பிறகு', during: 'போது', until: 'வரை', since: 'முதல்; இருந்து',
  through: 'வழியாக', across: 'குறுக்கே', around: 'சுற்றிலும்', against: 'எதிராக',
  into: 'உள்ளே', onto: 'மேல்', off: 'விலகி', up: 'மேலே', down: 'கீழே',
  here: 'இங்கே', there: 'அங்கே', now: 'இப்போது', then: 'அப்போது', today: 'இன்று',
  tomorrow: 'நாளை', yesterday: 'நேற்று', this: 'இது', that: 'அது', these: 'இவை', those: 'அவை',
  i: 'நான்', you: 'நீங்கள்; நீ', he: 'அவன்', she: 'அவள்', it: 'அது', we: 'நாங்கள்; நாம்',
  they: 'அவர்கள்', me: 'என்னை', him: 'அவனை', her: 'அவளை', us: 'எங்களை; நம்மை', them: 'அவர்களை',
  my: 'என்னுடைய', your: 'உங்களுடைய; உன்னுடைய', his: 'அவனுடைய',
  our: 'எங்களுடைய; நம்முடைய', their: 'அவர்களுடைய', can: 'முடியும்', could: 'முடிந்தது; முடியுமா',
  should: 'வேண்டும்', would: 'செய்வார்; செய்வேன் (சூழலைப் பொறுத்து)', must: 'கட்டாயம் வேண்டும்',
  may: 'இருக்கலாம்; அனுமதி', might: 'இருக்கக்கூடும்', will: 'செய்வேன்; செய்வார்',
  do: 'செய்', does: 'செய்கிறார்; செய்கிறது', did: 'செய்தார்; செய்தது', be: 'இரு',
  is: 'இருக்கிறது', am: 'இருக்கிறேன்', are: 'இருக்கிறீர்கள்; இருக்கின்றன', was: 'இருந்தது',
  were: 'இருந்தார்கள்; இருந்தன', have: 'வைத்திருக்க; உள்ளது', has: 'வைத்திருக்கிறார்; உள்ளது',
  had: 'வைத்திருந்தார்; இருந்தது', go: 'செல்', come: 'வா', get: 'பெறு; எடு', make: 'உருவாக்கு; செய்',
  take: 'எடு; எடுத்துச் செல்', give: 'கொடு', know: 'தெரியும்', think: 'நினை', want: 'விரும்பு',
  need: 'தேவை', like: 'பிடிக்கும்', love: 'நேசி', good: 'நல்ல', bad: 'கெட்ட', new: 'புதிய',
  old: 'பழைய', big: 'பெரிய', small: 'சிறிய', very: 'மிகவும்', more: 'மேலும்', most: 'மிக அதிகம்',
  many: 'பல', much: 'அதிகம்', few: 'சில', some: 'சில', any: 'ஏதேனும்', all: 'அனைத்தும்',
  every: 'ஒவ்வொரு', each: 'ஒவ்வொன்றும்', another: 'மற்றொன்று', other: 'மற்ற', same: 'அதே',
  again: 'மீண்டும்', also: 'மேலும்; கூட', only: 'மட்டும்', just: 'மட்டும்; இப்போதுதான்',
  already: 'ஏற்கனவே', still: 'இன்னும்', yet: 'இன்னும்; இதுவரை', soon: 'விரைவில்', later: 'பிறகு',
  together: 'ஒன்றாக', maybe: 'ஒருவேளை', perhaps: 'ஒருவேளை', really: 'உண்மையாக',
};

@Component({
  selector: 'app-dictionary', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="dictionary">
      <header><h1>My Dictionary</h1><p>Every search checks free online dictionaries and saves successful results on this device for offline use.</p></header>
      <a class="practice-link" routerLink="/practice-words">📚 Open My Practice Words ({{ saved().length }})</a>
      <div class="search card">
        <label for="wordSearch">English word</label>
        <div class="searchline">
          <input id="wordSearch" [(ngModel)]="query" (ngModelChange)="updateSuggestions($event)" (keyup.enter)="findWord()" placeholder="Type a word…" autocomplete="off" aria-autocomplete="list" aria-controls="dictionarySuggestions">
          <button type="button" (click)="findWord()" [disabled]="loading() || !query.trim()">Search</button>
        </div>
        @if (suggestions().length) {
          <ul id="dictionarySuggestions" class="suggestions" role="listbox" aria-label="Word suggestions">
            @for (suggestion of suggestions(); track suggestion.id) {
              <li><button type="button" class="suggestion" role="option" (click)="selectSuggestion(suggestion)"><span>{{ suggestion.word }}</span><small>{{ suggestion.tamil }}</small></button></li>
            }
          </ul>
        }
        @if (loading()) { <p class="search-status searching" role="status" aria-live="polite">Searching online…</p> }
        @if (onlineStatus() === 'found') { <p class="search-status found" role="status" aria-live="polite">Online result found</p> }
        @if (onlineStatus() === 'none') { <p class="search-status none" role="status" aria-live="polite">No online result</p> }
        @if (onlineStatus() === 'offline') { <p class="search-status offline" role="status" aria-live="polite">No internet connection</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }
      </div>

      @for (word of matches(); track word.id) {
        <article class="result card">
          <div class="online-label">Local result</div>
          <div class="word-title"><h2>{{ word.word }}</h2><button type="button" class="pronounce" (click)="playPronunciation(word.word)" [attr.aria-label]="'Hear pronunciation of ' + word.word" title="Hear pronunciation">🔊</button></div>
          <p class="tamil">{{ word.tamil }}</p>
          @if (word.meaning) { <p>{{ word.meaning }}</p> }
          @if (word.pos) { <p class="muted">{{ word.pos }}@if (word.pron) { · {{ word.pron }} }</p> }
          @if (word.example) { <p class="example">{{ word.example }}</p><p class="muted">{{ word.exampleTamil }}</p> }
          @if (word.synonyms.length) { <p class="muted">Similar: {{ word.synonyms.join(', ') }}</p> }
          <button type="button" [disabled]="isSaved(word.word)" (click)="save(word)">{{ isSaved(word.word) ? 'Added to My Practice Words' : 'Add to My Practice Words' }}</button>
        </article>
      }

      @if (onlineResult(); as online) {
        <article class="result card online-result">
          <div class="online-label">Free online result · {{ online.source }}</div>
          <div class="word-title"><h2>{{ online.word }}</h2><button type="button" class="pronounce" (click)="playPronunciation(online.word, onlineAudio())" [attr.aria-label]="'Hear pronunciation of ' + online.word" title="Hear pronunciation">🔊</button></div>
          <p class="tamil">{{ online.tamil || 'தமிழ் அர்த்தம் கிடைக்கவில்லை. கீழே நீங்களே சேர்க்கலாம்.' }}</p>
          @if (online.meaning) { <p>{{ online.meaning }}</p> }
          @if (online.pos) { <p class="muted">{{ online.pos }}@if (online.pron) { · {{ online.pron }} }</p> }
          @if (online.example) { <p class="example">{{ online.example }}</p><p class="muted">{{ online.exampleTamil }}</p> }
          @if (online.synonyms.length) { <p class="muted">Similar: {{ online.synonyms.join(', ') }}</p> }
          <div class="actions">
            <button type="button" [disabled]="isSaved(online.word)" (click)="save(online)">{{ isSaved(online.word) ? 'Added to My Practice Words' : 'Add to My Practice Words' }}</button>
          </div>
          @if (!online.tamil) {
            <div class="notfound"><input [(ngModel)]="manualTamil" placeholder="தமிழ் அர்த்தம்" aria-label="Tamil meaning"><button type="button" [disabled]="!manualTamil.trim() || isSaved(online.word)" (click)="saveOnlineWithTamil(online)">Save Tamil meaning</button></div>
          }
        </article>
      }

      @if (notFound() && !loading() && !matches().length && !onlineResult()) {
        <div class="notfound card">
          <p>Could not find this word in the local or free online dictionary. Add its Tamil meaning yourself.</p>
          <input [(ngModel)]="manualTamil" placeholder="தமிழ் அர்த்தம்" aria-label="Tamil meaning">
          <button type="button" [disabled]="!manualTamil.trim() || isSaved(query)" (click)="saveCustom()">Add word</button>
        </div>
      }

      <p class="footnote">Online lookup needs internet. Successful results are automatically saved in My Dictionary on this device for later offline use. Free services have usage limits and may occasionally be unavailable.</p>
    </section>
  `,
  styles: [`
    :host{display:block;color:var(--text)}.dictionary{max-width:760px;margin:0 auto;padding-bottom:24px}.practice-link{display:inline-flex;margin:0 0 12px;padding:10px 13px;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);font-weight:700;text-decoration:none}header{padding:8px 2px 16px}h1{font-size:1.9rem;margin:0 0 6px}header p,.muted{color:var(--muted);line-height:1.5}.card{background:#fff;border:1px solid var(--border);border-radius:15px;padding:15px;margin:10px 0}.search label{display:block;font-weight:700;margin-bottom:8px}.searchline{display:flex;gap:8px}.searchline input,.notfound input{flex:1;min-width:0;border:1px solid var(--border);border-radius:10px;padding:12px;font:inherit;color:var(--text);background:#fff}button{border:0;border-radius:10px;padding:11px 14px;background:var(--primary);color:#fff;font-weight:700;cursor:pointer}button:disabled{opacity:.55}.suggestions{list-style:none;padding:5px;margin:6px 0 0;border:1px solid var(--border);border-radius:10px;max-height:240px;overflow:auto;background:#fff}.suggestions li+li{border-top:1px solid var(--border)}.suggestion{display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;text-align:left;background:transparent;color:var(--text);padding:10px;border-radius:6px}.suggestion:hover,.suggestion:focus{background:var(--primary-soft)}.suggestion small{color:var(--muted);font-size:.85rem;text-align:right}.tamil{font-size:1.1rem;font-weight:700;color:var(--primary-dark);margin:8px 0}.result h2{font-size:1.3rem;margin:0}.word-title{display:flex;align-items:center;gap:8px}.pronounce{width:40px;height:40px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#eee8ff;color:#5731b4;font-size:1.15rem;flex:none}.pronounce:active{transform:scale(.94)}.result p,.saved p{margin:6px 0}.example{margin-top:12px!important}.notfound{margin-top:12px;padding:12px;background:var(--primary-soft);border-radius:12px}.notfound p{margin:0 0 9px}.notfound button{margin-top:8px}.saved-heading{display:flex;align-items:center;justify-content:space-between;margin:22px 2px 8px}.saved-heading h2{font-size:1.2rem;margin:0}.saved-heading p{margin:4px 0}.saved-heading b{color:var(--primary);font-size:1.2rem}.saved{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.saved h3{margin:0;font-size:1.1rem}.delete{background:#fff0f0;color:#a32c37;flex:none}.empty{text-align:center;color:var(--muted);padding:22px}.error{color:#b42318}.search-status{font-weight:700;margin:10px 0 0;padding:10px 12px;border-radius:9px}.searching{background:#eef2ff;color:#3730a3}.found{background:#ecfdf3;color:#067647}.none,.offline{background:#fff4e5;color:#9a3412}.online-label{font-size:.8rem;color:var(--muted);margin-bottom:8px}.actions{display:flex;gap:8px;flex-wrap:wrap}.secondary{background:#ece8ff;color:var(--primary-dark)}.footnote{font-size:.8rem;color:var(--muted);line-height:1.5;margin-top:18px}@media(max-width:480px){.searchline{flex-direction:column}.searchline button{width:100%}.card{padding:13px}.saved{gap:8px}}
  `]
})
export class DictionaryComponent implements OnDestroy {
  private readonly data = inject(DataService);
  private readonly storage = inject(StorageService);
  private readonly storageKey = 'lela.my-dictionary.practice.v1';
  private readonly cacheKey = 'lela.my-dictionary.online-cache.v1';
  private readonly localDictionaryKey = 'lela.my-dictionary.saved.v1';
  query = '';
  manualTamil = '';
  private readonly allWords = signal<Word[]>([]);
  private readonly results = signal<Word[]>([]);
  readonly suggestions = signal<Word[]>([]);
  readonly matches = this.results.asReadonly();
  readonly loading = signal(false);
  readonly onlineStatus = signal<'idle' | 'searching' | 'found' | 'none' | 'offline'>('idle');
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly onlineResult = signal<OnlineWord | null>(null);
  readonly onlineAudio = signal('');
  readonly speech = inject(SpeechService);
  private pronunciationSub?: Subscription;
  readonly saved = signal<SavedWord[]>(this.readSaved());
  readonly localDictionary = signal<SavedWord[]>(this.readLocalDictionary());
  private searchSequence = 0;

  constructor() { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try { this.allWords.set(await this.data.allVocabulary()); }
    catch { this.error.set('Local dictionary could not be loaded. Online lookup is still available.'); }
    finally { this.loading.set(false); }
  }

  updateSuggestions(value: string): void {
    ++this.searchSequence;
    this.loading.set(false);
    this.query = value;
    const key = this.normalize(value);
    this.error.set('');
    this.onlineStatus.set('idle');
    this.notFound.set(false);
    this.results.set([]);
    this.onlineResult.set(null);
    this.onlineAudio.set('');
    if (key.length < 1) { this.suggestions.set([]); return; }
    const combined = [...this.allWords(), ...this.localDictionary(), ...this.saved()];
    const unique = new Map<string, Word>();
    for (const word of combined) { const k = this.normalize(word.word); if (k && !unique.has(k)) unique.set(k, word as Word); }
    const matches = [...unique.values()]
      .filter(word => this.normalize(word.word).startsWith(key))
      .sort((a, b) => a.word.localeCompare(b.word))
      .slice(0, 8);
    this.suggestions.set(matches);
  }

  selectSuggestion(word: Word): void {
    ++this.searchSequence;
    this.query = word.word;
    this.suggestions.set([]);
    this.loading.set(false);
    this.manualTamil = '';
    this.results.set([word]);
    this.onlineResult.set(null);
    this.onlineAudio.set('');
    this.error.set('');
    this.onlineStatus.set('idle');
    this.notFound.set(false);
  }

  async findWord(): Promise<void> {
    const q = this.query.trim();
    const key = this.normalize(q);
    const sequence = ++this.searchSequence;
    this.loading.set(false);
    this.suggestions.set([]);
    this.manualTamil = '';
    this.error.set('');
    this.onlineStatus.set('idle');
    this.notFound.set(false);
    this.onlineResult.set(null);
    this.onlineAudio.set('');
    if (!key) { this.results.set([]); return; }

    const all = this.allWords();
    // Check both the built-in vocabulary and words the user added manually.
    // Use exact matches only: "whenever" must not hide a search for "when".
    const exact = all.find(w => this.normalize(w.word) === key);
    const localWord = this.localDictionary().find(w => this.normalize(w.word) === key);
    const userWord = this.saved().find(w => this.normalize(w.word) === key);
    // Keep an exact local match visible, but never let it prevent a fresh
    // online request. This also keeps user-added words available when offline.
    if (exact) this.results.set([exact]);
    else if (localWord) {
      this.results.set([{ ...localWord, meaning: localWord.meaning || '', synonyms: localWord.synonyms || [], level: (localWord.level as Word['level']) || 'beginner' } as Word]);
    } else if (userWord) {
      this.results.set([{ ...userWord, meaning: userWord.meaning || '', synonyms: userWord.synonyms || [], level: userWord.level || 'beginner' } as Word]);
    } else this.results.set([]);

    // Cache is a fallback only. Pressing Search must contact online services
    // again even when this word has already been cached on the device.
    const cached = this.readOnlineCache()[key];

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (cached?.tamil?.trim()) {
        this.onlineResult.set(cached);
        this.onlineAudio.set(cached.audioUrl || '');
      }
      this.onlineStatus.set('offline');
      this.notFound.set(!exact && !userWord && !cached);
      this.error.set('Connect to the internet to refresh this word. Showing any saved local result above.');
      return;
    }

    this.onlineStatus.set('searching');
    this.loading.set(true);
    try {
      // Do not make Tamil translation depend on the English dictionary API.
      // Some valid words, names, inflections and regional terms are missing there.
      let entry: DictionaryApiEntry | undefined;
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`);
        if (response.ok) {
          const entries = await response.json() as DictionaryApiEntry[];
          entry = entries[0];
        }
      } catch {
        // Continue: the independent Tamil translation service may still work.
      }

      const firstMeaning = entry?.meanings?.[0];
      const firstDefinition = firstMeaning?.definitions?.find(d => d.definition) ?? firstMeaning?.definitions?.[0];
      const audioUrl = entry?.phonetics?.find(p => p.audio)?.audio || '';
      const pron = entry?.phonetics?.find(p => p.text)?.text || '';
      const tamil = await this.translateToTamil(q);
      if (sequence !== this.searchSequence) return;

      // If neither free source knows the word, leave the manual Tamil input visible.
      if (!firstDefinition?.definition && !tamil) {
        this.onlineStatus.set(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'none');
        if (cached?.tamil?.trim()) {
          this.onlineResult.set(cached);
          this.onlineAudio.set(cached.audioUrl || '');
        }
        this.notFound.set(!exact && !userWord && !cached);
        this.error.set(cached ? 'No fresh online result. Showing the previously saved result.' : 'No result was returned by the free online sources. You can enter the Tamil meaning below and save this word.');
        return;
      }

      const example = firstDefinition?.example || '';
      const exampleTamil = example ? await this.translateToTamil(example) : '';
      const online: OnlineWord = {
        id: 'online-' + key, word: q.toLocaleLowerCase(), tamil,
        pos: firstMeaning?.partOfSpeech || '', pron,
        meaning: firstDefinition?.definition || '', example, exampleTamil,
        synonyms: (firstDefinition?.synonyms || []).slice(0, 8), level: 'intermediate', audioUrl,
        source: firstDefinition?.definition ? 'Free Dictionary API' : 'Free Tamil translation'
      };
      if (sequence !== this.searchSequence) return;
      this.onlineResult.set(online);
      this.writeLocalDictionary(online);
      this.onlineStatus.set('found');
      this.onlineAudio.set(audioUrl);
      this.writeOnlineCache(key, online);
    } catch {
      if (sequence !== this.searchSequence) return;
      this.onlineStatus.set(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'none');
      if (cached?.tamil?.trim()) {
        this.onlineResult.set(cached);
        this.onlineAudio.set(cached.audioUrl || '');
      }
      this.notFound.set(!exact && !userWord && !cached);
      this.error.set(cached ? 'Online refresh failed. Showing the previously saved result.' : 'The online lookup did not return a result. Check your connection or enter the Tamil meaning below.');
    } finally {
      if (sequence === this.searchSequence) this.loading.set(false);
    }
  }

  isSaved(word: string): boolean {
    return this.saved().some(x => this.normalize(x.word) === this.normalize(word));
  }

  save(word: Word | OnlineWord): void {
    if (this.isSaved(word.word)) return;
    this.persist([...this.saved(), { ...word, savedAt: new Date().toISOString() }]);
  }

  saveOnlineWithTamil(word: OnlineWord): void {
    const tamil = this.manualTamil.trim();
    if (!tamil) return;
    const updated = { ...word, tamil };
    this.writeOnlineCache(this.normalize(word.word), updated);
    this.writeLocalDictionary(updated);
    this.manualTamil = '';
    this.onlineResult.set(updated);
  }

  saveCustom(): void {
    const word = this.query.trim();
    const tamil = this.manualTamil.trim();
    if (!word || !tamil || this.isSaved(word)) return;
    const custom: SavedWord = {
      id: 'custom-' + Date.now(), word, tamil, pos: '', pron: '', example: '', exampleTamil: '',
      synonyms: [], level: 'beginner', savedAt: new Date().toISOString()
    };
    this.persist([...this.saved(), custom]);
    this.writeLocalDictionary(custom);
    this.manualTamil = '';
    this.notFound.set(false);
    this.error.set('Word and Tamil meaning saved on this device.');
  }

  remove(word: string): void {
    this.persist(this.saved().filter(x => this.normalize(x.word) !== this.normalize(word)));
  }

  playPronunciation(word: string, audioUrl = ''): void {
    this.pronunciationSub?.unsubscribe();
    this.speech.stopSpeaking();
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        void audio.play().catch(() => this.speakWord(word));
        return;
      } catch { /* use the device voice below */ }
    }
    this.speakWord(word);
  }

  ngOnDestroy(): void {
    this.pronunciationSub?.unsubscribe();
  }

  private speakWord(word: string): void {
    this.pronunciationSub = this.speech.speak(word, { lang: 'en-IN', rate: 0.82, pitch: 1.05 }).subscribe({
      error: (err: Error) => this.error.set(err.message),
      complete: () => undefined,
    });
  }

  private normalize(word: string): string { return word.trim().toLocaleLowerCase().replace(/\s+/g, ' '); }

  private localTamilMeaning(text: string): string {
    const key = this.normalize(text).replace(/[.!?]+$/g, '');
    return COMMON_TAMIL_MEANINGS[key] || '';
  }

  private async translateToTamil(text: string): Promise<string> {
    const local = this.localTamilMeaning(text);
    if (local) return local;
    try {
      const params = new URLSearchParams({ q: text, langpair: 'en|ta' });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
      if (!response.ok) return '';
      const data = await response.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
      const translated = data.responseData?.translatedText?.trim() || '';
      return data.responseStatus === 200 && translated.toLowerCase() !== text.toLowerCase() ? translated : '';
    } catch { return ''; }
  }

  private readOnlineCache(): Record<string, OnlineWord> {
    try { return JSON.parse(this.storage.read(this.cacheKey) || '{}') as Record<string, OnlineWord>; }
    catch { return {}; }
  }

  private writeOnlineCache(key: string, word: OnlineWord): void {
    const cache = this.readOnlineCache();
    cache[key] = word;
    this.storage.write(this.cacheKey, JSON.stringify(cache));
  }

  private readLocalDictionary(): SavedWord[] {
    try { return JSON.parse(this.storage.read(this.localDictionaryKey) || '[]') as SavedWord[]; }
    catch { return []; }
  }

  private writeLocalDictionary(word: Word | OnlineWord | SavedWord): void {
    const key = this.normalize(word.word);
    if (!key) return;
    const list = this.localDictionary().filter(item => this.normalize(item.word) !== key);
    const savedWord: SavedWord = {
      id: word.id || 'local-' + key, word: word.word, tamil: word.tamil || '',
      pos: word.pos || '', pron: word.pron || '', meaning: word.meaning || '',
      example: word.example || '', exampleTamil: word.exampleTamil || '',
      synonyms: word.synonyms || [], level: (word.level as SavedWord['level']) || 'beginner',
      savedAt: new Date().toISOString()
    };
    const next = [...list, savedWord];
    this.storage.write(this.localDictionaryKey, JSON.stringify(next));
    this.localDictionary.set(next);
  }

  private readSaved(): SavedWord[] {
    try { return JSON.parse(this.storage.read(this.storageKey) || '[]') as SavedWord[]; }
    catch { return []; }
  }

  private persist(words: SavedWord[]): void {
    const unique = new Map<string, SavedWord>();
    for (const word of words) {
      const key = this.normalize(word.word);
      if (key && !unique.has(key)) unique.set(key, word);
    }
    const list = [...unique.values()];
    this.storage.write(this.storageKey, JSON.stringify(list));
    this.saved.set(list);
  }
}
