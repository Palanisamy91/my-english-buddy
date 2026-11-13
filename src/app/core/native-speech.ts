import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { AndroidSettings, NativeSettings } from 'capacitor-native-settings';
import { nativeErrorCode, outcomeAfterRequest, permissionPlan, toMicPermission, type MicPermissionLike } from './native-mic';

/**
 * Speech input inside the Android app (Capacitor).
 * Android's WebView has no browser speech recognition, so the app uses the device's own recogniser through the
 * @capacitor-community/speech-recognition plugin. It needs the RECORD_AUDIO permission, which Android only grants after
 * the learner taps Allow in a popup. This file asks for it (never silently), checks it before listening, and reports
 * "blocked for good" so the app can send the learner to App Settings.
 */

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function nativeMicPermission(): Promise<MicPermissionLike> {
  const status = await SpeechRecognition.checkPermissions();
  return toMicPermission(status.speechRecognition);
}

/** Shows Android's microphone popup when Android allows it. Returns the permission afterwards. */
export async function requestNativeMicPermission(): Promise<MicPermissionLike> {
  const status = await SpeechRecognition.requestPermissions();
  return toMicPermission(status.speechRecognition);
}

/** Opens this app's page in Android Settings (Permissions > Microphone). Returns false if it could not be opened. */
export async function openNativeAppSettings(): Promise<boolean> {
  try {
    await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    return true;
  } catch {
    return false;
  }
}

// ---- A recogniser that looks like the browser's SpeechRecognition, so SpeechService.listen() works unchanged ----

interface AltLike { transcript: string; confidence: number }
interface ResultLike { readonly isFinal: boolean; readonly length: number; [index: number]: AltLike }
interface EventLike { resultIndex: number; results: ArrayLike<ResultLike> }

export class NativeRecognition {
  lang = 'en-IN';
  interimResults = true;
  maxAlternatives = 3;
  continuous = false;
  onstart: (() => void) | null = null;
  onresult: ((e: EventLike) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  private handles: { remove: () => Promise<void> }[] = [];
  private matches: string[] = [];
  private ended = false;
  private aborted = false;
  private stopTimer?: ReturnType<typeof setTimeout>;

  start(): void {
    void this.run();
  }

  stop(): void {
    // Ask the plugin to stop. It then reports "stopped"; if it never does, finish by ourselves.
    void SpeechRecognition.stop().catch(() => undefined);
    clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => this.finish(), 1500);
  }

  abort(): void {
    this.aborted = true;
    void SpeechRecognition.stop().catch(() => undefined);
    this.cleanup();
  }

  private async run(): Promise<void> {
    try {
      const availability = await SpeechRecognition.available();
      if (!availability.available) return this.fail('service-not-allowed');

      // 1. Check the permission BEFORE listening.
      let plan = permissionPlan((await SpeechRecognition.checkPermissions()).speechRecognition);
      if (plan === 'settings') return this.fail('not-allowed-permanent');
      // 2. Not allowed yet: show Android's popup now (this runs because the learner tapped the microphone button).
      if (plan === 'ask') {
        const after = outcomeAfterRequest((await SpeechRecognition.requestPermissions()).speechRecognition);
        if (after === 'settings') return this.fail('not-allowed-permanent');
        if (after === 'ask-again') return this.fail('not-allowed');
        plan = 'granted';
      }
      if (this.aborted) return;

      this.handles.push(
        await SpeechRecognition.addListener('partialResults', (data) => {
          this.matches = Array.isArray(data?.matches) ? data.matches.filter((m) => typeof m === 'string' && m.trim()) : [];
          this.emit(false);
        }),
        await SpeechRecognition.addListener('listeningState', (data) => {
          if (data?.status === 'started') this.onstart?.();
          if (data?.status === 'stopped') this.finish();
        })
      );
      if (this.aborted) return this.cleanup();

      await SpeechRecognition.start({ language: this.lang, maxResults: Math.min(5, this.maxAlternatives), partialResults: true, popup: false });
      this.onstart?.();
    } catch (err) {
      this.fail(nativeErrorCode(err));
    }
  }

  private emit(isFinal: boolean): void {
    if (this.aborted || this.matches.length === 0) return;
    // The plugin gives no confidence, so none is reported (the app then does not mark any words [Unclear]).
    const result: ResultLike = {
      isFinal,
      length: this.matches.length,
      ...Object.fromEntries(this.matches.map((m, i) => [i, { transcript: m, confidence: 0 }])),
    };
    this.onresult?.({ resultIndex: 0, results: [result] });
  }

  private finish(): void {
    if (this.ended) return;
    if (this.matches.length > 0) this.emit(true);
    this.ended = true;
    this.cleanup();
    this.onend?.();
  }

  private fail(code: string): void {
    if (this.ended) return;
    this.ended = true;
    this.cleanup();
    this.onerror?.({ error: code });
    this.onend?.();
  }

  private cleanup(): void {
    clearTimeout(this.stopTimer);
    for (const h of this.handles) void h.remove().catch(() => undefined);
    this.handles = [];
  }
}
