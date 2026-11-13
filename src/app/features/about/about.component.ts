import { Component, HostListener, inject, signal } from '@angular/core';
import { FeedbackService } from '../../core/feedback.service';
import { ProgressService } from '../../core/progress.service';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <h1>Settings &amp; about</h1>

    <section class="card">
      <h2>Settings</h2>
      <label class="line">Speaking speed: <strong>{{ progress.settings().speechRate.toFixed(1) }}×</strong>
        <input type="range" min="0.5" max="1.4" step="0.1" [value]="progress.settings().speechRate" (input)="setRate($event)" aria-label="Speaking speed" />
      </label>
      <label class="line check"><input type="checkbox" [checked]="progress.settings().showTamil" (change)="toggleTamil($event)" /> Show Tamil meanings</label>
    </section>

    <section class="card">
      <h2>What kind of checking does this app do?</h2>
      <p><strong>📏 Rule-based (this app):</strong> {{ feedback.ruleCount }} grammar rules and a list of natural phrases, written by hand. It runs on your device, works offline, costs nothing, and gives the same answer every time. It is <strong>not AI</strong>. It knows only common beginner mistakes, so it can miss errors and it can be wrong.</p>
      <p><strong>🤖 AI-powered:</strong> not included. An AI checker would need an internet service (usually paid) and is not used for any learning feature here. If it is ever added, its results will carry a separate “AI-powered” label.</p>
      <h3>What the grammar checker cannot do</h3>
      <ul>
        @for (note of feedback.limitations; track note.english) {
          <li>{{ note.english }} <span class="small block" lang="ta">{{ note.tamil }}</span></li>
        }
      </ul>
    </section>

    <section class="card">
      <h2>Your device</h2>
      <ul>
        <li>Speaking aloud (listen buttons): {{ speech.synthesisSupported ? 'available ✓' : 'not available in this browser' }}</li>
        <li>Voice input (microphone): {{ speech.recognitionIssue ? speech.recognitionIssue : 'available ✓ (needs internet, Chrome or Edge)' }}</li>
        <li>Saving progress: {{ progress.storageHealthy() ? 'working ✓' : 'blocked by the browser ✗' }}</li>
        <li>Connection: {{ online() ? 'online' : 'offline' }}</li>
      </ul>
      <p class="small">Words, sentences, grammar and role-plays are stored in the app and work offline after they have been opened once. Voice input always needs internet in the browser.</p>
    </section>

    <section class="card">
      <h2>Reset</h2>
      <p class="small">Deletes your favourites, revision schedule, scores and lessons from this device.</p>
      @if (!confirming()) {
        <button type="button" class="btn" (click)="confirming.set(true)">Reset my progress…</button>
      } @else {
        <p class="notice warn">Are you sure? This cannot be undone. Download a backup first on the Progress page.</p>
        <div class="row">
          <button type="button" class="btn" (click)="confirming.set(false)">Cancel</button>
          <button type="button" class="btn danger" (click)="reset()">Yes, delete everything</button>
        </div>
      }
    </section>
  `,
  styles: `
    .line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 10px 0; } .line input[type=range] { flex: 1; min-width: 140px; }
    .check { min-height: 44px; } ul { padding-left: 18px; } li { margin-bottom: 6px; } .block { display: block; } h3 { font-size: 1rem; }
    .btn.danger { background: #e03131; color: #fff; border-color: #e03131; }
  `,
})
export class AboutComponent {
  readonly progress = inject(ProgressService);
  readonly feedback = inject(FeedbackService);
  readonly speech = inject(SpeechService);
  readonly confirming = signal(false);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  @HostListener('window:online') goOnline(): void { this.online.set(true); }
  @HostListener('window:offline') goOffline(): void { this.online.set(false); }

  setRate(event: Event): void {
    this.progress.updateSettings({ speechRate: Number((event.target as HTMLInputElement).value) });
  }

  toggleTamil(event: Event): void {
    this.progress.updateSettings({ showTamil: (event.target as HTMLInputElement).checked });
  }

  reset(): void {
    this.progress.reset();
    this.confirming.set(false);
  }
}
