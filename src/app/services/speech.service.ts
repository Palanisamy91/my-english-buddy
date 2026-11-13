import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Observable, type TeardownLogic } from 'rxjs';
import { NativeRecognition, isNativeApp, nativeMicPermission, openNativeAppSettings, requestNativeMicPermission } from '../core/native-speech';
import { buildTranscript, type RawAlternative, type RawResult, type Transcript } from '../core/transcript';

// ---------- Public types ----------

export type SpeechErrorCode =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  /** Android will not show the permission popup any more: the learner must allow the microphone in App Settings. */
  | 'permission-blocked'
  | 'no-microphone'
  | 'no-speech'
  | 'network'
  | 'busy'
  | 'audio'
  | 'unknown';

/** An error with a friendly, ready-to-display message. */
export class SpeechError extends Error {
  constructor(
    readonly code: SpeechErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SpeechError';
  }
}

export type MicPermission = 'unknown' | 'prompt' | 'granted' | 'denied';
export type ListenState = 'idle' | 'starting' | 'listening';

export interface RecognitionEvent {
  /**
   * isFinal = false: everything heard so far in this session, including text that may still change.
   * isFinal = true: the final text of the session (all final results joined, duplicates removed, no [Unclear] markers).
   */
  transcript: string;
  /** false = live partial text while the user is still speaking. */
  isFinal: boolean;
  /** The same final text, but with [Unclear] where the engine was very unsure. Only on final events. */
  marked?: string;
  /** True when part of the final text was shown as [Unclear] or the engine reported low confidence. */
  uncertain?: boolean;
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  /** 0 to 1. */
  volume?: number;
  /** Use this exact voice instead of the first voice that matches `lang`. */
  voice?: SpeechSynthesisVoice | null;
}

// ---------- Minimal typing for the browser recognition object ----------

