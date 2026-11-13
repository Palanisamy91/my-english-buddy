export type Sender = 'user' | 'assistant';

export interface WordMeaning {
  english: string;
  tamil: string;
}

export interface TranslationResult {
  /** Tamil text for the sentences we know, or null if none were found. */
  tamil: string | null;
  /** true only if every sentence was found in the offline dictionary. */
  complete: boolean;
  wordMeanings: WordMeaning[];
}

export interface ChatMessage {
  id: number;
  sender: Sender;
  text: string;
  correctedText?: string;
  tamilExplanation?: string;
  translation?: TranslationResult;
}

// ---------- English correction ----------

export type CorrectionCategory =
  | 'spelling'
  | 'agreement'
  | 'tense'
  | 'verb-form'
  | 'articles'
  | 'plurals'
  | 'word-choice'
  | 'prepositions'
  | 'capitalization';

/** One place in the sentence that was changed. */
export interface CorrectionChange {
  found: string;
  replacement: string;
}

/** One rule that fired. A rule may have changed several places. */
export interface CorrectionIssue {
  ruleId: string;
  category: CorrectionCategory;
  changes: CorrectionChange[];
  english: string;
  tamil: string;
  example: string;
}

export interface CorrectionResult {
  original: string;
  corrected: string;
  hasMistakes: boolean;
  issues: CorrectionIssue[];
  /** How many rules were checked. Shown to the user to be transparent. */
  rulesChecked: number;
}

export interface LimitationNote {
  english: string;
  tamil: string;
}
