import { Injectable, computed, inject, signal } from '@angular/core';
import { compareSpeech } from '../core/speech-compare';
import { StorageService } from '../core/storage.service';
import { SpeechError, SpeechService } from '../services/speech.service';
import { CONVERSATION_BRAIN } from './conversation-brain';
import { LELA_CORRECTOR } from './lela-corrector';
import { LelaDataService } from './lela-data.service';
import { fillTemplate, matchIntent } from './lela-text';
import { VocabCollectorService } from '../core/vocab-collector.service';
import type {
  BrainQuestion, BrainTurn, Level, LelaDb, LelaIntent, LelaMemory, LelaMessage, TopicChoice, TopicInfo,
} from './lela.models';
import { LIVE_CHECKIN_AFTER, LIVE_PAUSE_AFTER, isInterruptOnly, shouldInterrupt } from './live-rules';
import { chooseLelaVoice, guessGender, scoreVoice } from './voice-choice';

const KEY = 'my-english-buddy.lela.v1';
const MAX_HISTORY = 8;
const MAX_FAVOURITES = 60;

/** A message the learner saved with the heart button. Kept on this device only. */
export interface FavouriteItem {
  id: string;
  from: 'lela' | 'user';
  text: string;
  tamil?: string;
  /** For a correction message: the corrected sentence. */
  corrected?: string;
  savedAt: string;
}
const MAX_SAVED_MESSAGES = 120;
/** A repeated sentence counts as correct when this share of the words is right and few extra words are added. */
const REPEAT_ACCURACY = 0.8;
const REPEAT_SIMILARITY = 0.75;

export type LelaPhase = 'idle' | 'speaking' | 'listening' | 'thinking';
type Line = { text: string; tamil?: string };

export interface SavedConversation {
  id: string;
  date: string;
  modeId: string;
  level: Level;
  messages: LelaMessage[];
}

interface Prefs {
  modeId: string;
  level: Level;
  rate: number;
  rateTouched: boolean;
  micOn: boolean;
  showTamil: boolean;
  name?: string;
  /** The voice the learner chose ('' = automatic). */
  voiceName?: string;
  pitch?: number;
  pitchTouched?: boolean;
  volume?: number;
  voiceOn?: boolean;
}

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

function readState(raw: string | null): { prefs: Partial<Prefs>; history: SavedConversation[]; favourites: FavouriteItem[] } {
  const out: { prefs: Partial<Prefs>; history: SavedConversation[]; favourites: FavouriteItem[] } = { prefs: {}, history: [], favourites: [] };
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as { prefs?: Partial<Prefs>; history?: unknown; favourites?: unknown };
    const p = data.prefs ?? {};
    if (typeof p.modeId === 'string' && p.modeId.length < 40) out.prefs.modeId = p.modeId;
    if (LEVELS.includes(p.level as Level)) out.prefs.level = p.level;
    if (typeof p.rate === 'number' && p.rate >= 0.5 && p.rate <= 1.4) out.prefs.rate = p.rate;
    if (typeof p.rateTouched === 'boolean') out.prefs.rateTouched = p.rateTouched;
    if (typeof p.micOn === 'boolean') out.prefs.micOn = p.micOn;
    if (typeof p.showTamil === 'boolean') out.prefs.showTamil = p.showTamil;
    if (typeof p.name === 'string' && /^[A-Za-z ]{2,30}$/.test(p.name)) out.prefs.name = p.name;
    if (typeof p.voiceName === 'string' && p.voiceName.length < 120) out.prefs.voiceName = p.voiceName;
    if (typeof p.pitch === 'number' && p.pitch >= 0.5 && p.pitch <= 1.6) out.prefs.pitch = p.pitch;
    if (typeof p.pitchTouched === 'boolean') out.prefs.pitchTouched = p.pitchTouched;
    if (typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1) out.prefs.volume = p.volume;
    if (typeof p.voiceOn === 'boolean') out.prefs.voiceOn = p.voiceOn;
    if (Array.isArray(data.favourites)) {
      for (const f of data.favourites.slice(0, MAX_FAVOURITES)) {
        const x = f as Partial<FavouriteItem>;
        if (typeof x?.id !== 'string' || typeof x.text !== 'string' || (x.from !== 'lela' && x.from !== 'user')) continue;
        out.favourites.push({ id: x.id, from: x.from, text: x.text.slice(0, 600), tamil: typeof x.tamil === 'string' ? x.tamil.slice(0, 600) : undefined, corrected: typeof x.corrected === 'string' ? x.corrected.slice(0, 600) : undefined, savedAt: typeof x.savedAt === 'string' ? x.savedAt : '' });
      }
    }
    if (Array.isArray(data.history)) {
      for (const h of data.history.slice(0, MAX_HISTORY)) {
        const c = h as Partial<SavedConversation>;
        if (typeof c?.id !== 'string' || typeof c.date !== 'string' || !Array.isArray(c.messages) || !LEVELS.includes(c.level as Level)) continue;
        const messages = c.messages.filter(
          (m): m is LelaMessage => !!m && typeof m.text === 'string' && (m.from === 'lela' || m.from === 'user'),
        ).slice(0, MAX_SAVED_MESSAGES);
        out.history.push({ id: c.id, date: c.date, modeId: String(c.modeId ?? 'free'), level: c.level as Level, messages });
      }
    }
  } catch {
    /* damaged saved data: start fresh */
  }
  return out;
}

