import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { mergeTranscripts, stripUnclear, tidy } from '../core/transcript';
import { SpeechService } from '../services/speech.service';
import { IconComponent } from './icon.component';
import { MicHelpComponent } from './mic-help.component';

/** What was said, kept apart from what is finally checked. */
export interface CapturedSpeech {
  /** The words exactly as the recogniser heard them (may contain [Unclear]). Never changed by the app. */
  original: string;
  /** The text that is checked: the original without [Unclear], or the learner's own edit. */
  text: string;
  /** true when the learner edited the text before checking. */
  edited: boolean;
  source: 'voice' | 'typed';
}

/**
 * Say or type a sentence. Emits the final text through `(heard)` (and the full detail through `(captured)`).
 *  - The microphone keeps listening through short pauses, so a whole sentence is captured, and it keeps the text
 *    of earlier parts. Tap Stop (or stay silent) to finish.
 *  - Final text and live (interim) text are shown separately.
 *  - With [review]="true" the learner first sees "what I said", can replay it, edit it, and then press Check.
 * The microphone needs the browser's speech recognition (Chrome/Edge, internet); typing always works.
 */
@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [IconComponent, MicHelpComponent],
  template: `
    @if (speech.recognitionIssue; as issue) {
      <p class="notice warn">{{ issue }} You can type your answer instead.</p>
    } @else if (speech.micPermission() === 'denied' && !speech.isNativeApp) {
      <p class="notice warn">Microphone is blocked. Allow it in the address bar (lock icon), then reload. Or type below.</p>
    } @else if (!speech.online()) {
      <p class="notice warn" role="status"><app-icon name="wifi-off" [size]="16" /> You are offline. Speaking needs internet (the browser sends your voice to its speech service). Everything else works offline, so type your sentence below.</p>
    }

    <app-mic-help />

    @if (speech.listenState() !== 'idle' || collecting()) {
      <div class="live" role="status" aria-live="polite" data-testid="listening">
        <span class="rings" aria-hidden="true"><app-icon name="mic" [size]="20" /></span>
        <div class="live-text">
          <strong>{{ speech.listenState() === 'starting' ? 'Starting microphone…' : 'Listening… speak now' }}</strong>
          @if (collected()) { <p class="fin" data-testid="final-text"><span class="tag">Heard</span> {{ collected() }}</p> }
          @if (speech.interim() && speech.interim() !== collected()) { <p class="int" data-testid="interim-text"><span class="tag">Hearing</span> {{ interimOnly() }}</p> }
        </div>
      </div>
    }
    @if (error()) {
      <p class="notice warn" role="alert">{{ error() }}</p>
    }

    @if (phase() === 'review') {
      <section class="review" aria-label="Review what you said">
        <p class="label"><app-icon name="original" [size]="16" /> What I said</p>
        @if (!editing()) {
          <p class="said" data-testid="review-original">{{ original() }}</p>
          @if (hasUnclear()) { <p class="small">[Unclear] means I could not hear that part. Tap Edit to type it, or check without it.</p> }
          @else if (uncertain()) { <p class="small">The microphone was not fully sure about some words. Replay it, or tap Edit if it is not what you said.</p> }
        } @else {
          <textarea #ed class="edit" rows="3" aria-label="Edit what you said" [value]="draft()" (input)="draft.set(ed.value)" maxlength="400"></textarea>
          <p class="small">Your original words stay saved above the result. Only fix words the microphone got wrong.</p>
        }
        <div class="row actions">
          <button type="button" class="btn small" (click)="replay()" [disabled]="!speech.synthesisSupported" data-testid="replay"><app-icon name="replay" [size]="18" /> Replay</button>
          <button type="button" class="btn small" [class.on]="editing()" (click)="toggleEdit()" data-testid="edit"><app-icon name="edit" [size]="18" /> {{ editing() ? 'Done editing' : 'Edit' }}</button>
          <button type="button" class="btn small" (click)="addMore()" [disabled]="!speech.recognitionSupported || !speech.online()"><app-icon name="mic" [size]="18" /> Add more</button>
          <button type="button" class="btn small" (click)="discard()"><app-icon name="close" [size]="18" /> Clear</button>
          <button type="button" class="btn primary" (click)="confirm()" data-testid="confirm"><app-icon name="corrected" [size]="18" /> Check</button>
        </div>
        <p class="small">Replay reads the words aloud with a computer voice. Your own voice is not recorded.</p>
      </section>
    } @else {
      <form class="row" (submit)="submitTyped($event, box)">
        <button
          type="button"
          class="btn mic"
          [class.on]="speech.isListening() || collecting()"
          [disabled]="!speech.recognitionSupported || disabled"
          (click)="toggleMic()"
          [attr.aria-pressed]="speech.isListening()"
          [attr.aria-label]="speech.isListening() || collecting() ? 'Stop listening' : 'Start speaking'"
        >
          @if (speech.isListening() || collecting()) { <app-icon name="stop" [size]="18" /> Stop } @else { <app-icon name="mic" [size]="18" /> Speak }
        </button>
        <input
          #box
          type="text"
          class="grow"
          name="typed"
          [placeholder]="placeholder"
          aria-label="Type your sentence"
          autocomplete="off"
          autocapitalize="sentences"
          enterkeyhint="send"
          maxlength="300"
          [disabled]="disabled"
        />
        <button type="submit" class="btn primary" [disabled]="disabled"><app-icon name="send" [size]="18" /> Check</button>
      </form>
    }
  `,
  styles: `
    .live { align-items: flex-start; } .live-text { min-width: 0; flex: 1; } .live-text p { margin: 4px 0 0; font-size: .95rem; }
    .rings { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff; flex: none; }
    .rings::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid var(--danger); opacity: .5; animation: ring 1.2s ease-out infinite; }
    @keyframes ring { from { transform: scale(.8); opacity: .7; } to { transform: scale(1.35); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .rings::after { animation: none; } }
    .tag { display: inline-block; font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 1px 6px; border-radius: 8px; background: var(--primary-soft); color: var(--primary-dark); margin-right: 4px; }
    .fin { color: var(--text); } .int { color: var(--muted); font-style: italic; }
    .review { background: var(--primary-tint); border: 1px solid var(--border); border-radius: 14px; padding: 12px; margin: 8px 0; }
    .said { font-size: 1.15rem; margin: 4px 0 8px; line-height: 1.5; } .edit { width: 100%; font-size: 1.05rem; line-height: 1.5; resize: vertical; }
    .actions { margin: 8px 0 4px; }
  `,
})
export class VoiceInputComponent implements OnDestroy {
  readonly speech = inject(SpeechService);

