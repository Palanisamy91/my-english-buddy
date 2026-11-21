import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../core/data.service';
import { FeedbackService, SpeakingFeedback } from '../../core/feedback.service';
import { LessonService } from '../../core/lesson.service';
import { ProgressService } from '../../core/progress.service';
import { ContentCategory, Sentence } from '../../models/learning.models';
import { FeedbackPanelComponent } from '../../shared/feedback-panel.component';
import { SpeakButtonComponent } from '../../shared/speak-button.component';
import { VoiceInputComponent } from '../../shared/voice-input.component';
import { CorrectionFlowComponent } from './correction-flow.component';
import { RoleplayComponent } from './roleplay.component';

type Mode = 'correct' | 'repeat' | 'free' | 'roleplay';

const FREE_TOPICS = [
  'Tell me about your day.',
  'Describe your current project.',
  'What did you do last weekend?',
  'What are your plans for next month?',
  'Why do you want to improve your English?',
  'Explain a problem you solved at work.',
];

@Component({
  selector: 'app-speaking',
  standalone: true,
  imports: [CorrectionFlowComponent, FeedbackPanelComponent, RoleplayComponent, SpeakButtonComponent, VoiceInputComponent],
  template: `
    <h1>Speaking practice</h1>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" class="tab" [class.on]="mode() === 'correct'" (click)="setMode('correct')">✍️ Speak &amp; correct</button>
      <button type="button" role="tab" class="tab" [class.on]="mode() === 'repeat'" (click)="setMode('repeat')">🔁 Repeat a sentence</button>
      <button type="button" role="tab" class="tab" [class.on]="mode() === 'free'" (click)="setMode('free')">🗣️ Free speaking</button>
      <button type="button" role="tab" class="tab" [class.on]="mode() === 'roleplay'" (click)="setMode('roleplay')">🎭 Role-play</button>
    </div>

    <p class="card small">
      Checks are <strong>rule-based</strong>: fixed written rules and phrase lists, no AI. They catch common mistakes only.
      Voice input needs internet and Chrome or Edge; typing always works.
    </p>

    @switch (mode()) {
      @case ('correct') {
        <app-correction-flow />
      }
      @case ('repeat') {
        @if (loading()) {
          <p class="card">Loading a sentence…</p>
        } @else if (error()) {
          <p class="card notice warn" role="alert">{{ error() }} <button type="button" class="btn small" (click)="loadTarget()">Try again</button></p>
        } @else if (target(); as t) {
          <section class="card">
            <p class="small">{{ t.context }}</p>
            <p class="big">“{{ t.en }}” <app-speak-button [text]="t.en" label="Listen" /></p>
            @if (progress.settings().showTamil) { <p lang="ta">{{ t.tamil }}</p> }
            @if (t.alt; as alt) {
              <p class="small">Simple alternative: “{{ alt.en }}” <app-speak-button [text]="alt.en" /></p>
            }
            <app-voice-input placeholder="Or type the sentence…" (heard)="onHeard($event, t.en)" />
          </section>
          <app-feedback-panel [feedback]="feedback()" />
          <div class="row">
            <button type="button" class="btn" (click)="newTarget()">🎲 Another sentence</button>
          </div>
        }
      }
      @case ('free') {
        <section class="card">
          <p class="label">Topic:</p>
          <p class="big">{{ topic() }} <app-speak-button [text]="topic()" /></p>
          <button type="button" class="btn small" (click)="nextTopic()">Another topic</button>
          <app-voice-input placeholder="Type what you want to say…" (heard)="onHeard($event)" />
        </section>
        <app-feedback-panel [feedback]="feedback()" />
      }
      @case ('roleplay') {
        <app-roleplay />
      }
    }
  `,
  styles: `
    .tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 10px; }
    .tab { white-space: nowrap; padding: 10px 14px; border: 1px solid var(--border); background: #fff; border-radius: 10px; min-height: 44px; }
    .tab.on { background: var(--primary); color: #fff; border-color: var(--primary); } .big { font-size: 1.25rem; margin: 6px 0; }
  `,
})
export class SpeakingComponent implements OnInit {
  readonly progress = inject(ProgressService);
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(DataService);
  private readonly lessons = inject(LessonService);
  private readonly feedbackService = inject(FeedbackService);

  readonly mode = signal<Mode>('correct');
  readonly target = signal<Sentence | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly feedback = signal<SpeakingFeedback | null>(null);
  readonly topic = signal(FREE_TOPICS[0]);

  private topicIndex = 0;
  private categories: ContentCategory[] = [];

  ngOnInit(): void {
    const requested = this.route.snapshot.queryParamMap.get('sentence');
    const startMode = this.route.snapshot.queryParamMap.get('mode');
    if (startMode === 'roleplay' || startMode === 'free' || startMode === 'repeat') this.mode.set(startMode);
    else if (requested) this.mode.set('repeat'); // opened from the sentence library to practise one sentence
    void this.loadTarget(requested);
  }

  setMode(mode: Mode): void {
    this.mode.set(mode);
    this.feedback.set(null);
  }

  async loadTarget(id?: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (id && /^[a-z]{2}\d{3}$/.test(id)) {
        const [found] = await this.data.sentencesByIds([id]);
        if (found) {
          this.target.set(found);
          return;
        }
      }
      const lesson = await this.lessons.today();
      this.target.set(lesson.sentences[0] ?? null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load a sentence.');
    } finally {
      this.loading.set(false);
    }
  }

  /** A random sentence from a random group (only that group's file is loaded). */
  async newTarget(): Promise<void> {
    this.feedback.set(null);
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.categories.length === 0) this.categories = (await this.data.manifest()).sentenceCategories;
      const category = this.categories[Math.floor(Math.random() * this.categories.length)];
      const list = (await this.data.sentences(category.id)).filter((s) => s.en.split(' ').length <= 14);
      this.target.set(list[Math.floor(Math.random() * list.length)] ?? null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load a sentence.');
    } finally {
      this.loading.set(false);
    }
  }

  nextTopic(): void {
    this.topicIndex = (this.topicIndex + 1) % FREE_TOPICS.length;
    this.topic.set(FREE_TOPICS[this.topicIndex]);
    this.feedback.set(null);
  }

  async onHeard(heard: string, target?: string): Promise<void> {
    this.feedback.set(await this.feedbackService.analyse(heard, target));
    this.progress.recordSpeaking();
  }
}
