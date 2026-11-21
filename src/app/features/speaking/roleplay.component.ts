import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DataService } from '../../core/data.service';
import { FeedbackService, SpeakingFeedback } from '../../core/feedback.service';
import { ProgressService } from '../../core/progress.service';
import { closestOption } from '../../core/speech-compare';
import { Roleplay } from '../../models/learning.models';
import { FeedbackPanelComponent } from '../../shared/feedback-panel.component';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { VoiceInputComponent } from '../../shared/voice-input.component';
import { SpeechService } from '../../services/speech.service';

interface Line {
  who: 'partner' | 'you';
  text: string;
  tamil?: string;
}

const GROUPS: { id: Roleplay['group']; label: string }[] = [
  { id: 'office-meeting', label: '🏢 Office meetings' },
  { id: 'interview', label: '💼 Interviews' },
  { id: 'everyday', label: '🏠 Everyday situations' },
];

@Component({
  selector: 'app-roleplay',
  standalone: true,
  imports: [FeedbackPanelComponent, SpeakButtonComponent, VoiceInputComponent],
  template: `
    @if (loading()) {
      <p class="card">Loading role-plays…</p>
    } @else if (error()) {
      <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="load()">Try again</button></p>
    } @else if (!active()) {
      @for (g of groups; track g.id) {
        <h2>{{ g.label }}</h2>
        @for (r of byGroup(g.id); track r.id) {
          <button type="button" class="card pick" (click)="start(r)">
            <strong>{{ r.title }}</strong> <span class="badge">{{ r.level }}</span>
            <span class="small block" lang="ta">{{ r.titleTamil }}</span>
            <span class="small block">{{ r.setting }}</span>
          </button>
        }
      }
    } @else {
      @let rp = active()!;
      <section class="card">
        <h2>{{ rp.title }}</h2>
        <p class="small">{{ rp.setting }}</p>
        @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ rp.settingTamil }}</p> }
      </section>

      <section class="chat" aria-live="polite">
        @for (line of lines(); track $index) {
          <div class="bubble" [class.you]="line.who === 'you'">
            <span class="who">{{ line.who === 'you' ? 'You' : 'Partner' }}</span>
            <p>{{ line.text }} @if (line.who === 'partner') { <app-speak-button [text]="line.text" /> }</p>
            @if (line.tamil && progress.settings().showTamil) { <p class="small" lang="ta">{{ line.tamil }}</p> }
          </div>
        }
      </section>

      @if (finished()) {
        <section class="card center">
          <h2>🎉 Role-play finished</h2>
          <p class="small">Try it again with different replies, or pick another situation.</p>
          <div class="row"><button type="button" class="btn primary" (click)="start(rp)">Play again</button><button type="button" class="btn" (click)="leave()">All role-plays</button></div>
        </section>
      } @else {
        @if (!answered()) {
          <section class="card">
            <p class="label">Your turn. Say one of these, or your own words:</p>
            @for (r of replies(); track r.en; let i = $index) {
              <div class="option">
                <p>{{ i === 0 ? '⭐ ' : '' }}“{{ r.en }}” <app-speak-button [text]="r.en" /></p>
                @if (progress.settings().showTamil) { <p class="small" lang="ta">{{ r.tamil }}</p> }
                <button type="button" class="btn small" (click)="answer(r.en)">Use this reply</button>
              </div>
            }
            <app-voice-input placeholder="Type your reply…" (heard)="answer($event)" />
          </section>
        } @else {
          <app-feedback-panel [feedback]="feedback()" />
          @if (tip()) { <p class="card small" lang="ta">💡 {{ tip() }}</p> }
          <button type="button" class="btn primary" (click)="next()">Continue</button>
        }
      }
      <button type="button" class="btn small" (click)="leave()">← All role-plays</button>
    }
  `,
  styles: `
    .pick { display: block; width: 100%; text-align: left; background: #fff; border: 1px solid var(--border); } .block { display: block; }
    .chat { display: grid; gap: 8px; margin: 10px 0; } .bubble { background: #fff; border-radius: 12px; padding: 8px 12px; max-width: 92%; box-shadow: 0 1px 2px #0002; }
    .bubble.you { background: var(--primary-soft); justify-self: end; } .bubble p { margin: 2px 0; } .who { font-size: .75rem; color: #495057; font-weight: 700; }
    .option { border-top: 1px solid var(--border); padding: 8px 0; } .center { text-align: center; }
  `,
})
export class RoleplayComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly data = inject(DataService);
  private readonly feedbackService = inject(FeedbackService);
  private readonly speech = inject(SpeechService);

  readonly groups = GROUPS;
  readonly all = signal<Roleplay[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly active = signal<Roleplay | null>(null);
  readonly turn = signal(0);
  readonly lines = signal<Line[]>([]);
  readonly answered = signal(false);
  readonly feedback = signal<SpeakingFeedback | null>(null);
  readonly tip = signal('');

  readonly replies = computed(() => this.active()?.turns[this.turn()]?.replies ?? []);
  readonly finished = computed(() => {
    const rp = this.active();
    return !!rp && this.replies().length === 0 && this.lines().length > 0;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.data.roleplays());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the role-plays.');
    } finally {
      this.loading.set(false);
    }
  }

  byGroup(group: Roleplay['group']): Roleplay[] {
    return this.all().filter((r) => r.group === group);
  }

  start(rp: Roleplay): void {
    this.active.set(rp);
    this.turn.set(0);
    this.lines.set([]);
    this.feedback.set(null);
    this.tip.set('');
    this.answered.set(false);
    this.sayPartner();
  }

  leave(): void {
    this.speech.stopSpeaking();
    this.active.set(null);
  }

  async answer(text: string): Promise<void> {
    const rp = this.active();
    if (!rp || this.answered()) return;
    const options = this.replies();
    const index = closestOption(options.map((o) => o.en), text, 0.5);
    const target = index >= 0 ? options[index].en : undefined;
    this.lines.update((l) => [...l, { who: 'you', text }]);
    this.feedback.set(await this.feedbackService.analyse(text, target));
    this.tip.set(rp.turns[this.turn()]?.tipTamil ?? '');
    this.answered.set(true);
    this.progress.recordSpeaking();
  }

  next(): void {
    this.turn.update((t) => t + 1);
    this.answered.set(false);
    this.feedback.set(null);
    this.tip.set('');
    this.sayPartner();
  }

  private sayPartner(): void {
    const rp = this.active();
    const turn = rp?.turns[this.turn()];
    if (!turn) return;
    this.lines.update((l) => [...l, { who: 'partner', text: turn.partner.en, tamil: turn.partner.tamil }]);
    if (this.speech.synthesisSupported) {
      this.speech.speak(turn.partner.en, { rate: this.progress.settings().speechRate }).subscribe({ error: () => undefined });
    }
  }
}