  @Input() placeholder = 'Or type here…';
  @Input() disabled = false;
  /** Show "What I said" with Replay and Edit before the text is checked. */
  @Input() review = false;
  @Output() readonly heard = new EventEmitter<string>();
  @Output() readonly captured = new EventEmitter<CapturedSpeech>();

  readonly error = signal('');
  readonly phase = signal<'idle' | 'review'>('idle');
  readonly collecting = signal(false);
  readonly collected = signal('');
  readonly original = signal('');
  readonly draft = signal('');
  readonly editing = signal(false);
  readonly uncertain = signal(false);

  private sub?: Subscription;
  private stopRequested = false;
  private sessions = 0;
  private acc = '';
  private accUncertain = false;
  private restart?: ReturnType<typeof setTimeout>;
  private idle?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.speech.getMicPermission();
  }

  hasUnclear(): boolean { return /\[Unclear\]/i.test(this.original()); }
  /** The part of the live text that is still changing (the final part is shown on its own line). */
  interimOnly(): string {
    const live = this.speech.interim();
    const fin = this.speech.heardFinal();
    return fin && live.startsWith(fin) ? live.slice(fin.length).trim() || live : live;
  }

  toggleMic(): void {
    const state = this.speech.listenState();
    if (state === 'listening' || this.collecting()) {
      this.stopRequested = true;
      clearTimeout(this.restart);
      if (state === 'listening') this.speech.stopListening(); // finishes with what was heard so far
      else this.finish();
      return;
    }
    if (state === 'starting') {
      this.cancel();
      return;
    }
    this.begin('');
  }

  /** Records more speech after the current text (the earlier text is kept). */
  addMore(): void {
    this.phase.set('idle');
    this.begin(this.original(), this.uncertain());
  }

  private begin(previous: string, wasUncertain = false): void {
    this.speech.stopSpeaking(); // so the microphone does not hear the speaker
    this.error.set('');
    this.sub?.unsubscribe();
    this.stopRequested = false;
    this.sessions = 0;
    this.acc = previous;
    this.accUncertain = wasUncertain;
    this.collected.set(previous);
    this.collecting.set(true);
    this.session();
  }

  /** One listening session. When the browser ends it at a pause, another one starts, until Stop or silence. */
  private session(): void {
    this.sessions++;
    let gotText = false;
    this.armIdle();
    this.sub = this.speech.listen('en-IN').subscribe({
      next: (event) => {
        this.armIdle();
        if (!event.isFinal) return;
        const piece = tidy(event.marked ?? event.transcript);
        if (!piece) return;
        gotText = true;
        if (event.uncertain) this.accUncertain = true;
        const merged = mergeTranscripts(this.acc, piece);
        // A later session that only repeats what we already have means the speaker has finished.
        if (merged === this.acc && this.sessions > 1) this.stopRequested = true;
        this.acc = merged;
        this.collected.set(this.acc);
      },
      error: (err: Error & { code?: string }) => {
        if (err.code === 'no-speech' && this.acc) { this.finish(); return; } // silence after speaking = finished
        this.collecting.set(false);
        if (this.acc) { this.finish(); this.error.set(err.message); return; }
        this.error.set(err.message);
      },
      complete: () => {
        if (this.stopRequested || !gotText || this.sessions >= 6) { this.finish(); return; }
        this.restart = setTimeout(() => { if (!this.stopRequested) this.session(); else this.finish(); }, 250);
      },
    });
  }

  /** After the first part of a sentence, wait only a short time for more speech, then finish. */
  private armIdle(): void {
    clearTimeout(this.idle);
    if (this.sessions < 2 || this.stopRequested) return;
    this.idle = setTimeout(() => {
      this.stopRequested = true;
      if (this.speech.listenState() === 'listening') this.speech.stopListening();
      else this.finish();
    }, 2500);
  }

  private finish(): void {
    clearTimeout(this.idle);
    clearTimeout(this.restart);
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.collecting.set(false);
    const text = tidy(this.acc);
    if (!text) {
      this.error.set("I didn't hear anything. Tap Speak and try again, a little louder and closer to the microphone.");
      return;
    }
    if (this.review) {
      this.original.set(text);
      this.draft.set(text);
      this.uncertain.set(this.accUncertain);
      this.editing.set(false);
      this.phase.set('review');
    } else {
      this.emit(text, text, 'voice');
    }
  }

  replay(): void {
    const words = stripUnclear(this.editing() ? this.draft() : this.original());
    if (words) this.speech.speak(words, { lang: 'en-IN' }).subscribe({ error: () => this.error.set('This device could not read the text aloud.') });
  }

  toggleEdit(): void {
    if (!this.editing()) this.draft.set(this.draft() || this.original());
    this.editing.update((v) => !v);
  }

  discard(): void {
    this.speech.stopSpeaking();
    this.phase.set('idle');
    this.original.set('');
    this.draft.set('');
    this.editing.set(false);
    this.collected.set('');
  }

  confirm(): void {
    const original = this.original();
    const text = stripUnclear(this.editing() ? this.draft() : original);
    if (!text) {
      this.error.set('There is nothing to check yet. Tap Edit and type the sentence, or tap Clear and speak again.');
      return;
    }
    this.speech.stopSpeaking();
    // "edited" is only true when the learner really changed the words (removing [Unclear] is not an edit).
    const edited = text !== stripUnclear(original);
    this.phase.set('idle');
    this.collected.set('');
    this.emit(original, text, 'voice', edited);
  }

  private emit(original: string, text: string, source: 'voice' | 'typed', edited = false): void {
    const clean = stripUnclear(text);
    if (!clean) { this.error.set('I could not hear clear words. Please try again or type the sentence.'); return; }
    this.collected.set('');
    this.captured.emit({ original, text: clean, edited, source });
    this.heard.emit(clean);
  }

  submitTyped(event: Event, box: HTMLInputElement): void {
    event.preventDefault();
    const text = box.value.trim();
    if (!text) {
      this.error.set('Please type or say a sentence first.');
      return;
    }
    box.value = '';
    this.error.set('');
    this.emit(text, text, 'typed');
  }

  cancel(): void {
    this.stopRequested = true;
    clearTimeout(this.restart);
    clearTimeout(this.idle);
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.collecting.set(false);
  }

  ngOnDestroy(): void {
    this.cancel();
    this.speech.stopSpeaking();
  }
}
