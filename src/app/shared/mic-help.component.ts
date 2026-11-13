import { Component, HostListener, inject, signal } from '@angular/core';
import { SpeechService } from '../services/speech.service';

/**
 * Shows what to do when the microphone is not allowed. Only appears when there is a permission problem.
 *  - Android app, denied once: a button that asks again (Android shows its popup).
 *  - Android app, blocked for good: a button that opens this app's Android Settings page, with the steps.
 *  - Browser: the lock-icon hint stays in the component that already shows it.
 * It re-checks the permission when the learner comes back from Settings.
 */
@Component({
  selector: 'app-mic-help',
  standalone: true,
  template: `
    @if (show()) {
      <div class="mic-help notice warn" role="alert" data-testid="mic-help">
        @if (blocked()) {
          <p><b>Microphone is turned off for this app.</b> Android will not ask again, so please allow it in Settings:</p>
          <ol>
            <li>Tap <b>Open app settings</b>.</li>
            <li>Tap <b>Permissions</b>, then <b>Microphone</b>.</li>
            <li>Choose <b>Allow only while using the app</b>, then come back here.</li>
          </ol>
          <button type="button" class="btn primary small" (click)="openSettings()" data-testid="open-settings">Open app settings</button>
          @if (settingsFailed()) { <p class="small">I could not open Settings by myself. Open your phone's Settings > Apps > My English Buddy > Permissions > Microphone.</p> }
        } @else {
          <p><b>I need the microphone to hear you.</b> Tap Allow, then choose <b>Allow</b> in Android's popup. You can also type your answer.</p>
          <button type="button" class="btn primary small" (click)="allow()" data-testid="allow-mic">Allow microphone</button>
        }
      </div>
    }
  `,
  styles: `
    .mic-help { margin: 8px 0; overflow-wrap: anywhere; } .mic-help p { margin: 4px 0; } .mic-help ol { margin: 4px 0 8px 20px; padding: 0; }
  `,
})
export class MicHelpComponent {
  private readonly speech = inject(SpeechService);
  readonly settingsFailed = signal(false);

  blocked(): boolean {
    return this.speech.lastError() === 'permission-blocked' || (this.speech.isNativeApp && this.speech.micPermission() === 'denied');
  }

  show(): boolean {
    if (!this.speech.isNativeApp) return false;
    if (this.speech.micPermission() === 'granted' && this.speech.lastError() !== 'permission-denied') return false;
    return this.speech.lastError() === 'permission-denied' || this.blocked();
  }

  async allow(): Promise<void> {
    try {
      const state = await this.speech.requestMicPermission();
      if (state !== 'granted') await this.speech.getMicPermission();
    } catch {
      /* the next tap on the microphone shows the message */
    }
  }

  async openSettings(): Promise<void> {
    this.settingsFailed.set(!(await this.speech.openAppSettings()));
  }

  /** Back from Android Settings: check the permission again. */
  @HostListener('document:visibilitychange')
  onVisible(): void {
    if (this.speech.isNativeApp && document.visibilityState === 'visible') {
      void this.speech.getMicPermission().then((state) => {
        if (state === 'granted') this.speech.lastError.set(null);
      });
    }
  }
}
