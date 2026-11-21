import { InjectionToken, inject } from '@angular/core';
import { RuleBasedCorrector } from './rule-based-corrector';

/**
 * How a correction was made. The screens show this label next to every result,
 * so a learner always knows whether a person-written rule or an AI model made the suggestion.
 */
export type CheckerKind = 'rule-based' | 'ai';

/** One change that was made, with the reason (English and Tamil). */
export interface CorrectionExplanation {
  found: string;
  replacement: string;
  english: string;
  tamil: string;
  example?: string;
}

/** What every corrector returns. The UI depends only on this shape. */
export interface CorrectionOutcome {
  kind: CheckerKind;
  /** The text that was checked, exactly as given. */
  original: string;
  /** The suggested sentence. Equal to `original` (apart from spacing) when nothing was changed. */
  corrected: string;
  changed: boolean;
  explanations: CorrectionExplanation[];
  /** Number of rules that were checked (rule-based only; 0 for others). */
  rulesChecked: number;
  /** An honest warning about this checker's limits, shown with the result. */
  disclaimer: string;
}

/**
 * The correction contract. To add an AI checker later, write a class that implements this
 * interface (call your own backend, never put an API key in the app), then replace the provider in
 * app.config.ts: `{ provide: SENTENCE_CORRECTOR, useClass: MyAiCorrector }`.
 * No screen needs to change.
 */
export interface SentenceCorrector {
  readonly kind: CheckerKind;
  correct(text: string): Promise<CorrectionOutcome>;
}

/** The free version uses the rule-based corrector by default. */
export const SENTENCE_CORRECTOR = new InjectionToken<SentenceCorrector>('SENTENCE_CORRECTOR', {
  providedIn: 'root',
  factory: () => inject(RuleBasedCorrector),
});
