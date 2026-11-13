import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FeedbackService, SpeakingFeedback } from '../../core/feedback.service';
import { ProgressService } from '../../core/progress.service';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { IconComponent } from '../../shared/icon.component';
import { CapturedSpeech, VoiceInputComponent } from '../../shared/voice-input.component';
import { SpeechService } from '../../services/speech.service';

/**
 * Speak any English sentence -> see exactly what was recognised -> see the corrected sentence ->
 * listen to the corrected sentence. The sentence does not have to exist in the practice data.
 */
@Component({
  selector: 'app-correction-flow',
  standalone: true,
  imports: [SpeakButtonComponent, VoiceInputComponent, IconComponent],
  template: `
    @if (!result()) {
      <section class="card">
        <h2>Say any English sentence</h2>
        <p class="small">
          Tap <strong>Speak</strong>, say a sentence, check what I heard (replay or edit it), then tap <strong>Check</strong>.
          <span lang="ta">எந்த ஆங்கில வாக்கியத்தையும் சொல்லுங்கள்; நான் கேட்டதைப் பார்த்து, சரிபார்க்கலாம்.</span>
        </p>
        <app-voice-input placeholder="Or type a sentence…" [disabled]="checking()" [review]="true" (captured)="onCaptured($event)" />
        @if (checking()) { <p class="small" role="status">Checking your sentence…</p> }
      </section>
    } @else {
      @let r = result()!;
      @let c = captured();
      <p class="badge rule" [class.rule]="r.kind === 'rule-based'" [class.ai]="r.kind === 'ai'">
        @if (r.kind === 'rule-based') { Rule-based check · not AI · works offline } @else { AI-powered check }
      </p>

      <section class="card sec said-card" aria-live="polite">
        <h2 class="label"><app-icon name="original" [size]="18" /> A. What I said</h2>
        <p class="said" data-testid="said">{{ c ? c.original : r.heard }}</p>
        @if (c && c.edited) {
          <p class="small"><app-icon name="edit" [size]="14" /> You edited it before checking. The sentence checked was:</p>
          <p class="said edited" data-testid="edited">{{ c.text }}</p>
        }
        <p class="small">This is the original transcription. It is never changed by the app.</p>
        <button type="button" class="btn small" (click)="replayOriginal()" [disabled]="!speech.synthesisSupported"><app-icon name="replay" [size]="18" /> Replay</button>
      </section>

      <section class="card sec fixed-card">
        <h2 class="label"><app-icon name="corrected" [size]="18" /> B. Corrected English</h2>
        <p class="correct" [class.same]="!r.outcome.changed" data-testid="corrected">{{ r.outcome.corrected }}</p>
        @if (!r.outcome.changed) {
          <p class="small">No mistake found by my rules. This does not prove the sentence is perfect.</p>
        }
        <div class="row actions">
          <app-speak-button [text]="r.outcome.corrected" label="Speak corrected sentence" [primary]="true" (failed)="speakError.set($event)" />
        </div>
        @if (!speech.synthesisSupported) {
          <p class="notice warn">This browser cannot read text aloud. You can still read the corrected sentence above.</p>
        }
        @if (speakError()) { <p class="notice warn" role="alert">{{ speakError() }}</p> }
      </section>

      <section class="card sec why-card">
        <h2 class="label"><app-icon name="explanation" [size]="18" /> C. Explanation</h2>
        @if (r.outcome.explanations.length > 0) {
          <ul class="why">
            @for (e of r.outcome.explanations; track $index) {
              <li>
                <strong>{{ e.found }} → {{ e.replacement }}</strong>
                <span class="block"><span class="lang">English</span> {{ e.english }}</span>
                <span class="block" lang="ta"><span class="lang"><app-icon name="translate" [size]="12" /> தமிழ்</span> {{ e.tamil }}</span>
              </li>
            }
          </ul>
        } @else {
          <p><span class="lang">English</span> No mistake was found by my rules, so there is nothing to fix.</p>
          <p lang="ta"><span class="lang"><app-icon name="translate" [size]="12" /> தமிழ்</span> எங்கள் விதிகளின்படி தவறு எதுவும் கிடைக்கவில்லை, எனவே திருத்த எதுவும் இல்லை.</p>
        }
        @if (r.tips.length > 0) {
          <p class="label">You could also say</p>
          <ul class="why">
            @for (tip of r.tips; track tip.plain) {
              <li>
                <strong>“{{ tip.plain }}” → {{ tip.better.join(' / ') }}</strong>
                <span class="block small">{{ tip.exampleBefore }} → <em>{{ tip.exampleAfter }}</em></span>
                <span class="block small" lang="ta">{{ tip.tamil }}</span>
              </li>
            }
          </ul>
        }
        <p class="notice">{{ r.outcome.disclaimer }}</p>
      </section>

      <div class="row"><button type="button" class="btn primary" (click)="tryAgain()"><app-icon name="mic" [size]="18" /> Try another sentence</button></div>
    }
  `,
  styles: `
    .sec { border-left: 6px solid var(--border); } .said-card { border-left-color: #868e96; } .fixed-card { border-left-color: #2f9e44; } .why-card { border-left-color: var(--primary); }
    .sec h2.label { margin: 0 0 6px; font-size: .85rem; }
    .said { font-size: 1.15rem; margin: 2px 0 8px; color: var(--text); line-height: 1.55; } .said.edited { color: var(--primary-dark); font-weight: 600; }
    .correct { font-size: 1.35rem; font-weight: 700; margin: 2px 0 8px; color: #1b7a2b; line-height: 1.45; } .correct.same { color: var(--text); }
    .actions { margin: 10px 0; } .why { padding-left: 18px; margin: 4px 0; } .why li { margin-bottom: 12px; } .block { display: block; margin-top: 2px; }
    .lang { display: inline-flex; align-items: center; gap: 3px; font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 1px 6px; border-radius: 8px; background: var(--primary-soft); color: var(--primary-dark); margin-right: 4px; }
  `,
})
export class CorrectionFlowComponent implements OnDestroy {
  readonly speech = inject(SpeechService);
  private readonly feedback = inject(FeedbackService);
  private readonly progress = inject(ProgressService);

  readonly result = signal<SpeakingFeedback | null>(null);
  readonly captured = signal<CapturedSpeech | null>(null);
  readonly checking = signal(false);
  readonly speakError = signal('');
  private request = 0;

  onCaptured(c: CapturedSpeech): void {
    this.captured.set(c);
    void this.onHeard(c.text);
  }

  replayOriginal(): void {
    const c = this.captured();
    const words = (c ? c.original : this.result()?.heard ?? '').replace(/\[Unclear\]/gi, ' ').trim();
    if (words) this.speech.speak(words, { lang: 'en-IN' }).subscribe({ error: () => this.speakError.set('This device could not read the text aloud.') });
  }

  async onHeard(text: string): Promise<void> {
    const heard = text.trim();
    if (!heard) return;
    const id = ++this.request;
    this.checking.set(true);
    this.speakError.set('');
    try {
      const feedback = await this.feedback.analyse(heard);
      if (id !== this.request) return; // the learner already started over
      this.result.set(feedback);
      this.progress.recordSpeaking();
    } finally {
      if (id === this.request) this.checking.set(false);
    }
  }

  tryAgain(): void {
    this.request++; // ignore any check still running
    this.speech.stopSpeaking();
    this.speakError.set('');
    this.checking.set(false);
    this.result.set(null);
    this.captured.set(null);
  }

  ngOnDestroy(): void {
    this.speech.stopSpeaking();
  }
}
