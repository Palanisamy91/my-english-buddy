import { stemOf } from '../core/exercises';
import type {
  BrainQuestion, BrainTurn, Level, LelaDb, LelaDialogue, LelaMemory, LelaMode, LelaQuestion, LelaReaction, LelaTopic,
  LelaWord, TopicChoice, TopicInfo,
} from './lela.models';
import { captureFact, fillTemplate, findTopicRequest, lowerFirst, matchReaction, normalize, wordCount } from './lela-text';
import type { PhraseBook } from './phrase-book';

export const WARMUP_TOPIC = 'warm-up';
/** Modes that start with a greeting and "How are you today?" */
const WARMUP_MODES = new Set(['free', 'daily', 'office', 'software', 'advanced']);
const LEVEL_ORDER: Record<Level, Level[]> = {
  beginner: ['beginner', 'intermediate', 'advanced'],
  intermediate: ['intermediate', 'beginner', 'advanced'],
  advanced: ['advanced', 'intermediate', 'beginner'],
};
/** How many follow-up questions made from the learner's own answers may follow one main question. */
const MAX_FOLLOW_UPS = 3;
const NEGATIVE = /\b(no|not|never|sad|bad|sick|tired|problem|difficult|hard|angry|worried|stress|stressed|sorry|cannot|can't|don't|didn't|hate|worst)\b/;

type Line = { text: string; tamil?: string };

/** One-word answers that already have a good normal reply (agreement, thanks ...): not treated as "a word to teach". */
const PLAIN_ANSWERS = new Set([
  'yes', 'no', 'yeah', 'yep', 'nope', 'ok', 'okay', 'fine', 'good', 'great', 'nice', 'sure', 'maybe', 'thanks', 'thank', 'sorry',
  'hi', 'hello', 'hey', 'bye', 'please', 'nothing', 'nobody', 'none', 'done', 'right', 'correct', 'wrong', 'true', 'false', 'skip',
]);

/**
 * The free "brain": database-driven, NOT AI. It
 *  - picks stored questions for the chosen mode, topic and level, and never asks the same one twice;
 *  - reacts when the learner's answer contains a keyword stored with the question, and may ask a stored
 *    follow-up question that fits that keyword;
 *  - remembers the learner's name, age, hometown and job when a question asks for them;
 *  - plays stored role-play scenes, teaches stored words and grammar points.
 * It cannot understand sentences. Anything it has no keyword for gets a polite, general reply.
 * Plain TypeScript (no Angular) so that it can be tested without a browser.
 */
export class DatabaseBrainCore {
  private modeId = 'free';
  private level: Level = 'beginner';
  private memory: LelaMemory = {};
  private topic: LelaTopic | null = null;
  private queue: LelaQuestion[] = [];
  private asked = new Set<string>();
  private askedText = new Set<string>();
  private mainCount = 0;
  private followDepth = 0;
  private usedReactions = new Set<string>();
  private doneTopics = new Set<string>();
  private lastGroup = '';
  private last: BrainQuestion | null = null;
  private lastAck = '';
  private tries = 0;
  private scene: { dialogue: LelaDialogue; index: number } | null = null;
  private usedDialogues = new Set<string>();
  private words: LelaWord[] = [];
  private usedWords = new Set<string>();
  private wordsDone = 0;
  private guard = 0;

  constructor(
    private readonly db: LelaDb,
    private readonly book: PhraseBook,
    private readonly rng: () => number = Math.random,
  ) {}

  // ---------- Public API (mirrors ConversationBrain) ----------

  current(): BrainQuestion | null {
    return this.last;
  }

  configure(modeId: string, level: Level): void {
    if (modeId !== this.modeId) this.doneTopics.clear();
    this.modeId = this.db.modes.some((m) => m.id === modeId) ? modeId : 'free';
    this.level = level;
  }

  start(options: { modeId: string; level: Level; memory: LelaMemory; returning: boolean }): BrainTurn {
    this.modeId = this.db.modes.some((m) => m.id === options.modeId) ? options.modeId : 'free';
    this.level = options.level;
    this.memory = { ...options.memory };
    Object.assign(this, {
      topic: null, queue: [], mainCount: 0, followDepth: 0, last: null, scene: null, wordsDone: 0, tries: 0, lastGroup: '',
    });
    this.asked = new Set();
    this.askedText = new Set();
    this.usedReactions = new Set();
    this.doneTopics = new Set();
    this.usedDialogues = new Set();
    this.usedWords = new Set();
    this.words = [];

    const warm = this.db.topics.find((t) => t.id === WARMUP_TOPIC);
    if (WARMUP_MODES.has(this.modeId) && warm) {
      this.topic = warm;
      this.queue = this.db.questions.filter((q) => q.topicId === WARMUP_TOPIC).sort((a, b) => a.id.localeCompare(b.id));
      const first = this.queue.shift();
      if (first) {
        this.markAsked(first);
        const greeting = this.memory.name && options.returning
          ? this.book.pick('greeting-return', { name: this.memory.name })
          : this.book.pick('greeting');
        this.mainCount = 1;
        return this.turn([], { ...this.toAsk(first), text: greeting.text, tamil: greeting.tamil ?? first.tamil });
      }
    }
    return this.openNextTopic([this.book.pick('greeting-plain')]);
  }

  next(userText: string, context: { memory: LelaMemory }): BrainTurn {
    this.memory = { ...context.memory };
    const asked = this.last;
    if (asked?.kind === 'scene') return this.sceneNext();
    if (asked?.kind === 'vocab') return this.vocabNext(userText);
    const norm = normalize(userText);
    const lines: Line[] = [];
    const remember: Partial<LelaMemory> = {};

    // Grammar task: did the answer try the target grammar?
    if (asked?.kind === 'grammar' && asked.expect) {
      let ok = false;
      try {
        ok = new RegExp(asked.expect.pattern, 'i').test(userText);
      } catch {
        ok = true; // a broken pattern must never block the learner
      }
      if (!ok && this.tries < 1) {
        this.tries++;
        const title = this.topic?.title ?? 'this grammar';
        const line = this.book.pick('grammar-expect', { title: lowerFirst(title), hint: asked.expect.hint });
        return { ...this.turn([{ text: line.text, tamil: asked.expect.hintTamil }], asked), retry: true };
      }
      this.tries = 0;
      lines.push(ok ? this.ack(norm, wordCount(userText)) : this.book.pick('give-up'));
      return this.nextMain(lines);
    }

    const single = this.singleWord(norm, asked);
    if (single) return single;

    if (asked?.capture) {
      Object.assign(remember, captureFact(asked.capture, userText));
    }
    this.memory = { ...this.memory, ...remember };

    const found = this.findReaction(norm);
    if (remember.name) {
      lines.push(this.book.pick('nice-to-meet', { name: remember.name }));
    } else if (found) {
      lines.push({ text: fillTemplate(found.reaction.say, { name: this.memory.name }) });
    } else {
      lines.push(this.ack(norm, wordCount(userText)));
    }

    // A follow-up that fits the keyword the learner used (limited, so the topic still moves on)
    if (found?.reaction.ask && this.followDepth < MAX_FOLLOW_UPS && !this.askedText.has(normalize(found.reaction.ask))) {
      this.followDepth++;
      this.askedText.add(normalize(found.reaction.ask));
      const ask: BrainQuestion = {
        text: fillTemplate(found.reaction.ask, { name: this.memory.name }),
        tamil: found.reaction.askTamil,
        kind: 'question',
        followUp: true,
      };
      this.last = ask;
      return { ...this.turn(lines, ask), remember };
    }
    return { ...this.nextMain(lines), remember };
  }

  skip(): BrainTurn {
    if (this.last?.kind === 'scene') return this.sceneNext();
    if (this.last?.kind === 'vocab') return this.vocabNext('', true);
    return this.nextMain([]);
  }

  goToTopic(topicId: string): BrainTurn {
    const topic = this.db.topics.find((t) => t.id === topicId);
    if (!topic) return this.nextTopic();
    return this.openNextTopic([], topic);
  }

  nextTopic(): BrainTurn {
    return this.openNextTopic([], this.chooseTopic([]), true);
  }

  topics(): TopicChoice[] {
    const order = new Map(this.db.modes.flatMap((m) => m.groups).map((g, i) => [g, i] as const));
    return this.db.topics
      .filter((t) => t.id !== WARMUP_TOPIC)
      .sort((a, b) => (order.get(a.group) ?? 99) - (order.get(b.group) ?? 99) || a.order - b.order)
      .map((t) => ({ id: t.id, title: t.title, titleTamil: t.titleTamil, group: t.group, kind: t.kind }));
  }

  findTopic(text: string): TopicChoice | null {
    const topic = findTopicRequest(text, this.db.topics.filter((t) => t.id !== WARMUP_TOPIC));
    return topic ? { id: topic.id, title: topic.title, titleTamil: topic.titleTamil, group: topic.group, kind: topic.kind } : null;
  }

  // ---------- Reactions ----------

  private readonly clarified = new Set<string>();

  /**
   * The learner sent ONE word. Never answer that with a short, confusing reply:
   *  - a word from Lela's list gets a full sentence to say plus an interesting follow-up question;
   *  - a word from the vocabulary list is explained;
   *  - any other word: Lela asks what the learner means instead of guessing.
   * Returns null when this is not such a case (normal handling continues).
   */
  private singleWord(norm: string, asked: BrainQuestion | null): BrainTurn | null {
    if (!asked || asked.kind !== 'question' || asked.capture || norm === '' || norm.includes(' ')) return null;
    if (PLAIN_ANSWERS.has(norm) || norm.length < 2 || /\d/.test(norm)) return null;
    const stem = stemOf(norm);
    const entry = (this.db.singleWords ?? []).find((w) => w.word === norm || stemOf(w.word) === stem);
    if (entry && this.followDepth < MAX_FOLLOW_UPS + 1 && !this.askedText.has(normalize(entry.ask))) {
      this.followDepth++;
      this.askedText.add(normalize(entry.ask));
      const ask: BrainQuestion = { text: entry.ask, tamil: entry.askTamil, kind: 'question', followUp: true };
      this.last = ask;
      return {
        lines: [],
        ask,
        topic: this.info(),
        single: { word: entry.word, say: entry.say, sayTamil: entry.sayTamil, sentence: entry.sentence, sentenceTamil: entry.sentenceTamil },
      };
    }
    if (entry) return null; // already used its follow-up: carry on normally
    const key = `${asked.text}|${norm}`;
    if (this.clarified.has(key)) return null; // asked once already: accept the answer as it is
    const known = this.db.vocabulary.find((v) => v.word === norm || stemOf(v.word) === stem);
    if (known) {
      this.clarified.add(key);
      const line = this.book.pick('single-vocab', { word: known.word, tamil: known.tamil, example: known.example });
      return { ...this.turn([{ text: line.text, tamil: line.tamil ?? `${known.word} = ${known.tamil}. ${known.exampleTamil}` }], asked), retry: true };
    }
    this.clarified.add(key);
    const line = this.book.pick('single-unknown', { word: norm });
    if (!line.text) return null;
    return { ...this.turn([line], asked), retry: true };
  }

  private findReaction(norm: string): { reaction: LelaReaction; key: string } | null {
    const own = this.last?.questionId ? this.db.questions.find((q) => q.id === this.last?.questionId) : undefined;
    const lists: { key: string; reaction: LelaReaction }[][] = [];
    if (own?.reactions) lists.push(own.reactions.map((reaction, i) => ({ key: `${own.id}#${i}`, reaction })));
    if (this.topic) {
      lists.push(
        this.db.questions
          .filter((q) => q.topicId === this.topic?.id && q.id !== own?.id)
          .flatMap((q) => (q.reactions ?? []).map((reaction, i) => ({ key: `${q.id}#${i}`, reaction }))),
      );
    }
    for (const list of lists) {
      const open = list.filter((e) => !this.usedReactions.has(e.key));
      const hit = matchReaction(open.map((e) => e.reaction), norm);
      if (hit) {
        const entry = open[hit.index];
        this.usedReactions.add(entry.key);
        return entry;
      }
    }
    return null;
  }

  private ack(norm: string, words: number): Line {
    const type = words <= 2 ? 'ack-short' : NEGATIVE.test(norm) ? 'ack-neutral' : this.rng() < 0.55 ? 'ack-positive' : 'ack-neutral';
    let line = this.book.pick(type);
    if (line.text === this.lastAck) line = this.book.pick(type);
    this.lastAck = line.text;
    const name = this.memory.name;
    if (name && this.rng() < 0.25 && /[!.]$/.test(line.text)) line = { ...line, text: line.text.replace(/([!.])$/, `, ${name}$1`) };
    return line;
  }

  // ---------- Moving through topics ----------

  private modeDef(): LelaMode {
    return this.db.modes.find((m) => m.id === this.modeId) ?? this.db.modes[0];
  }

  private modeTopics(): LelaTopic[] {
    const mode = this.modeDef();
    const groupIndex = new Map(mode.groups.map((g, i) => [g, i] as const));
    const list = this.db.topics.filter((t) => t.id !== WARMUP_TOPIC && (mode.topicIds.includes(t.id) || groupIndex.has(t.group)));
    return list.sort((a, b) => (groupIndex.get(a.group) ?? 99) - (groupIndex.get(b.group) ?? 99) || a.order - b.order);
  }

  private limitFor(): number {
    if (this.topic?.id === WARMUP_TOPIC) return 3;
    if (this.topic?.kind === 'grammar') return 4;
    return this.modeDef().sequential ? 3 : 5;
  }

  private chooseTopic(lines: Line[]): LelaTopic {
    const all = this.modeTopics();
    let unused = all.filter((t) => !this.doneTopics.has(t.id) && t.id !== this.topic?.id);
    if (unused.length === 0) {
      this.doneTopics.clear();
      this.askedText.clear();
      this.asked.clear();
      this.usedDialogues.clear();
      this.usedWords.clear();
      this.usedReactions.clear();
      if (this.book.has('no-more-questions')) lines.push(this.book.pick('no-more-questions'));
      unused = all.filter((t) => t.id !== this.topic?.id);
      if (unused.length === 0) unused = all;
    }
    if (this.modeDef().sequential) return unused[0];
    const other = unused.filter((t) => t.group !== this.lastGroup);
    const pool = other.length > 0 ? other : unused;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  private nextMain(lines: Line[]): BrainTurn {
    this.followDepth = 0;
    this.tries = 0;
    if (this.topic && this.mainCount < this.limitFor()) {
      const q = this.takeQuestion();
      if (q) {
        this.mainCount++;
        if (this.mainCount > 1 && this.rng() < 0.35 && this.book.has('topic-more')) lines.push(this.book.pick('topic-more'));
        return this.turn(lines, this.toAsk(q));
      }
    }
    return this.openNextTopic(lines);
  }

  private openNextTopic(lines: Line[], requested?: LelaTopic, switched = false): BrainTurn {
    if (this.topic) this.doneTopics.add(this.topic.id);
    this.guard++;
    if (this.guard > 60) {
      this.guard = 0;
      return { lines, ask: null, topic: this.info(), finished: true };
    }
    const topic = requested ?? this.chooseTopic(lines);
    const introType = requested || switched ? 'topic-switch' : 'topic-intro';
    const turn = this.enterTopic(topic, lines, introType);
    this.guard = 0;
    return turn;
  }

  private enterTopic(topic: LelaTopic, lines: Line[], introType: string): BrainTurn {
    this.topic = topic;
    this.lastGroup = topic.group;
    this.mainCount = 0;
    this.followDepth = 0;
    this.tries = 0;
    this.scene = null;
    lines.push(this.book.pick(introType, { title: this.label(topic.title) }));

    if (topic.kind === 'scene') {
      const dialogue = this.pickDialogue(topic);
      if (!dialogue) return this.openNextTopic(lines);
      this.usedDialogues.add(dialogue.id);
      this.scene = { dialogue, index: 0 };
      lines.push({ text: dialogue.setup.en, tamil: dialogue.setup.tamil });
      return this.turn(lines, this.sceneAsk(dialogue, 0));
    }
    if (topic.kind === 'vocab') {
      this.words = this.orderWords(topic);
      this.wordsDone = 0;
      const word = this.words.shift();
      if (!word) return this.openNextTopic(lines);
      return this.turn(lines, this.vocabAsk(word));
    }
    if (topic.kind === 'grammar') {
      const note = this.db.grammarNotes.find((n) => n.id === topic.grammarNoteId);
      if (note) {
        const intro = this.book.pick('grammar-intro', { title: this.label(note.title), summary: note.summary });
        lines.pop(); // the grammar introduction replaces the plain topic line
        lines.push({ text: intro.text, tamil: note.summaryTamil });
      }
    }
    this.queue = this.orderQuestions(topic);
    const q = this.takeQuestion();
    if (!q) return this.openNextTopic(lines);
    this.mainCount = 1;
    return this.turn(lines, this.toAsk(q));
  }

  // ---------- Questions ----------

  private orderQuestions(topic: LelaTopic): LelaQuestion[] {
    const all = this.db.questions.filter((q) => q.topicId === topic.id);
    const out: LelaQuestion[] = [];
    for (const level of LEVEL_ORDER[this.level]) out.push(...all.filter((q) => q.level === level));
    return out;
  }

  private takeQuestion(): LelaQuestion | undefined {
    while (this.queue.length > 0) {
      const q = this.queue.shift() as LelaQuestion;
      if (this.asked.has(q.id) || this.askedText.has(normalize(q.text))) continue;
      this.markAsked(q);
      return q;
    }
    return undefined;
  }

  private markAsked(q: LelaQuestion): void {
    this.asked.add(q.id);
    this.askedText.add(normalize(q.text));
  }

  private toAsk(q: LelaQuestion): BrainQuestion {
    return {
      text: fillTemplate(q.text, { name: this.memory.name }),
      tamil: q.tamil,
      example: q.example,
      kind: q.expect ? 'grammar' : 'question',
      questionId: q.id,
      capture: q.capture,
      expect: q.expect,
    };
  }

  // ---------- Role-play scenes ----------

  private pickDialogue(topic: LelaTopic): LelaDialogue | undefined {
    const all = this.db.dialogues.filter((d) => d.topicId === topic.id);
    const fresh = all.filter((d) => !this.usedDialogues.has(d.id));
    const pool = fresh.length > 0 ? fresh : all;
    for (const level of LEVEL_ORDER[this.level]) {
      const hit = pool.find((d) => d.level === level);
      if (hit) return hit;
    }
    return pool[0];
  }

  private sceneAsk(dialogue: LelaDialogue, index: number): BrainQuestion {
    const turn = dialogue.turns[index];
    return { text: turn.lela, tamil: turn.lelaTamil, example: turn.example, kind: 'scene' };
  }

  private sceneNext(): BrainTurn {
    const scene = this.scene;
    if (!scene) return this.nextMain([]);
    scene.index++;
    if (scene.index < scene.dialogue.turns.length) return this.turn([], this.sceneAsk(scene.dialogue, scene.index));
    this.scene = null;
    return this.openNextTopic([this.book.pick('scene-end')]);
  }

  // ---------- Vocabulary ----------

  private orderWords(topic: LelaTopic): LelaWord[] {
    const all = this.db.vocabulary.filter((w) => w.topicId === topic.id);
    const fresh = all.filter((w) => !this.usedWords.has(w.id));
    const pool = fresh.length >= 5 ? fresh : all;
    const out: LelaWord[] = [];
    for (const level of LEVEL_ORDER[this.level]) out.push(...pool.filter((w) => w.level === level));
    return out.slice(0, 40);
  }

  private vocabAsk(word: LelaWord): BrainQuestion {
    this.usedWords.add(word.id);
    const line = this.book.pick('vocab-intro', { word: word.word, tamil: word.tamil, example: word.example });
    return { text: line.text, tamil: `${word.word} = ${word.tamil}. ${word.exampleTamil}`, example: word.example, kind: 'vocab', word: word.word };
  }

  private vocabNext(userText: string, skipped = false): BrainTurn {
    const asked = this.last;
    const word = asked?.word ?? '';
    const stem = stemOf(word);
    const used = stem.length > 0 && new RegExp(`(^|[^a-z'])${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z']*`, 'i').test(userText);
    if (!used && !skipped && this.tries < 1) {
      this.tries++;
      const line = this.book.pick('vocab-retry', { word });
      return { ...this.turn([line], asked), retry: true };
    }
    const lines: Line[] = [];
    if (skipped) lines.push({ text: '' });
    else lines.push(used ? this.book.pick('vocab-praise', { word }) : this.book.pick('give-up'));
    this.tries = 0;
    this.wordsDone++;
    const nextWord = this.words.shift();
    if (nextWord && this.wordsDone < 5) return this.turn(lines.filter((l) => l.text), this.vocabAsk(nextWord));
    return this.openNextTopic(lines.filter((l) => l.text));
  }

  // ---------- Helpers ----------

  private label(title: string): string {
    const first = title.split(' ')[0];
    return /[A-Z]/.test(first.slice(1)) || first.length === 1 || /^(Angular|Linux|Git|API|HR|Telephone)$/.test(first) ? title : lowerFirst(title);
  }

  private info(): TopicInfo | null {
    return this.topic ? { id: this.topic.id, title: this.topic.title, titleTamil: this.topic.titleTamil, group: this.topic.group } : null;
  }

  private turn(lines: Line[], ask: BrainQuestion | null): BrainTurn {
    this.last = ask;
    return { lines: lines.filter((l) => l.text), ask, topic: this.info() };
  }
}
