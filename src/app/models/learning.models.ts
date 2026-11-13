// Data shapes for the learning content (the JSON files in public/data) and for saved progress.
// The JSON files are produced by scripts/build-data.mjs, which validates the same shapes.

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Tense =
  | 'present'
  | 'present-continuous'
  | 'past'
  | 'future'
  | 'present-perfect'
  | 'modal'
  | 'imperative';
export type SentenceType = 'statement' | 'question' | 'negative' | 'request';

export interface ContentCategory {
  id: string;
  prefix: string;
  label: string;
  labelTamil: string;
  file: string;
  count: number;
  /** Set for the groups added later (they carry meaning / explain / words). */
  added?: number;
  /** 2 = the 1,000 words added with the extra-vocabulary update. */
  batch?: number;
}

export interface Manifest {
  version: string;
  vocabCategories: ContentCategory[];
  sentenceCategories: ContentCategory[];
  totals: { vocab: number; sentences: number; grammar: number; roleplays: number; expressions: number };
}

export interface Word {
  id: string;
  word: string;
  /** Simple English meaning (present in the newer word groups). */
  meaning?: string;
  tamil: string;
  pos: string;
  pron: string;
  example: string;
  exampleTamil: string;
  synonyms: string[];
  level: Level;
}

export interface SentenceAlternative {
  en: string;
  tamil: string;
}

export interface Sentence {
  id: string;
  en: string;
  tamil: string;
  context: string;
  tense: Tense;
  type: SentenceType;
  alt?: SentenceAlternative;
  /** Simple English explanation (newer sentence groups). */
  explain?: string;
  /** Useful vocabulary words in the sentence (newer sentence groups). */
  words?: string[];
  /** Real-life use: where and when to say it (item-14 sentence groups). */
  usage?: string;
  /** The question Leela asks to get the learner speaking (item-14 sentence groups). */
  leelaQ?: string;
  /** A suggested answer to Leela's question (item-14 sentence groups). */
  answer?: string;
}

export interface TamilPair {
  en: string;
  tamil: string;
}

export interface GrammarLesson {
  id: string;
  title: string;
  titleTamil: string;
  topic: 'tense' | 'question' | 'negative' | 'modal' | 'other';
  tense?: Tense;
  summary: string;
  summaryTamil: string;
  formula: string;
  uses: TamilPair[];
  examples: TamilPair[];
  mistakes: { wrong: string; right: string; noteTamil: string }[];
}

export interface RoleplayTurn {
  partner: TamilPair;
  /** What the learner can say. The first option is the recommended one. Empty on the last turn. */
  replies: TamilPair[];
  tipTamil?: string;
}

export interface Roleplay {
  id: string;
  title: string;
  titleTamil: string;
  group: 'office-meeting' | 'interview' | 'everyday';
  level: Level;
  setting: string;
  settingTamil: string;
  turns: RoleplayTurn[];
}

export interface Expression {
  plain: string;
  better: string[];
  tamil: string;
  exampleBefore: string;
  exampleAfter: string;
}

// ---------- Exercises ----------

export type ExerciseKind =
  | 'meaning'
  | 'tamil-word'
  | 'fill-blank'
  | 'rearrange'
  | 'translate-choose'
  | 'translate-type';

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  /** Instruction line, e.g. "What does this word mean?" */
  title: string;
  /** Main text to show (a word, a Tamil sentence, a sentence with a blank ...). */
  prompt: string;
  /** Small text under the prompt (pronunciation, Tamil hint ...). */
  hint?: string;
  /** Choices for multiple-choice kinds. */
  options?: string[];
  /** Shuffled pieces for "rearrange". */
  tokens?: string[];
  /** The correct answer (an option, the full English sentence, ...). */
  answer: string;
  /** Shown after answering. */
  explanation?: string;
  /** English text that can be read aloud after answering. */
  speak?: string;
  wordId?: string;
  sentenceId?: string;
}

export interface AnswerCheck {
  correct: boolean;
  /** 0..1, only for typed answers. */
  closeness?: number;
}

// ---------- Saved progress ----------

export interface SrsEntry {
  /** Leitner box 0..5. Higher = better known. */
  box: number;
  /** yyyy-mm-dd on which the word should be revised next. */
  due: string;
  seen: number;
  wrong: number;
}

export interface DayRecord {
  wordsLearned: boolean;
  sentencesLearned: boolean;
  practiceDone: boolean;
  speakingDone: boolean;
  exercisesCorrect: number;
  exercisesTotal: number;
  speakingAttempts: number;
}

export interface QuizResult {
  date: string;
  kind: 'daily' | 'revision' | 'quick';
  correct: number;
  total: number;
}

export interface DailyPlan {
  date: string;
  wordIds: string[];
  sentenceIds: string[];
}

export interface Settings {
  speechRate: number;
  showTamil: boolean;
}

export interface ChatWordEntry {
  date: string;
  how: 'taught' | 'seen';
}

export interface ProgressState {
  version: 1;
  favWords: string[];
  favSentences: string[];
  /** Words the learner marked "I know this word". */
  learnedWords: string[];
  /** Words collected from Lela's conversations: word id -> when, and whether Lela taught it or just used it. */
  chatWords: Record<string, ChatWordEntry>;
  srs: Record<string, SrsEntry>;
  sentencesLearned: Record<string, string>;
  /** Next unseen position per category id, for choosing new daily words and sentences. */
  wordCursor: Record<string, number>;
  sentenceCursor: Record<string, number>;
  days: Record<string, DayRecord>;
  quizzes: QuizResult[];
  plan: DailyPlan | null;
  settings: Settings;
}

// ---------- Speaking ----------

export type DiffStatus = 'match' | 'missing' | 'extra';

export interface DiffToken {
  text: string;
  status: DiffStatus;
}

export interface ComparisonResult {
  /** Words of the target sentence, marked said / not said. */
  target: DiffToken[];
  /** Words the learner said that are not in the target. */
  extra: string[];
  /** 0..1: matched target words / target words. */
  accuracy: number;
  /** 0..1: symmetrical similarity, used to pick the closest option. */
  similarity: number;
}

export interface ExpressionTip {
  plain: string;
  better: string[];
  tamil: string;
  exampleBefore: string;
  exampleAfter: string;
}
