import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProgressService } from '../core/progress.service';
import { SpeechService } from '../services/speech.service';
import { IconComponent } from './icon.component';

/** A small "listen" button: reads the text aloud with the browser's voice (works offline if the device has a voice). */
@Component({
  selector: 'app-speak-button',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (speech.synthesisSupported) {
      <button
        type="button"
        class="btn"
        [class.small]="!primary"
        [class.primary]="primary"
        [class.on]="speaking() && !primary"
        (click)="toggle()"
        [attr.aria-label]="speaking() ? 'Stop' : 'Listen: ' + text"
      >
        <app-icon [name]="speaking() ? 'stop' : 'volume'" [size]="18" />@if (label) {<span>{{ speaking() && primary ? 'Stop' : label }}</span>}
      </button>
    }
  `,
})
export class SpeakButtonComponent implements OnDestroy {
  readonly speech = inject(SpeechService);
  private readonly progress = inject(ProgressService);

  @Input({ required: true }) text = '';
  @Input() label = '';
  /** A larger, highlighted button for the main action of a screen. */
  @Input() primary = false;
  /** Fires with a readable message when the browser could not speak the text. */
  @Output() readonly failed = new EventEmitter<string>();

  readonly speaking = signal(false);
  private sub?: Subscription;

  toggle(): void {
    if (this.speaking()) {
      this.stop();
      return;
    }
    this.speaking.set(true);
    this.failed.emit('');
    this.sub?.unsubscribe();
    this.sub = this.speech.speak(this.text, { rate: this.progress.settings().speechRate }).subscribe({
      error: (err: Error) => {
        this.speaking.set(false);
        this.failed.emit(err.message);
      },
      complete: () => this.speaking.set(false),
    });
  }

  private stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
    this.speech.stopSpeaking();
    this.speaking.set(false);
  }

  ngOnDestroy(): void {
    if (this.speaking()) this.stop();
  }
}
