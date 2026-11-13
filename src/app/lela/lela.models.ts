import type { Level } from '../models/learning.models';

export type { Level };

// ---------- Records stored in db.json (see docs/DB-FORMAT.md) ----------

export type TopicKind = 'chat' | 'scene' | 'grammar' | 'vocab';

export interface LelaLevelInfo {
  id: Level;
  label: string;
  labelTamil: string;
  description: string;
  defaultRate: number;
}

export interface LelaMode {
  id: string;
  label: string;
  labelTamil: string;
  icon: string;
  description: string;
  descriptionTamil: string;
  groups: string[];
  topicIds: string[];
  sequential: boolean;
}

export interface LelaTopic {
  id: string;
  group: string;
  kind: TopicKind;
  title: string;
  titleTamil: string;
  order: number;
  keywords: string[];
  grammarNoteId?: string;
}

export interface LelaReaction {
  /** Lower-case words or short phrases. The reaction fires when the answer contains one of them. */
  if: string[];
  say: string;
  ask?: string;
  askTamil?: string;
}

export interface LelaQuestion {
  id: string;
  topicId: string;
  level: Level;
  text: string;
  tamil: string;
  example: string;
  capture?: 'name' | 'age' | 'hometown' | 'job';
  reactions?: LelaReaction[];
  expect?: { pattern: string; hint: string; hintTamil: string };
}

export interface LelaDialogueTurn {
  lela: string;
  lelaTamil: string;
  example: string;
  exampleTamil: string;
}

export interface LelaDialogue {
  id: string;
  topicId: string;
  level: Level;
  title: string;
  titleTamil: string;
  setup: { en: string; tamil: string };
  turns: LelaDialogueTurn[];
}

export interface SingleWord {
  id: string;
  word: string;
  say: string;
  sayTamil: string;
  sentence: string;
  sentenceTamil: string;
  ask: string;
  askTamil: string;
}

export interface LelaWord {
  id: string;
  topicId: string;
  word: string;
  pron: string;
  pos: string;
  tamil: string;
  example: string;
  exampleTamil: string;
  level: Level;
}

export interface LelaMistake {
  id: string;
  level: Level;
  pattern: string;
  replace: string;
  wrongExample: string;
  rightExample: string;
  english: string;
  tamil: string;
}

export interface LelaGrammarNote {
  id: string;
  title: string;
  titleTamil: string;
  summary: string;
  summaryTamil: string;
  formula: string;
  examples: { en: string; tamil: string }[];
}

export type IntentAction = 'reply' | 'repeat' | 'change-topic' | 'end' | 'help' | 'slower' | 'faster' | 'skip';

export interface LelaIntent {
  id: string;
  action: IntentAction;
  /** true: the whole utterance must be (about) this phrase. false: the phrase may end a longer answer. */
  standalone: boolean;
  patterns: string[];
  replies: { en: string; tamil: string }[];
}

export interface LelaPhrase {
  id: string;
  type: string;
  text: string;
  tamil?: string;
}

/** The whole conversation database (db.json). Every collection is a top-level list. */
export interface LelaDb {
  levels: LelaLevelInfo[];
  modes: LelaMode[];
  topics: LelaTopic[];
  questions: LelaQuestion[];
  dialogues: LelaDialogue[];
  vocabulary: LelaWord[];
  mistakes: LelaMistake[];
  grammarNotes: LelaGrammarNote[];
  intents: LelaIntent[];
  phrases: LelaPhrase[];
  /** Optional: the 2,000 practice conversations (question + natural reply). Older db.json files do not have it. */
  conversations?: Conversation[];
  conversationCategories?: ConversationCategory[];
  /** Optional: Lela's replies to a single word ("hungry", "office"). */
  singleWords?: SingleWord[];
}

/** One practice exchange: someone says `en`, you can answer with `reply`. */
export interface Conversation {
  id: string;
  category: string;
  context: string;
  level: Level;
  en: string;
  tamil: string;
  reply: string;
  replyTamil: string;
}

export interface ConversationCategory {
  id: string;
  label: string;
  labelTamil: string;
  count: number;
}

export const DB_COLLECTIONS = [
  'levels', 'modes', 'topics', 'questions', 'dialogues', 'vocabulary', 'mistakes', 'grammarNotes', 'intents', 'phrases',
] as const;

// ---------- Conversation state ----------

/** What Lela remembers about the learner during a conversation. */
export interface LelaMemory {
  name?: string;
  age?: string;
  hometown?: string;
  job?: string;
}

export type MessageKind = 'normal' | 'correction' | 'praise' | 'hint' | 'note';

export interface CorrectionCard {
  original: string;
  corrected: string;
  explanations: { found: string; replacement: string; english: string; tamil: string }[];
  checker: 'rule-based' | 'ai';
  disclaimer: string;
}

export interface LelaMessage {
  id: number;
  from: 'lela' | 'user';
  text: string;
  tamil?: string;
  kind: MessageKind;
  /** Where the learner's words came from. */
  source?: 'voice' | 'typed';
  /** Sentence correction details (on Lela's correction message). */
  correction?: CorrectionCard;
  /** Set on the learner's message after it was checked and found fine. */
  looksCorrect?: boolean;
  /** A sample answer the learner can open with "Need help?". */
  example?: string;
  topic?: string;
}

/** One question (or scene line, word task, grammar task) that Lela asked and is waiting on. */
export interface BrainQuestion {
  text: string;
  tamil?: string;
  example?: string;
  kind: 'question' | 'scene' | 'vocab' | 'grammar';
  questionId?: string;
  capture?: LelaQuestion['capture'];
  /** Grammar tasks: what the answer should contain. */
  expect?: LelaQuestion['expect'];
  /** Vocabulary tasks: the word the learner must use. */
  word?: string;
  /** A follow-up that Lela made up from the previous answer (not a stored main question). */
  followUp?: boolean;
}

export interface TopicInfo {
  id: string;
  title: string;
  titleTamil: string;
  group: string;
}

/** What the brain returns for each turn: lines Lela says, then (maybe) one question. */
export interface BrainTurn {
  /** Spoken before the question (reaction, praise, topic introduction ...). */
  lines: { text: string; tamil?: string }[];
  ask: BrainQuestion | null;
  topic: TopicInfo | null;
  /** What to remember about the learner. */
  remember?: Partial<LelaMemory>;
  /** The learner is asked to try the same task again; the question text is not repeated. */
  retry?: boolean;
  /** The conversation has no more content to offer (rare). */
  finished?: boolean;
  /** The learner sent only one word we know: Lela turns it into a full sentence. */
  single?: { word: string; say: string; sayTamil: string; sentence: string; sentenceTamil: string };
}

export interface TopicChoice extends TopicInfo {
  kind: TopicKind;
}
