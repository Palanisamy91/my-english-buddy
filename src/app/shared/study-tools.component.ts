import { Component, Input, inject, signal } from '@angular/core';
import { FeedbackService, SpeakingFeedback } from '../core/feedback.service';
import { ProgressService } from '../core/progress.service';
import { LelaConversationService } from '../lela/lela-conversation.service';
import { FeedbackPanelComponent } from './feedback-panel.component';
import { IconComponent } from './icon.component';
import { VoiceInputComponent } from './voice-input.component';

/**
 * Two helpers for one word or sentence:
 *  - "Explain with Lela": a fixed-wording explanation (not AI) that she can read aloud in her voice.
 *  - "Practise": say the sentence (microphone needs internet) or type it, then a rule-based word-by-word check.
 * Speaking (Lela's voice) and listening (the microphone) are separate features here too.
 */
@Component({
  selector: 'app-study-tools',
  standalone: true,
  imports: [FeedbackPanelComponent, IconComponent, VoiceInputComponent],
  template: `
    <div class="row tools">
      <button type="button" class="btn small" [class.on]="showExplain()" (click)="showExplain.set(!showExplain())" [attr.aria-expanded]="showExplain()" data-testid="explain-btn">
        <app-icon name="explanation" [size]="16" /> Explain with Lela
      </button>
      <button type="button" class="btn small" [class.on]="showPractice()" (click)="showPractice.set(!showPractice())" [attr.aria-expanded]="showPractice()" data-testid="practice-btn">
        <app-icon name="mic" [size]="16" /> Practise
      </button>
    </div>
    @if (showExplain()) {
      <div class="lela-says" data-testid="explain-box">
        <p class="who">Lela</p>
        <p data-testid="explain-text">{{ explanation }}</p>
        @if (tamil) { <p lang="ta" class="small">{{ tamil }}</p> }
        <button type="button" class="btn small" (click)="lela.playSample(explanation)" [disabled]="!lela.canSpeak" data-testid="explain-play">
          <app-icon name="replay" [size]="16" /> Hear Lela explain
        </button>
        @if (!lela.canSpeak) { <p class="small">This browser cannot speak aloud, so read the explanation above.</p> }
      </div>
    }
    @if (showPractice()) {
      <div class="practice" data-testid="practice-box">
        <p class="small">Say or type: <b>“{{ target }}”</b></p>
        <app-voice-input placeholder="Type the sentence here…" (heard)="onHeard($event)" />
        <app-feedback-panel [feedback]="feedback()" />
      </div>
    }
  `,
  styles: `
    .tools { margin-top: 6px; flex-wrap: wrap; } .btn.on { background: var(--primary-soft); border-color: var(--primary); }
    .lela-says { background: var(--primary-tint); border: 1px solid var(--border); border-radius: 14px; padding: 10px 14px; margin-top: 8px; overflow-wrap: anywhere; }
    .lela-says p { margin: 4px 0; } .who { font-size: .75rem; font-weight: 700; color: var(--primary); }
    .practice { margin-top: 8px; }
  `,
})
export class StudyToolsComponent {
  readonly lela = inject(LelaConversationService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly progress = inject(ProgressService);

  /** What the learner should say when practising. */
  @Input({ required: true }) target = '';
  /** What Lela explains (English, read aloud). */
  @Input({ required: true }) explanation = '';
  /** The Tamil meaning shown under the explanation. */
  @Input() tamil = '';

  readonly showExplain = signal(false);
  readonly showPractice = signal(false);
  readonly feedback = signal<SpeakingFeedback | null>(null);

  async onHeard(heard: string): Promise<void> {
    this.feedback.set(await this.feedbackService.analyse(heard, this.target));
    this.progress.recordSpeaking();
  }
}
