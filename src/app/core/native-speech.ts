import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { AndroidSettings, NativeSettings } from 'capacitor-native-settings';
import {
  nativeErrorCode,
  outcomeAfterRequest,
  permissionPlan,
  toMicPermission,
  type MicPermissionLike
} from './native-mic';

/** True only when the Angular app is running inside a Capacitor native shell. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Reads the current Android microphone permission without showing a popup. */
export async function nativeMicPermission(): Promise<MicPermissionLike> {
  const status = await SpeechRecognition.checkPermissions();
  return toMicPermission(status.speechRecognition);
}

/** Requests Android microphone permission after a user action. */
export async function requestNativeMicPermission(): Promise<MicPermissionLike> {
  const status = await SpeechRecognition.requestPermissions();
  return toMicPermission(status.speechRecognition);
}

/** Opens this app's Android settings page so the learner can enable microphone permission. */
export async function openNativeAppSettings(): Promise<boolean> {
  try {
    await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    return true;
  } catch {
    return false;
  }
}

// A small adapter that makes the Capacitor recogniser look like the browser
// SpeechRecognition API expected by SpeechService.
interface AltLike {
  transcript: string;
  confidence: number;
}
interface ResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: AltLike;
}
interface EventLike {
  resultIndex: number;
  results: ArrayLike<ResultLike>;
}

export class NativeRecognition {
  lang = 'en-IN';
  interimResults = true;
  maxAlternatives = 3;
  continuous = false;

  onstart: (() => void) | null = null;
  onresult: ((event: EventLike) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  private handles: Array<{ remove: () => Promise<void> }> = [];
  private matches: string[] = [];
  private ended = false;
  private aborted = false;
  private started = false;
  private startSignalled = false;
  private stopTimer?: ReturnType<typeof setTimeout>;

  /** Starts one native recognition session. The caller may start another after onend. */
  start(): void {
    if (!this.ended && this.started) return;
    this.ended = false;
    this.aborted = false;
    this.started = true;
    this.startSignalled = false;
    this.matches = [];
    void this.run();
  }

  /** Stops the current phrase and returns its latest recognised text as final. */
  stop(): void {
    if (this.ended || this.aborted) return;
    clearTimeout(this.stopTimer);
    void SpeechRecognition.stop().catch(() => undefined);
    // Some Android recognition services fail to send the stopped event.
    this.stopTimer = setTimeout(() => this.finish(), 1800);
  }

  /** Cancels without delivering a final transcript. */
  abort(): void {
    if (this.ended || this.aborted) return;
    this.aborted = true;
    clearTimeout(this.stopTimer);
    void SpeechRecognition.stop().catch(() => undefined);
    this.cleanup();
  }

  private async run(): Promise<void> {
    try {
      const availability = await SpeechRecognition.available();
      if (this.aborted || this.ended) return;
      if (!availability.available) return this.fail('service-not-allowed');

      const before = (await SpeechRecognition.checkPermissions()).speechRecognition;
      if (this.aborted || this.ended) return;
      const plan = permissionPlan(before);
      if (plan === 'settings') return this.fail('not-allowed-permanent');

      if (plan === 'ask') {
        const after = (await SpeechRecognition.requestPermissions()).speechRecognition;
        if (this.aborted || this.ended) return;
        const outcome = outcomeAfterRequest(after);
        if (outcome === 'settings') return this.fail('not-allowed-permanent');
        if (outcome === 'ask-again') return this.fail('not-allowed');
      }

      const partialHandle = await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
        if (this.aborted || this.ended) return;
        // `matches` are alternative hypotheses for the SAME phrase, not separate chunks.
        // Keep the latest set; SpeechService/transcript.ts chooses one alternative.
        this.matches = Array.isArray(data?.matches)
          ? data.matches.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [];
        this.emit(false);
      });
      this.handles.push(partialHandle);

      const stateHandle = await SpeechRecognition.addListener('listeningState', (data: { status?: string }) => {
        if (this.aborted || this.ended) return;
        if (data?.status === 'started') this.signalStart();
        if (data?.status === 'stopped') this.finish();
      });
      this.handles.push(stateHandle);

      if (this.aborted || this.ended) return this.cleanup();
      await SpeechRecognition.start({
        language: this.lang || 'en-IN',
        maxResults: Math.max(1, Math.min(5, this.maxAlternatives || 1)),
        partialResults: this.interimResults,
        popup: false
      });
      if (!this.aborted && !this.ended) this.signalStart();
    } catch (error) {
      if (!this.aborted && !this.ended) this.fail(nativeErrorCode(error));
    }
  }

  private signalStart(): void {
    if (this.started && !this.ended && !this.startSignalled) {
      this.startSignalled = true;
      this.onstart?.();
    }
  }

  private emit(isFinal: boolean): void {
    if (this.aborted || this.ended || this.matches.length === 0) return;
    const result: ResultLike = {
      isFinal,
      length: this.matches.length,
      ...Object.fromEntries(
        this.matches.slice(0, Math.max(1, this.maxAlternatives)).map((transcript, index) => [
          index,
          { transcript, confidence: 0 }
        ])
      )
    };
    this.onresult?.({ resultIndex: 0, results: [result] });
  }

  private finish(): void {
    if (this.ended || this.aborted) return;
    clearTimeout(this.stopTimer);
    if (this.matches.length) this.emit(true);
    this.ended = true;
    this.cleanup();
    this.onend?.();
  }

  private fail(code: string): void {
    if (this.ended || this.aborted) return;
    this.ended = true;
    this.cleanup();
    this.onerror?.({ error: code });
    this.onend?.();
  }

  private cleanup(): void {
    clearTimeout(this.stopTimer);
    const handles = this.handles.splice(0);
    for (const handle of handles) void handle.remove().catch(() => undefined);
  }
}