/**
 * Runs a whole spoken conversation with Lela:
 *   Lela speaks -> (when she has finished) the microphone listens -> the answer is checked and corrected
 *   -> the brain picks Lela's reaction and next question -> Lela speaks ...
 * Everything stays in memory for the session; the last conversations are also kept in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class LelaConversationService {
  readonly speech = inject(SpeechService);
  private readonly data = inject(LelaDataService);
  private readonly brain = inject(CONVERSATION_BRAIN);
  private readonly corrector = inject(LELA_CORRECTOR);
  private readonly storage = inject(StorageService);
  private readonly collector = inject(VocabCollectorService);

  // ---------- State for the screen ----------
  readonly db = signal<LelaDb | null>(null);
  readonly loadError = signal('');
  readonly messages = signal<LelaMessage[]>([]);
  readonly phase = signal<LelaPhase>('idle');
  readonly active = signal(false);
  readonly awaitingRepeat = signal(false);
  readonly modeId = signal('free');
  readonly level = signal<Level>('beginner');
  readonly rate = signal(0.8);
  readonly micOn = signal(true);
  /** Live conversation mode: the microphone stays open between turns (and while Lela speaks, so she can be interrupted). */
  readonly liveMode = signal(false);
  /** Live listening paused after a long silence. The conversation is kept; tap the microphone to continue. */
  readonly livePaused = signal(false);
  /** How many times the learner has interrupted Lela by speaking (this session). */
  readonly interruptions = signal(0);
  readonly showTamil = signal(true);
  readonly topic = signal<TopicInfo | null>(null);
  readonly asked = signal<BrainQuestion | null>(null);
  readonly memory = signal<LelaMemory>({});
  readonly error = signal('');
  readonly history = signal<SavedConversation[]>([]);
  readonly topicChoices = signal<TopicChoice[]>([]);
  /** The English voice the learner picked ('' = let Lela choose the best female-sounding one). */
  readonly voiceName = signal('');
  readonly pitch = signal(1.08);
  readonly volume = signal(1);
  /** Voice mode: when on, Lela speaks every reply. Replay buttons always work. */
  readonly voiceOn = signal(true);
  readonly favourites = signal<FavouriteItem[]>([]);
  readonly previewing = signal(false);
  /** Every English voice on this device, best first, for the voice picker. */
  readonly englishVoices = computed(() => this.speech.voices().filter((v) => /^en/i.test(v.lang)).sort((a, b) => scoreVoice(b) - scoreVoice(a) || a.name.localeCompare(b.name)));

  readonly engineKind = this.brain.kind;
  readonly checkerKind = this.corrector.kind;

  readonly voiceChoice = computed(() => {
    const picked = this.voiceName();
    const chosen = picked ? this.speech.voices().find((v) => v.name === picked) : undefined;
    if (!chosen) return chooseLelaVoice(this.speech.voices());
    const g = guessGender(chosen);
    return { voice: chosen, gender: g, note: `Voice you chose: ${chosen.name} (${chosen.lang}), ${g === 'female' ? 'a female voice by its name' : g === 'male' ? 'a male-sounding voice by its name' : 'gender unknown'}.` };
  });
  readonly canSpeak = this.speech.synthesisSupported;
  readonly canListen = this.speech.recognitionSupported;
  readonly mode = computed(() => this.db()?.modes.find((m) => m.id === this.modeId()) ?? null);
  readonly status = computed(() => {
    if (!this.active()) return 'Ready';
    switch (this.phase()) {
      case 'speaking': return 'Lela is speaking…';
      case 'listening': return 'Listening… speak now';
      case 'thinking': return 'Thinking…';
      default: return this.awaitingRepeat() ? 'Your turn: repeat the corrected sentence' : this.micOn() && this.canListen ? 'Your turn' : 'Your turn: type your answer';
    }
  });

  private nextId = 1;
  private turn = 0;
  private silent = 0;
  private rateTouched = false;
  private pitchTouched = false;
  private lastSpoken = '';
  private storedName: string | undefined;
  private repeatTarget: { corrected: string; tries: number; pending: BrainTurn; prefix: Line[] } | null = null;
  private cancelSpeech: (() => void) | null = null;
  private cancelListen: (() => void) | null = null;
  private cancelPreview: (() => void) | null = null;
  /** The open microphone that listens for an interruption while Lela speaks (live mode only). */
  private monitor: { barged: boolean; stop: () => void; result: Promise<string | null> } | null = null;
  private loaded: Promise<void> | null = null;

  constructor() {
    const saved = readState(this.storage.read(KEY));
    const p = saved.prefs;
    this.modeId.set(p.modeId ?? 'free');
    this.level.set(p.level ?? 'beginner');
    this.rate.set(p.rate ?? 0.8);
    this.rateTouched = p.rateTouched ?? false;
    this.micOn.set(p.micOn ?? true);
    this.showTamil.set(p.showTamil ?? true);
    this.storedName = p.name;
    this.voiceName.set(p.voiceName ?? '');
    this.pitchTouched = p.pitchTouched ?? false;
    this.pitch.set(p.pitch ?? 1.08);
    this.volume.set(p.volume ?? 1);
    this.voiceOn.set(p.voiceOn ?? true);
    this.favourites.set(saved.favourites);
    this.history.set(saved.history);
    // Earlier conversations on this device: collect their vocabulary too (adds only, runs in the background).
    const earlier = saved.history.flatMap((h) => h.messages);
    if (earlier.length) setTimeout(() => void this.collector.collectFromMessages(earlier), 1500);
  }

  /** Loads the database (once). The screen calls this when it opens. */
  load(): Promise<void> {
    this.loaded ??= (async () => {
      try {
        this.loadError.set('');
        const db = await this.data.db();
        this.db.set(db);
        if (!db.modes.some((m) => m.id === this.modeId())) this.modeId.set(db.modes[0].id);
        this.topicChoices.set(await this.brain.topics());
      } catch (err) {
        this.loaded = null;
        this.loadError.set(err instanceof Error ? err.message : 'Could not load Lela\'s database.');
      }
    })();
    return this.loaded;
  }

  // ---------- Settings ----------

  setMode(id: string): void {
    this.modeId.set(id);
    this.persist();
    if (this.active()) void this.reconfigure('nextTopic');
  }

  setLevel(level: Level): void {
    this.level.set(level);
    const info = this.db()?.levels.find((l) => l.id === level);
    if (info && !this.rateTouched) this.rate.set(info.defaultRate);
    this.persist();
    if (this.active()) void this.reconfigure('none');
  }

  setRate(rate: number): void {
    this.rateTouched = true;
    this.rate.set(Math.min(1.4, Math.max(0.5, rate)));
    this.persist();
  }

  setShowTamil(on: boolean): void {
    this.showTamil.set(on);
    this.persist();
  }

  setMicOn(on: boolean): void {
    this.micOn.set(on);
    this.persist();
    if (!on) {
      if (this.phase() === 'listening') this.cancelListen?.();
      this.error.set('');
    } else if (this.active() && this.phase() === 'idle') {
      const t = ++this.turn;
      void this.listenAndHandle(t, true);
    }
  }

  /** Switches between normal chat and Live conversation. Nothing in the conversation is lost either way. */
  setLiveMode(on: boolean): void {
    this.liveMode.set(on);
    this.livePaused.set(false);
    this.silent = 0;
    if (on) {
      if (this.canListen) this.micOn.set(true);
      if (this.active() && this.phase() === 'idle' && this.canListen) {
        const t = this.newTurn();
        void this.run(t, () => this.listenAndHandle(t, true));
      }
    } else {
      this.monitor?.stop();
      if (this.phase() === 'listening') this.cancelListen?.();
    }
  }

  // ---------- Starting and ending ----------

  async start(): Promise<void> {
    await this.load();
    if (!this.db()) return;
    const t = this.newTurn();
    this.error.set('');
    this.messages.set([]);
    this.nextId = 1;
    this.repeatTarget = null;
    this.awaitingRepeat.set(false);
    this.memory.set(this.storedName ? { name: this.storedName } : {});
    this.silent = 0;
    this.active.set(true);
    if (this.micOn() && this.canListen) {
      try {
        // Asking now, while the learner has just pressed a button, is when browsers show the permission prompt.
        const permission = await this.speech.requestMicPermission();
        if (permission === 'denied') this.micBlocked();
      } catch (err) {
        this.micOn.set(false);
        this.error.set(err instanceof Error ? err.message : 'Could not use the microphone. You can type your answers.');
      }
    }
    await this.run(t, async () => {
      const turn = await this.brain.start({
        modeId: this.modeId(),
        level: this.level(),
        memory: this.memory(),
        returning: !!this.storedName,
      });
      if (t !== this.turn) return;
      await this.deliver(turn, t);
      await this.afterLela(t);
    });
  }

  /** Lela says goodbye, then the conversation is saved to the history. */
  async end(): Promise<void> {
    if (!this.active()) return;
    const t = this.newTurn();
    const book = await this.data.phraseBook();
    const bye = [book.pick('end'), book.pick('goodbye')];
    this.addLela({ text: bye.map((b) => b.text).join(' '), tamil: bye[1].tamil });
    this.asked.set(null);
    await this.speakText(bye.map((b) => b.text).join(' '));
    if (t !== this.turn) return;
    this.finishConversation();
  }

  /** Saves the current conversation and starts a fresh one. */
  async newConversation(): Promise<void> {
    if (this.active()) {
      this.newTurn();
      this.finishConversation();
    }
    await this.start();
  }

  private finishConversation(): void {
    this.saveHistory();
    this.repeatTarget = null;
    this.awaitingRepeat.set(false);
    this.active.set(false);
    this.phase.set('idle');
    this.topic.set(null);
  }

  // ---------- What the learner can do while talking ----------

  /** The learner typed or said something. */
  async submit(text: string, source: 'voice' | 'typed' = 'typed'): Promise<void> {
    const clean = text.trim().slice(0, 400);
    if (!clean || !this.active()) return;
    const t = this.newTurn();
    this.silent = 0;
    this.error.set('');
    this.addUser(clean, source);
    await this.run(t, () => this.process(clean, t));
  }

  /** Microphone button: start listening now, or stop and use what was heard. */
  tapMic(): void {
    if (!this.active() || !this.micOn()) return;
    if (this.phase() === 'listening') {
      this.speech.stopListening();
      return;
    }
    const t = this.newTurn();
    this.error.set('');
    this.livePaused.set(false);
    this.silent = 0;
    void this.run(t, () => this.listenAndHandle(t, false));
  }

  stopSpeaking(): void {
    this.cancelSpeech?.();
  }

  /** Speaks one sentence (for example the corrected sentence), then goes back to listening. */
  async speakOnly(text: string): Promise<void> {
    if (!this.active() || !text) return;
    const t = this.newTurn();
    await this.run(t, async () => {
      await this.speakText(text);
      await this.afterLela(t);
    });
  }

  // ---------- Voice settings ----------

  /** Soft, friendly default pitch; a device with no female English voice gets a little more lift unless the learner chose. */
  private effectivePitch(): number {
    if (this.pitchTouched) return this.pitch();
    return this.voiceChoice().gender === 'female' ? this.pitch() : Math.max(this.pitch(), 1.2);
  }

  setVolume(value: number): void {
    this.volume.set(Math.min(1, Math.max(0, value)));
    this.persist();
  }

  setVoiceOn(on: boolean): void {
    this.voiceOn.set(on);
    if (!on) this.cancelSpeech?.();
    this.persist();
  }

  setVoiceName(name: string): void {
    this.voiceName.set(name);
    this.persist();
  }

  setPitch(value: number): void {
    this.pitchTouched = true;
    this.pitch.set(Math.min(1.6, Math.max(0.6, value)));
    this.persist();
  }

  /** Plays a short sample in the chosen voice, speed and pitch. Does not change the conversation. */
  previewVoice(): void {
    this.playSample("Hi! I'm Lela. I'm happy to practise English with you today.");
  }

  /** Reads any saved text aloud in Lela's voice (used by favourites). Does not change the conversation. */
  playSample(text: string): void {
    if (!this.canSpeak || !text.trim()) return;
    const choice = this.voiceChoice();
    if (this.speech.voices().length > 0 && !choice.voice) return;
    this.cancelPreview?.();
    this.previewing.set(true);
    const sub = this.speech.speak(text, { lang: 'en-IN', rate: this.rate(), pitch: this.effectivePitch(), volume: this.volume(), voice: choice.voice }).subscribe({
      error: () => { this.previewing.set(false); this.cancelPreview = null; },
      complete: () => { this.previewing.set(false); this.cancelPreview = null; },
    });
    this.cancelPreview = () => { sub.unsubscribe(); this.previewing.set(false); this.cancelPreview = null; };
  }

  // ---------- Favourites ----------

  isFavourite(m: LelaMessage): boolean {
    return this.favourites().some((f) => f.from === m.from && f.text === m.text);
  }

  toggleFavourite(m: LelaMessage): void {
    const existing = this.favourites().find((f) => f.from === m.from && f.text === m.text);
    if (existing) {
      this.removeFavourite(existing.id);
      return;
    }
    const item: FavouriteItem = { id: `${Date.now()}-${m.id}`, from: m.from, text: m.text, tamil: m.tamil, corrected: m.correction?.corrected, savedAt: new Date().toISOString() };
    this.favourites.update((list) => [item, ...list].slice(0, MAX_FAVOURITES));
    this.persist();
  }

  removeFavourite(id: string): void {
    this.favourites.update((list) => list.filter((f) => f.id !== id));
    this.persist();
  }

  /** The learner left the screen: stop talking and listening, but keep the conversation. */
  pause(): void {
    this.newTurn();
    this.phase.set('idle');
  }

  /** "Repeat voice": says Lela's last words again. */
  async repeatVoice(): Promise<void> {
    if (!this.active()) return;
    const t = this.newTurn();
    const text = this.repeatTarget?.corrected ?? this.lastSpoken;
    await this.run(t, async () => {
      await this.speakText(text);
      await this.afterLela(t);
    });
  }

  /** "Need help?": Lela gives a sample answer. */
  async hint(): Promise<void> {
    if (!this.active()) return;
    const t = this.newTurn();
    await this.run(t, () => this.giveHint(t));
  }

  /** Lela picks another topic. */
  async changeTopic(): Promise<void> {
    if (!this.active()) return;
    const t = this.newTurn();
    await this.run(t, async () => {
      this.repeatTarget = null;
      this.awaitingRepeat.set(false);
      const turn = await this.brain.nextTopic();
      await this.deliverAndListen(turn, t);
    });
  }

  /** The learner chose a topic from the list. */
  async goToTopic(id: string): Promise<void> {
    if (!this.active() || !id) return;
    const t = this.newTurn();
    await this.run(t, async () => {
      this.repeatTarget = null;
      this.awaitingRepeat.set(false);
      const turn = await this.brain.goToTopic(id);
      await this.deliverAndListen(turn, t);
    });
  }

  async skipQuestion(): Promise<void> {
    if (!this.active()) return;
    const t = this.newTurn();
    await this.run(t, async () => {
      this.repeatTarget = null;
      this.awaitingRepeat.set(false);
      const turn = await this.brain.skip();
      await this.deliverAndListen(turn, t);
    });
  }

  clearHistory(): void {
    this.history.set([]);
    this.storedName = undefined;
    this.persist();
  }

  // ---------- The turn pipeline ----------

  private async process(text: string, t: number): Promise<void> {
    const db = await this.data.db();
    const book = await this.data.phraseBook();
    this.phase.set('thinking');

    // 1. Commands and small talk ("repeat", "I don't know", "bye", "what is your name")
    let prefix: Line[] = [];
    const intent = matchIntent(db.intents, text);
    if (intent) {
      const handled = await this.handleIntent(intent, t);
      if (handled === 'done') return;
      if (handled !== 'continue') prefix = handled;
    }

    // 2. "Let's talk about cooking"
    const wanted = await this.brain.findTopic(text);
    if (wanted && !this.repeatTarget) {
      this.repeatTarget = null;
      const turn = await this.brain.goToTopic(wanted.id);
      await this.deliverAndListen(turn, t, prefix);
      return;
    }

    // 3. The learner is repeating a corrected sentence
    if (this.repeatTarget) {
      await this.checkRepeat(text, t, prefix);
      return;
    }

    // 4. A normal answer: check the grammar and let the brain react
    const [outcome, turn] = await Promise.all([
      this.corrector.correct(text).catch(() => null),
      this.brain.next(text, { memory: this.memory() }),
    ]);
    if (t !== this.turn) return;
    // A short, natural pause so the "typing" dots show before Lela answers.
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    if (t !== this.turn) return;
    this.merge(turn.remember);

    if (outcome?.changed && !turn.single) {
      this.markUser(text, false);
      const intro = book.pick('correction-intro', { text: outcome.corrected });
      this.addLela({
        text: intro.text,
        tamil: intro.tamil,
        kind: 'correction',
        correction: {
          original: outcome.original,
          corrected: outcome.corrected,
          explanations: outcome.explanations,
          checker: outcome.kind,
          disclaimer: outcome.disclaimer,
        },
      });
      await this.speakText(intro.text);
      if (t !== this.turn) return;
      const again = book.pick('repeat-ask');
      this.addLela({ text: again.text, tamil: again.tamil });
      await this.speakText(again.text);
      if (t !== this.turn) return;
      this.repeatTarget = { corrected: outcome.corrected, tries: 0, pending: turn, prefix };
      this.awaitingRepeat.set(true);
      await this.afterLela(t);
      return;
    }

    if (turn.single && !turn.retry) {
      // One word: show the full sentence as a teaching card, say it, then continue with the follow-up question.
      const s = turn.single;
      void this.collector.collectTaught(s.word);
      this.markUser(text, false);
      const say = `${s.say} You can say, "${s.sentence}"`;
      this.addLela({
        text: say,
        tamil: `${s.sayTamil} ${s.sentenceTamil}`,
        kind: 'correction',
        correction: {
          original: text.trim(),
          corrected: s.sentence,
          explanations: [{
            found: text.trim(),
            replacement: s.sentence,
            english: 'One word is understood, but a full sentence sounds more natural. Try to answer in a full sentence.',
            tamil: 'ஒரு சொல் புரியும், ஆனால் முழு வாக்கியமாகச் சொன்னால் இயல்பாக இருக்கும். முழு வாக்கியத்தில் பதில் சொல்லுங்கள்.',
          }],
          checker: 'rule-based',
          disclaimer: "This comes from Lela's fixed one-word list. It is not AI, and it cannot know exactly what you meant.",
        },
      });
      await this.speakText(say);
      if (t !== this.turn) return;
      await this.deliver(turn, t, [...prefix]);
      await this.afterLela(t);
      return;
    }

    const lines: Line[] = [...prefix];
    if (outcome && text.trim().split(/\s+/).length >= 4) {
      this.markUser(text, true);
      lines.push(book.pick('correct'));
    }
    await this.deliver(turn, t, lines);
    await this.afterLela(t);
  }

  private async checkRepeat(text: string, t: number, prefix: Line[]): Promise<void> {
    const target = this.repeatTarget;
    if (!target) return;
    const book = await this.data.phraseBook();
    const match = compareSpeech(target.corrected, text);
    if (match.accuracy >= REPEAT_ACCURACY && match.similarity >= REPEAT_SIMILARITY) {
      this.markUser(text, true);
      this.repeatTarget = null;
      this.awaitingRepeat.set(false);
      const praise = book.pick('praise-repeat');
      await this.deliver(target.pending, t, [...prefix, praise, ...target.prefix], 'praise');
      await this.afterLela(t);
      return;
    }
    if (target.tries < 1) {
      target.tries++;
      const retry = book.pick('retry', { text: target.corrected });
      this.addLela({ text: retry.text, tamil: retry.tamil });
      await this.speakText(retry.text);
      await this.afterLela(t);
      return;
    }
    this.repeatTarget = null;
    this.awaitingRepeat.set(false);
    await this.deliver(target.pending, t, [...prefix, book.pick('give-up'), ...target.prefix]);
    await this.afterLela(t);
  }

  /** Returns 'done' when the command was fully handled, lines to say first, or 'continue'. */
  private async handleIntent(intent: LelaIntent, t: number): Promise<'done' | 'continue' | Line[]> {
    const reply = intent.replies.length > 0 ? intent.replies[Math.floor(Math.random() * intent.replies.length)] : null;
    switch (intent.action) {
      case 'end':
        await this.end();
        return 'done';
      case 'repeat': {
        await this.speakText(this.repeatTarget?.corrected ?? this.lastSpoken);
        await this.afterLela(t);
        return 'done';
      }
      case 'help':
        await this.giveHint(t);
        return 'done';
      case 'change-topic':
        this.repeatTarget = null;
        this.awaitingRepeat.set(false);
        await this.deliverAndListen(await this.brain.nextTopic(), t);
        return 'done';
      case 'skip':
        this.repeatTarget = null;
        this.awaitingRepeat.set(false);
        await this.deliverAndListen(await this.brain.skip(), t);
        return 'done';
      case 'slower':
      case 'faster': {
        this.setRate(this.rate() + (intent.action === 'slower' ? -0.15 : 0.15));
        if (reply) await this.lelaSays(reply.en, reply.tamil, t);
        await this.speakText(this.repeatTarget?.corrected ?? this.lastSpoken);
        await this.afterLela(t);
        return 'done';
      }
      default: {
        if (!reply) return 'continue';
        if (!intent.standalone) return [{ text: reply.en, tamil: reply.tamil }];
        const q = this.asked();
        const again = this.repeatTarget ? '' : q?.text ?? '';
        await this.lelaSays([reply.en, again].filter(Boolean).join(' '), reply.tamil ?? q?.tamil, t, q?.example);
        await this.afterLela(t);
        return 'done';
      }
    }
  }

  private async giveHint(t: number): Promise<void> {
    const book = await this.data.phraseBook();
    const example = this.repeatTarget ? this.repeatTarget.corrected : this.asked()?.example;
    if (!example) {
      const none = book.pick('not-understood');
      await this.lelaSays(none.text, none.tamil, t);
      await this.afterLela(t);
      return;
    }
    const line = book.pick('hint-intro', { example });
    this.addLela({ text: line.text, tamil: line.tamil, kind: 'hint' });
    this.lastSpoken = line.text;
    await this.speakText(line.text);
    await this.afterLela(t);
  }

  // ---------- Showing and speaking ----------

  private async deliverAndListen(turn: BrainTurn, t: number, before: Line[] = []): Promise<void> {
    if (t !== this.turn) return;
    await this.deliver(turn, t, before);
    await this.afterLela(t);
  }

  /** Shows Lela's message and speaks it. */
  private async deliver(turn: BrainTurn, t: number, before: Line[] = [], kind: LelaMessage['kind'] = 'normal'): Promise<void> {
    this.merge(turn.remember);
    if (turn.topic) this.topic.set(turn.topic);
    const lines = [...before, ...turn.lines];
    const ask = turn.retry ? null : turn.ask;
    const text = [...lines.map((l) => l.text), ask?.text ?? ''].filter(Boolean).join(' ');
    if (!turn.retry) this.asked.set(turn.ask);
    if (turn.finished && !text) {
      this.addLela({ text: 'We have finished everything I have for now. Press New conversation to start again.' });
      return;
    }
    const tamil = ask?.tamil ?? [...lines].reverse().find((l) => l.tamil)?.tamil;
    this.addLela({ text, tamil, kind, example: turn.ask?.example, topic: turn.topic?.title });
    if (ask?.kind === 'vocab' && ask.word) void this.collector.collectTaught(ask.word);
    await this.speakText(text);
    if (t !== this.turn) return;
  }

  private async lelaSays(text: string, tamil: string | undefined, t: number, example?: string): Promise<void> {
    if (!text) return;
    this.addLela({ text, tamil, example });
    await this.speakText(text);
    if (t !== this.turn) return;
  }

  /** After Lela has finished speaking, the microphone starts (when it is on). */
  private async afterLela(t: number): Promise<void> {
    if (t !== this.turn || !this.active()) return;
    const barge = this.monitor?.barged ? this.monitor.result : null;
    this.phase.set('idle');
    if (barge) {
      // The learner talked over Lela: she stopped, and we take what they said as their turn.
      this.phase.set('listening');
      const heard = await barge;
      if (t !== this.turn || !this.active()) return;
      this.phase.set('idle');
      this.monitor = null;
      if (heard && !isInterruptOnly(heard)) {
        this.silent = 0;
        await this.submit(heard, 'voice');
        return;
      }
      if (this.micOn() && this.canListen) await this.listenAndHandle(t, true);
      return;
    }
    if (!this.micOn() || !this.canListen) return;
    await this.listenAndHandle(t, true);
  }

  private async listenAndHandle(t: number, auto: boolean): Promise<void> {
    await new Promise<void>((r) => setTimeout(r, 300)); // lets the loudspeaker go quiet first
    if (t !== this.turn || !this.active() || !this.micOn()) return;
    const result = await this.listenOnce();
    if (t !== this.turn || !this.active()) return;
    this.phase.set('idle');
    if (result.text) {
      this.silent = 0;
      await this.submit(result.text, 'voice');
      return;
    }
    switch (result.code) {
      case null:
      case 'cancelled':
        return;
      case 'no-speech': {
        this.silent++;
        if (this.liveMode() && auto) {
          if (this.silent >= LIVE_PAUSE_AFTER) {
            this.silent = 0;
            this.livePaused.set(true);
            this.phase.set('idle');
            return;
          }
          if (this.silent === LIVE_CHECKIN_AFTER) {
            await this.lelaSays("I'm still here. Take your time, and speak when you are ready.", 'நான் இங்கேதான் இருக்கிறேன். தயாரானதும் பேசுங்கள்.', t);
            if (t !== this.turn || !this.active()) return;
          }
          await this.listenAndHandle(t, true);
          return;
        }
        if (auto && this.silent < 2) {
          await this.listenAndHandle(t, true);
          return;
        }
        this.silent = 0;
        const book = await this.data.phraseBook();
        const line = book.pick('no-speech');
        await this.lelaSays(line.text, line.tamil, t);
        this.phase.set('idle');
        return;
      }
      case 'permission-denied':
      case 'no-microphone':
        this.micBlocked(result.message);
        return;
      default:
        this.error.set(result.message || 'The microphone had a problem. Tap the mic button to try again, or type your answer.');
    }
  }

  private micBlocked(message?: string): void {
    this.micOn.set(false);
    this.error.set(
      message ?? 'Microphone access is blocked. Tap the lock icon in the address bar, set Microphone to Allow, then reload the page. You can type your answers meanwhile.',
    );
  }

  // ---------- Browser speech, wrapped in promises ----------

  /** Speaks and resolves when finished (or when stopped). No English voice or no speech support: resolves at once. */
  private speakText(text: string): Promise<void> {
    const clean = text.trim();
    if (clean) this.lastSpoken = clean;
    if (!clean || !this.canSpeak || !this.voiceOn()) return Promise.resolve();
    const choice = this.voiceChoice();
    if (this.speech.voices().length > 0 && !choice.voice) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.phase.set('speaking');
      this.startMonitor(clean);
      const sub = this.speech
        .speak(clean, { lang: 'en-IN', rate: this.rate(), pitch: this.effectivePitch(), volume: this.volume(), voice: choice.voice })
        .subscribe({
          error: (err: Error) => {
            this.cancelSpeech = null;
            this.error.set(err.message);
            resolve();
          },
          complete: () => {
            this.cancelSpeech = null;
            if (this.monitor && !this.monitor.barged) this.monitor.stop();
            resolve();
          },
        });
      this.cancelSpeech = () => {
        sub.unsubscribe();
        this.cancelSpeech = null;
        resolve();
      };
    });
  }

  /**
   * Live mode: keeps the microphone open while Lela speaks. If the learner starts talking (and it is not
   * just Lela's own voice coming back through the speaker), Lela stops at once and what the learner says
   * becomes their turn. Browser speech recognition ends by itself after a while, so it is restarted.
   */
  private startMonitor(spoken: string): void {
    this.monitor?.stop();
    this.monitor = null;
    if (!this.liveMode() || !this.canListen || !this.micOn()) return;
    let stopped = false;
    let restarts = 0;
    let finalText = '';
    let resolveResult!: (text: string | null) => void;
    const result = new Promise<string | null>((r) => (resolveResult = r));
    let sub: { unsubscribe(): void } | null = null;
    const state = {
      barged: false,
      result,
      stop: () => {
        if (stopped) return;
        stopped = true;
        sub?.unsubscribe();
        this.speech.stopListening();
        resolveResult(state.barged ? finalText || null : null);
        if (this.monitor === state) this.monitor = null;
      },
    };
    const finish = (): void => {
      if (stopped) return;
      stopped = true;
      resolveResult(finalText || null);
    };
    const arm = (): void => {
      if (stopped) return;
      sub = this.speech.listen('en-IN').subscribe({
        next: (e) => {
          if (stopped) return;
          if (!state.barged && e.transcript && shouldInterrupt(e.transcript, spoken)) {
            state.barged = true;
            this.interruptions.update((n) => n + 1);
            this.cancelSpeech?.();
          }
          if (state.barged && e.isFinal && e.transcript.trim()) finalText = e.transcript.trim();
        },
        error: () => (state.barged ? finish() : (stopped = true)),
        complete: () => {
          if (state.barged) finish();
          else if (!stopped && restarts++ < 20) setTimeout(arm, 400);
        },
      });
    };
    this.monitor = state;
    arm();
  }

  private listenOnce(): Promise<{ text: string | null; code: string | null; message: string }> {
    if (this.monitor && !this.monitor.barged) this.monitor.stop();
    return new Promise((resolve) => {
      let text: string | null = null;
      let done = false;
      const finish = (code: string | null, message = '') => {
        if (done) return;
        done = true;
        this.cancelListen = null;
        resolve({ text, code, message });
      };
      this.phase.set('listening');
      const sub = this.speech.listen('en-IN').subscribe({
        next: (event) => {
          if (event.isFinal && event.transcript.trim()) text = event.transcript.trim();
        },
        error: (err: unknown) => finish(err instanceof SpeechError ? err.code : 'unknown', err instanceof Error ? err.message : ''),
        complete: () => finish(null),
      });
      this.cancelListen = () => {
        sub.unsubscribe();
        finish('cancelled');
      };
    });
  }

  // ---------- Small helpers ----------

  /** Stops speech and listening, and makes every older async step give up. */
  private newTurn(): number {
    this.monitor?.stop();
    this.monitor = null;
    this.cancelSpeech?.();
    this.cancelListen?.();
    this.cancelPreview?.();
    this.speech.stopSpeaking();
    return ++this.turn;
  }

  private async run(t: number, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (err) {
      if (t === this.turn) {
        this.phase.set('idle');
        this.error.set(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    }
  }

  private async reconfigure(then: 'nextTopic' | 'none'): Promise<void> {
    await this.brain.configure(this.modeId(), this.level());
    if (then === 'nextTopic') await this.changeTopic();
  }

  private merge(remember: Partial<LelaMemory> | undefined): void {
    if (!remember || Object.keys(remember).length === 0) return;
    this.memory.update((m) => ({ ...m, ...remember }));
    if (remember.name) {
      this.storedName = remember.name;
      this.persist();
    }
  }

  private addUser(text: string, source: 'voice' | 'typed'): void {
    this.messages.update((list) => [...list, { id: this.nextId++, from: 'user', text, kind: 'normal', source }]);
    void this.collector.collectText(text);
  }

  private addLela(partial: Partial<LelaMessage> & { text: string }): void {
    this.messages.update((list) => [...list, { id: this.nextId++, from: 'lela', kind: 'normal', ...partial }]);
    void this.collector.collectText(partial.text);
    if (partial.correction) void this.collector.collectText(partial.correction.corrected);
  }

  /** Marks the learner's latest message as correct or not (shown next to the sentence). */
  private markUser(text: string, correct: boolean): void {
    this.messages.update((list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].from === 'user' && copy[i].text === text) {
          copy[i] = { ...copy[i], looksCorrect: correct };
          break;
        }
      }
      return copy;
    });
  }

  private saveHistory(): void {
    const messages = this.messages().slice(-MAX_SAVED_MESSAGES);
    if (messages.filter((m) => m.from === 'user').length === 0) return;
    const entry: SavedConversation = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      modeId: this.modeId(),
      level: this.level(),
      messages,
    };
    this.history.update((h) => [entry, ...h].slice(0, MAX_HISTORY));
    this.persist();
  }

  private persist(): void {
    const prefs: Prefs = {
      modeId: this.modeId(),
      level: this.level(),
      rate: this.rate(),
      rateTouched: this.rateTouched,
      micOn: this.micOn(),
      showTamil: this.showTamil(),
      name: this.storedName,
      voiceName: this.voiceName(),
      pitch: this.pitch(),
      pitchTouched: this.pitchTouched,
      volume: this.volume(),
      voiceOn: this.voiceOn(),
    };
    this.storage.write(KEY, JSON.stringify({ prefs, history: this.history(), favourites: this.favourites() }));
  }

  /** For the template: fills {name} style text. */
  fill(text: string): string {
    return fillTemplate(text, { name: this.memory().name });
  }
}
