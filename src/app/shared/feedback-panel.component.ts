import { Component, Input } from '@angular/core';
import { verdict } from '../core/speech-compare';
import { SpeakingFeedback } from '../core/feedback.service';
import { SpeakButtonComponent } from './speak-button.component';

/** Shows the result of checking a spoken or typed sentence, and says plainly what kind of checker made it. */
@Component({
  selector: 'app-feedback-panel',
  standalone: true,
  imports: [SpeakButtonComponent],
  template: `
    @if (feedback; as f) {
      <section class="card feedback" aria-live="polite">
        <p class="badge" [class.rule]="f.kind === 'rule-based'" [class.ai]="f.kind === 'ai'">
          @if (f.kind === 'rule-based') { 📏 Rule-based check · not AI · works offline }
          @else { 🤖 AI-powered check }
        </p>

        <p class="label">I heard:</p>
        <p class="heard">“{{ f.heard }}”</p>

        @if (f.comparison; as c) {
          @let v = verdict(c.accuracy);
          <p class="label">Compared with the target sentence:</p>
          <p class="diff">
            @for (t of c.target; track $index) {
              <span class="w" [class.ok]="t.status === 'match'" [class.miss]="t.status === 'missing'">{{ t.text }}</span>&ngsp;
            }
          </p>
          <p class="score" [class]="'score ' + v.level">
            {{ (c.accuracy * 100).toFixed(0) }}% of the words · {{ v.label }}
            <span lang="ta">{{ v.tamil }}</span>
          </p>
          @if (c.extra.length > 0) {
            <p class="small">Extra words you said: <strong>{{ c.extra.join(', ') }}</strong></p>
          }
          @if (c.accuracy < 0.7) {
            <p class="small">Green = you said it. Red = missing. Speak slowly and clearly, one phrase at a time.</p>
          }
        }

        @if (f.outcome.changed) {
          <p class="label">Grammar fix:</p>
          <p class="fix">✅ <strong>{{ f.outcome.corrected }}</strong> <app-speak-button [text]="f.outcome.corrected" /></p>
          <p class="explain" lang="ta">{{ f.tamilExplanation }}</p>
        } @else {
          <p class="small">
            No mistakes found by my {{ f.outcome.rulesChecked }} simple rules. This does not prove the sentence is perfect.
          </p>
        }

        @if (f.tips.length > 0) {
          <p class="label">You could also say:</p>
          <ul class="tips">
            @for (tip of f.tips; track tip.plain) {
              <li>
                <strong>“{{ tip.plain }}”</strong> → {{ tip.better.join(' / ') }}
                <span class="small block">{{ tip.exampleBefore }} → <em>{{ tip.exampleAfter }}</em></span>
                <span class="small block" lang="ta">{{ tip.tamil }}</span>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: `
    .heard { font-size: 1.05rem; margin: 2px 0 10px; }
    .diff { margin: 4px 0; line-height: 2; }
    .w { padding: 2px 6px; border-radius: 6px; margin-right: 4px; }
    .w.ok { background: #d3f9d8; color: #1b5e20; }
    .w.miss { background: #ffe3e3; color: #b71c1c; text-decoration: underline wavy; }
    .score { font-weight: 700; margin: 6px 0; }
    .score.great { color: #1b7a2b; } .score.good { color: #8a6100; } .score.retry { color: #b71c1c; }
    .fix { margin: 2px 0; } .explain { white-space: pre-line; background: var(--primary-tint); padding: 8px 10px; border-radius: 8px; }
    .tips { padding-left: 18px; margin: 4px 0; } .tips li { margin-bottom: 8px; } .block { display: block; }
  `,
})
export class FeedbackPanelComponent {
  @Input() feedback: SpeakingFeedback | null = null;
  protected readonly verdict = verdict;
}