interface RecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface RecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternativeLike;
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function isSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    !!window.speechSynthesis &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly zone = inject(NgZone);

  // ---------- Support (checked once: it cannot change while the page is open) ----------

  readonly synthesisSupported: boolean = isSynthesisSupported();
  /** True inside the Android app (voice input then uses the device's recogniser and Android's permission popup). */
  readonly isNativeApp: boolean = isNativeApp();
  /** A friendly reason why voice input cannot be used, or null if it can. */
  readonly recognitionIssue: string | null = this.getRecognitionProblem()?.message ?? null;
  readonly recognitionSupported: boolean = this.recognitionIssue === null;

  // ---------- State (signals the UI can read) ----------

  readonly listenState = signal<ListenState>('idle');
  readonly isListening = computed(() => this.listenState() !== 'idle');
  /** Live partial text while the user is speaking. */
  /** Live text of the current listening session: final text so far plus the part that may still change. */
  readonly interim = signal('');
  /** Only the FINAL text heard so far in the current session (with [Unclear] markers). Interim text is not in it. */
  readonly heardFinal = signal('');
  readonly speaking = signal(false);
  /** false while the device is offline. Browser speech recognition needs internet; typing and everything else works offline. */
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly micPermission = signal<MicPermission>('unknown');
  /** The code of the latest voice-input error (null when the last try worked). The UI uses it to offer "Allow" or "Open settings". */
  readonly lastError = signal<SpeechErrorCode | null>(null);
  readonly voices = signal<SpeechSynthesisVoice[]>([]);

  private activeRecognition: SpeechRecognitionLike | null = null;
  /** Cancels the current listening session (used when a new one replaces it). */
  private cancelActiveListen: (() => void) | null = null;
  /** Kept so the browser does not garbage-collect an utterance that is still speaking. */
  private readonly liveUtterances = new Set<SpeechSynthesisUtterance>();
  private listenId = 0;
  private speakId = 0;
  private permissionWatched = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.zone.run(() => this.online.set(true)));
      window.addEventListener('offline', () => this.zone.run(() => this.online.set(false)));
    }
    this.loadVoices();
  }

  // ---------- Microphone permission ----------

  /** Reads the current permission (without prompting) and keeps it updated. */
  async getMicPermission(): Promise<MicPermission> {
    if (this.isNativeApp) {
      try {
        const state = await nativeMicPermission();
        this.zone.run(() => this.micPermission.set(state));
        return state;
      } catch {
        return 'unknown';
      }
    }
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unknown'; // the browser will ask when the microphone is first used
    }
    try {
      // The cast keeps this compiling on TypeScript versions whose PermissionName type
      // does not list "microphone".
      const status = await navigator.permissions.query({
        name: 'microphone',
      } as unknown as PermissionDescriptor);
      this.zone.run(() => this.micPermission.set(status.state));
      if (!this.permissionWatched) {
        this.permissionWatched = true;
        status.onchange = () => this.zone.run(() => this.micPermission.set(status.state));
      }
      return status.state;
    } catch {
      return 'unknown'; // Firefox and Safari do not support querying the microphone
    }
  }

  /** Asks the browser to show the microphone permission prompt. */
  async requestMicPermission(): Promise<MicPermission> {
    if (this.isNativeApp) {
      try {
        const state = await requestNativeMicPermission();
        this.zone.run(() => {
          this.micPermission.set(state);
          if (state === 'granted') this.lastError.set(null);
        });
        return state;
      } catch {
        throw this.recognitionErrorFor('start-failed');
      }
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return this.micPermission();
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // release the mic right away
      this.micPermission.set('granted');
      return 'granted';
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw this.recognitionErrorFor('audio-capture');
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        this.micPermission.set('denied');
        return 'denied';
      }
      if (name === 'NotReadableError') {
        throw this.recognitionErrorFor('busy');
      }
      throw this.recognitionErrorFor('unknown');
    }
  }

  /** Opens this app's page in Android Settings. Only inside the Android app; returns false when it could not be opened. */
  openAppSettings(): Promise<boolean> {
    return this.isNativeApp ? openNativeAppSettings() : Promise.resolve(false);
  }

  // ---------- Speech recognition (speech to text) ----------

  /**
   * Starts listening once. Emits partial results (isFinal = false) and then
   * the final sentence (isFinal = true). Unsubscribing cancels and discards.
   * Use stopListening() to stop and keep what was heard so far.
   * Only one session runs at a time: starting a new one cancels the old one.
   */
  listen(lang = 'en-IN'): Observable<RecognitionEvent> {
    return new Observable<RecognitionEvent>((subscriber): TeardownLogic => {
      const problem = this.getRecognitionProblem();
      const Ctor = this.getRecognitionCtor();
      if (problem || !Ctor) {
        subscriber.error(problem ?? this.recognitionErrorFor('unsupported'));
        return undefined;
      }

      this.cancelActiveListen?.();

      const id = ++this.listenId;
      const isCurrent = () => id === this.listenId;
      let recognition: SpeechRecognitionLike | null = null;
      let cancelled = false;
      let failed = false;
      let hadResult = false;
      /** The latest partial (not yet final) text, kept in case the browser never sends a final result. */
      let lastInterim = '';
      /** The newest transcript built from the recogniser's results (final and interim kept apart). */
      let latest: Transcript | null = null;

      const cancel = () => {
        cancelled = true;
        try {
          recognition?.abort();
        } catch {
          /* already stopped */
        }
      };
      const reset = () => {
        if (this.cancelActiveListen === cancel) {
          this.cancelActiveListen = null;
        }
        if (isCurrent()) {
          this.listenState.set('idle');
          this.interim.set('');
          this.heardFinal.set('');
          if (this.activeRecognition === recognition) {
            this.activeRecognition = null;
          }
        }
      };
      const fail = (err: SpeechError) => {
        if (failed) {
          return;
        }
        failed = true;
        this.zone.run(() => this.lastError.set(err.code));
        reset();
        subscriber.error(err);
      };

      this.cancelActiveListen = cancel;
      this.listenState.set('starting');
      this.lastError.set(null);

      void this.getMicPermission().then((permission) => {
        if (cancelled) {
          return;
        }
        try {
          if (permission === 'denied') {
            this.zone.run(() => fail(this.recognitionErrorFor(this.isNativeApp ? 'not-allowed-permanent' : 'not-allowed')));
            return;
          }

          const rec = new Ctor();
          recognition = rec;
          this.activeRecognition = rec;
          rec.lang = lang;
          rec.continuous = false;
          rec.interimResults = true;
          rec.maxAlternatives = 3; // the most confident alternative is chosen in core/transcript.ts

          rec.onstart = () =>
            this.zone.run(() => {
              if (isCurrent() && !failed) {
                this.listenState.set('listening');
              }
            });

          rec.onresult = (e) =>
            this.zone.run(() => {
              // Rebuild the whole transcript from ALL results of this session each time. That keeps earlier
              // final text, keeps final and interim text apart, and drops duplicated results.
              const raw: RawResult[] = [];
              for (let i = 0; i < e.results.length; i++) {
                const result = e.results[i];
                const alternatives: RawAlternative[] = [];
                for (let k = 0; k < Math.max(1, result.length); k++) {
                  const alt = result[k];
                  if (alt) alternatives.push({ transcript: alt.transcript ?? '', confidence: alt.confidence });
                }
                raw.push({ isFinal: result.isFinal, alternatives });
              }
              const t = buildTranscript(raw);
              latest = t;
              lastInterim = t.live;
              this.heardFinal.set(t.finalMarked);
              this.interim.set(t.live);
              const lastIsFinal = raw.length > 0 && raw[raw.length - 1].isFinal;
              if (lastIsFinal && (t.finalClean || t.finalMarked)) {
                hadResult = true;
                lastInterim = '';
                this.interim.set('');
                subscriber.next({ transcript: t.finalClean, isFinal: true, marked: t.finalMarked, uncertain: t.hasUnclear || t.hasCheck });
              } else if (t.live) {
                subscriber.next({ transcript: t.live, isFinal: false });
              }
            });

          rec.onerror = (e) =>
            this.zone.run(() => {
              if (e.error === 'aborted') {
                return; // we cancelled it ourselves
              }
              fail(this.recognitionErrorFor(e.error));
            });

          rec.onend = () =>
            this.zone.run(() => {
              if (failed) {
                return;
              }
              // Some browsers end the session with only partial text. Keep what was heard,
              // unless the user pressed Cancel.
              if (!hadResult && !cancelled && lastInterim) {
                hadResult = true;
                // Only interim text arrived. It is kept (never thrown away) but flagged as uncertain.
                subscriber.next({ transcript: latest?.interim || lastInterim, isFinal: true, marked: latest?.interim || lastInterim, uncertain: true });
              }
              reset();
              if (!hadResult && !cancelled) {
                failed = true;
                subscriber.error(this.recognitionErrorFor('no-speech'));
              } else {
                subscriber.complete();
              }
            });

          try {
            rec.start();
          } catch {
            this.zone.run(() => fail(this.recognitionErrorFor('busy')));
          }
        } catch {
          // For example: the browser refused to create the recognizer.
          this.zone.run(() => fail(this.recognitionErrorFor('start-failed')));
        }
      });

      // Teardown: runs on unsubscribe, complete and error.
      return () => {
        cancel();
        reset();
      };
    });
  }

  /** Stops listening but keeps (and delivers) what was heard so far. */
  stopListening(): void {
    try {
      this.activeRecognition?.stop();
    } catch {
      /* already stopped */
    }
  }

  // ---------- Speech synthesis (text to speech) ----------

  hasVoiceFor(lang: string): boolean {
    return this.pickVoice(lang) !== undefined;
  }

  /** Speaks text aloud. Completes when finished; unsubscribe to stop. */
  speak(text: string, options: SpeakOptions = {}): Observable<void> {
    return new Observable<void>((subscriber): TeardownLogic => {
      if (!this.synthesisSupported) {
        subscriber.error(
          new SpeechError('unsupported', 'Spoken audio is not supported in this browser.')
        );
        return undefined;
      }

      const clean = text.replace(/\s+/g, ' ').trim();
      if (!clean) {
        subscriber.complete();
        return undefined;
      }

      const lang = options.lang ?? 'en-US';
      const synth = window.speechSynthesis;
      const chunks = this.splitIntoChunks(clean);
      const id = ++this.speakId;
      let index = 0;
      let finished = false;

      const finish = (err?: SpeechError) => {
        if (finished) {
          return;
        }
        finished = true;
        this.zone.run(() => {
          if (id === this.speakId) {
            this.speaking.set(false);
          }
          if (err) {
            subscriber.error(err);
          } else {
            subscriber.complete();
          }
        });
      };

      const speakNext = () => {
        if (finished) {
          return;
        }
        if (id !== this.speakId) {
          finish(); // stopped, or replaced by newer speech, while we were waiting
          return;
        }
        if (index >= chunks.length) {
          finish();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        utterance.lang = lang;
        utterance.rate = options.rate ?? 0.9;
        utterance.pitch = options.pitch ?? 1;
        utterance.volume = Math.min(1, Math.max(0, options.volume ?? 1));
        const voice = options.voice ?? this.pickVoice(lang);
        if (voice) {
          utterance.voice = voice;
          if (options.voice) {
            utterance.lang = voice.lang; // a voice only works with its own language tag
          }
        }
        utterance.onend = () => {
          this.liveUtterances.delete(utterance);
          speakNext();
        };
        utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
          this.liveUtterances.delete(utterance);
          if (e.error === 'canceled' || e.error === 'interrupted') {
            finish();
          } else {
            finish(this.synthesisErrorFor(e.error));
          }
        };
        this.liveUtterances.add(utterance);
        synth.speak(utterance);
      };

      synth.cancel(); // stop anything already speaking
      this.liveUtterances.clear();
      this.speaking.set(true);
      // A short delay avoids a Chrome bug where speak() right after cancel() is ignored.
      const timer = setTimeout(speakNext, 60);

      return () => {
        clearTimeout(timer);
        if (!finished) {
          finished = true;
          if (id === this.speakId) {
            synth.cancel();
            this.speaking.set(false);
          }
        }
      };
    });
  }

  stopSpeaking(): void {
    this.speakId++; // makes any running speak() stop and ignore its late events
    if (this.synthesisSupported) {
      window.speechSynthesis.cancel();
    }
    this.speaking.set(false);
  }

  // ---------- Private helpers ----------

  private getRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') {
      return null;
    }
    if (this.isNativeApp) {
      return NativeRecognition as unknown as SpeechRecognitionCtor; // Android app: the device's own recogniser
    }
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }

  private getRecognitionProblem(): SpeechError | null {
    if (typeof window === 'undefined') {
      return new SpeechError('unsupported', 'Voice input is not available here.');
    }
    if (this.isNativeApp) {
      return null; // the Android app does not use the browser's recogniser; permission is handled by listen()
    }
    if (!window.isSecureContext) {
      return new SpeechError(
        'insecure-context',
        'Voice input only works on a secure page (https:// or http://localhost).'
      );
    }
    if (!this.getRecognitionCtor()) {
      return new SpeechError(
        'unsupported',
        'This browser or app does not support voice input. Chrome or Edge usually works best (Firefox does not support it, and Safari support is limited).'
      );
    }
    return null;
  }

  private recognitionErrorFor(code: string): SpeechError {
    switch (code) {
      case 'not-allowed-permanent':
        return new SpeechError(
          'permission-blocked',
          'Microphone permission is turned off for this app, so Android cannot ask again. Tap "Open app settings", choose Permissions, then Microphone, and select Allow. Then come back and tap the microphone.'
        );
      case 'not-allowed':
        if (this.isNativeApp) {
          return new SpeechError(
            'permission-denied',
            'I need microphone permission to hear you. Tap the microphone button again and choose Allow. You can also type your answer.'
          );
        }
        return new SpeechError(
          'permission-denied',
          'Microphone access is blocked. Tap the lock icon in the address bar, set Microphone to Allow, then reload the page.'
        );
      case 'service-not-allowed':
        if (this.isNativeApp) {
          return new SpeechError(
            'unsupported',
            'This phone has no speech recognition service available. Install or enable "Speech Recognition and Synthesis from Google" (or the Google app) in the Play Store, then try again. You can type your answer meanwhile.'
          );
        }
        return new SpeechError(
          'unsupported',
          'Voice input is not available here because the browser or app has blocked its speech service. Please type your sentence instead.'
        );
      case 'no-speech':
        return new SpeechError('no-speech', "I didn't hear anything. Tap the mic and try again.");
      case 'audio-capture':
        return new SpeechError('no-microphone', 'No microphone was found. Connect one and try again.');
      case 'network':
        return new SpeechError(
          'network',
          'Voice input needs an internet connection because the browser sends your speech to an online service. Check your connection and try again. (Some privacy browsers, such as Brave, block this service.)'
        );
      case 'language-not-supported':
        return new SpeechError('unsupported', 'English voice input is not available in this browser.');
      case 'busy':
        return new SpeechError(
          'busy',
          'The microphone is already in use. Close other apps or tabs that use it, then try again.'
        );
      case 'start-failed':
        return new SpeechError(
          'unknown',
          'Could not start voice input. Please try again, or type your sentence.'
        );
      case 'unsupported':
        return new SpeechError('unsupported', 'Voice input is not supported in this browser.');
      default:
        return new SpeechError('unknown', `Voice input failed (${code}). Please try again.`);
    }
  }

  private synthesisErrorFor(code: string): SpeechError {
    switch (code) {
      case 'not-allowed':
        return new SpeechError(
          'permission-denied',
          'The browser blocked the sound. Tap the Listen button again to allow it.'
        );
      case 'audio-busy':
      case 'audio-hardware':
        return new SpeechError(
          'audio',
          'Your device could not play sound right now. Check the volume or close other apps that use audio.'
        );
      case 'language-unavailable':
      case 'voice-unavailable':
        return new SpeechError(
          'unsupported',
          "No voice for this language is installed on your device. Check your device's text-to-speech settings."
        );
      case 'network':
        return new SpeechError('network', 'This voice needs an internet connection.');
      default:
        return new SpeechError('unknown', 'Could not play the audio. Please try again.');
    }
  }

  private loadVoices(): void {
    if (!this.synthesisSupported) {
      return;
    }
    const synth = window.speechSynthesis;
    const update = () => this.zone.run(() => this.voices.set(synth.getVoices()));
    update();
    // Chrome loads voices a moment after startup. Older Safari has no addEventListener here.
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', update);
    } else {
      synth.onvoiceschanged = update;
    }
  }

  private pickVoice(lang: string): SpeechSynthesisVoice | undefined {
    if (!this.synthesisSupported) {
      return undefined;
    }
    const list = this.voices().length > 0 ? this.voices() : window.speechSynthesis.getVoices();
    const normalize = (value: string) => value.replace('_', '-').toLowerCase();
    const target = normalize(lang);
    const base = target.split('-')[0];
    return (
      list.find((v) => normalize(v.lang) === target) ??
      list.find((v) => normalize(v.lang).split('-')[0] === base)
    );
  }

  /** Long text is spoken in pieces because some browsers cut off long utterances. */
  private splitIntoChunks(text: string, max = 180): string[] {
    const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
    const chunks: string[] = [];
    let current = '';

    for (const raw of sentences) {
      const sentence = raw.trim();
      if (!sentence) {
        continue;
      }
      if (sentence.length > max) {
        if (current) {
          chunks.push(current);
          current = '';
        }
        let part = '';
        for (const word of sentence.split(' ')) {
          const joined = part ? `${part} ${word}` : word;
          if (joined.length > max && part) {
            chunks.push(part);
            part = word;
          } else {
            part = joined;
          }
        }
        if (part) {
          chunks.push(part);
        }
      } else if (current && `${current} ${sentence}`.length > max) {
        chunks.push(current);
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) {
      chunks.push(current);
    }
    return chunks;
  }
}
