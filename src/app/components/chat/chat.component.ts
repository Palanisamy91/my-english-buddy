import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../shared/icon.component';
import { MicHelpComponent } from '../../shared/mic-help.component';
import { ChatMessage, CorrectionResult } from '../../models/chat.models';
import { CorrectionService } from '../../services/correction.service';
import { SpeechService } from '../../services/speech.service';
import { TamilTranslationService } from '../../services/tamil-translation.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [IconComponent, MicHelpComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements AfterViewChecked, OnDestroy {
  readonly speech = inject(SpeechService);
  private readonly correction = inject(CorrectionService);
  private readonly translator = inject(TamilTranslationService);

  @ViewChild('scrollBox') private scrollBox?: ElementRef<HTMLDivElement>;

  readonly messages = signal<ChatMessage[]>([]);
  readonly speakingId = signal<number | null>(null);
  readonly errorMessage = signal('');

  // Information about the grammar checker, shown in the "How the checker works" panel.
  readonly showInfo = signal(false);
  readonly limitations = this.correction.limitations;
  readonly ruleCount = this.correction.ruleCount;

  private nextId = 1;
  private questionIndex = 0;
  private scrollPending = false;
  private listenSub?: Subscription;
  private speakSub?: Subscription;

  private readonly questions = [
    'What did you do today?',
    'Tell me about your family.',
    'What is your favourite food?',
    'What are your plans for the weekend?',
    'Why do you want to learn English?',
  ];

  constructor() {
    this.startConversation();
    // Read the current microphone permission (does not show a prompt).
    void this.speech.getMicPermission();
  }

  /** Runs after Angular has drawn the view, so the newest message is already on screen. */
  ngAfterViewChecked(): void {
    if (!this.scrollPending) {
      return;
    }
    this.scrollPending = false;
    const box = this.scrollBox?.nativeElement;
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }

  // ---------- Microphone: start / stop / cancel ----------

  /** One button: start listening, or stop and use what was heard so far. */
  toggleMic(): void {
    const state = this.speech.listenState();
    if (state === 'listening') {
      this.speech.stopListening();
    } else if (state === 'starting') {
      this.cancelListening();
    } else {
      this.startListening();
    }
  }

  /** Stops listening and throws away what was heard. */
  cancelListening(): void {
    this.listenSub?.unsubscribe();
    this.listenSub = undefined;
  }

  /** Shown when the microphone is blocked: asks the browser again. */
  async enableMic(): Promise<void> {
    this.errorMessage.set('');
    try {
      const result = await this.speech.requestMicPermission();
      if (result === 'denied') {
        this.errorMessage.set(
          'The microphone is still blocked. Tap the lock icon in the address bar, set Microphone to Allow, then reload the page.'
        );
      } else if (result !== 'granted') {
        this.errorMessage.set('Your browser did not show a permission prompt. Tap the microphone button to try again.');
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Could not use the microphone.');
    }
  }

  private startListening(): void {
    // Stop any spoken audio so the microphone does not hear the speaker.
    this.stopSpeaking();

    this.errorMessage.set('');
    this.listenSub?.unsubscribe();
    this.listenSub = this.speech.listen('en-IN').subscribe({
      next: (event) => {
        if (event.isFinal && event.transcript.trim()) {
          this.handleUserSentence(event.transcript);
        }
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  // ---------- Typing ----------

  /** Called when the form is submitted (Enter, or the Send button). */
  onSubmit(event: Event, input: HTMLInputElement): void {
    event.preventDefault(); // stop the browser from reloading the page
    this.send(input);
  }

  send(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (!value) {
      return;
    }
    input.value = '';
    this.errorMessage.set('');
    this.handleUserSentence(value);
  }

  // ---------- Speak button ----------

  textToSpeak(message: ChatMessage): string {
    return message.correctedText ?? message.text;
  }

  toggleSpeak(message: ChatMessage): void {
    if (this.speakingId() === message.id) {
      this.stopSpeaking();
      return;
    }

    if (this.speech.isListening()) {
      this.cancelListening();
    }

    this.speakSub?.unsubscribe();
    this.errorMessage.set('');
    this.speakingId.set(message.id);
    this.speakSub = this.speech.speak(this.textToSpeak(message)).subscribe({
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.clearSpeaking(message.id);
      },
      complete: () => this.clearSpeaking(message.id),
    });
  }

  private stopSpeaking(): void {
    this.speakSub?.unsubscribe();
    this.speakSub = undefined;
    this.speech.stopSpeaking();
    this.speakingId.set(null);
  }

  // ---------- Tamil translation ----------

  toggleTranslation(message: ChatMessage): void {
    if (message.translation) {
      this.updateMessage(message.id, { translation: undefined });
      return;
    }
    const translation = this.translator.translate(this.textToSpeak(message));
    this.updateMessage(message.id, { translation });
  }

  // ---------- Chat ----------

  clearChat(): void {
    this.cancelListening();
    this.stopSpeaking();
    this.errorMessage.set('');
    this.questionIndex = 0;
    this.messages.set([]);
    this.startConversation();
  }

  ngOnDestroy(): void {
    this.cancelListening();
    this.stopSpeaking();
  }

  private startConversation(): void {
    this.addMessage({
      sender: 'assistant',
      text: 'Hello! I am your English buddy. Say or type a sentence and I will check it.',
    });
    this.addMessage({ sender: 'assistant', text: this.questions[0] });
  }

  private handleUserSentence(raw: string): void {
    const text = raw.trim();
    if (!text) {
      return;
    }

    this.addMessage({ sender: 'user', text });

    let result: CorrectionResult;
    try {
      result = this.correction.check(text);
    } catch {
      this.addMessage({
        sender: 'assistant',
        text: 'Sorry, I could not check that sentence. Please try a different one.',
      });
      return;
    }

    if (result.hasMistakes) {
      this.addMessage({
        sender: 'assistant',
        text: 'Good try! Here is the corrected sentence:',
        correctedText: result.corrected,
        tamilExplanation: this.buildTamilExplanation(result),
      });
    } else {
      this.addMessage({
        sender: 'assistant',
        text:
          `I found no mistakes using my ${result.rulesChecked} simple rules. ` +
          'This does not prove your sentence is perfect.',
      });
    }

    this.questionIndex = (this.questionIndex + 1) % this.questions.length;
    this.addMessage({ sender: 'assistant', text: this.questions[this.questionIndex] });
  }

  /** For each rule that fired: what changed (found → replacement), then the Tamil explanation. */
  private buildTamilExplanation(result: CorrectionResult): string {
    return result.issues
      .map((issue) => {
        const changes = issue.changes.map((c) => `${c.found} → ${c.replacement}`).join(', ');
        return `• ${changes}\n${issue.tamil}`;
      })
      .join('\n\n');
  }

  private addMessage(partial: Omit<ChatMessage, 'id'>): void {
    this.messages.update((list) => [...list, { id: this.nextId++, ...partial }]);
    this.scrollPending = true;
  }

  private updateMessage(id: number, changes: Partial<ChatMessage>): void {
    this.messages.update((list) => list.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }

  private clearSpeaking(id: number): void {
    // Only clear if this message is still the one marked as speaking.
    if (this.speakingId() === id) {
      this.speakingId.set(null);
    }
  }
}
