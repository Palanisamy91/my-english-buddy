import { Injectable, inject } from '@angular/core';
import { ComparisonResult, ExpressionTip } from '../models/learning.models';
import { CorrectionService } from '../services/correction.service';
import { DataService } from './data.service';
import { CheckerKind, CorrectionOutcome, SENTENCE_CORRECTOR } from './sentence-corrector';
import { compareSpeech, findExpressionTips } from './speech-compare';

export type { CheckerKind } from './sentence-corrector';

export interface SpeakingFeedback {
  kind: CheckerKind;
  /** Exactly what was recognised (or typed). */
  heard: string;
  target?: string;
  comparison?: ComparisonResult;
  outcome: CorrectionOutcome;
  /** Tamil explanation of the grammar fixes, empty when nothing was changed. */
  tamilExplanation: string;
  tips: ExpressionTip[];
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  // The corrector is injected through a token: swap it in app.config.ts to use an AI service later.
  private readonly corrector = inject(SENTENCE_CORRECTOR);
  private readonly rules = inject(CorrectionService);
  private readonly data = inject(DataService);

  readonly ruleCount = this.rules.ruleCount;
  readonly limitations = this.rules.limitations;

  /**
   * Checks what the learner said or typed. With a `target`, the words are also compared with it.
   * Any sentence is accepted: it does not have to exist in the practice data.
   */
  async analyse(heard: string, target?: string): Promise<SpeakingFeedback> {
    const text = heard.trim();
    let outcome: CorrectionOutcome;
    try {
      outcome = await this.corrector.correct(text);
    } catch {
      outcome = {
        kind: this.corrector.kind,
        original: text,
        corrected: text,
        changed: false,
        explanations: [],
        rulesChecked: 0,
        disclaimer: 'The correction could not be done this time. Your sentence is shown unchanged.',
      };
    }
    let tips: ExpressionTip[] = [];
    try {
      tips = findExpressionTips(text, await this.data.expressions());
    } catch {
      tips = []; // the phrase list is optional; the correction still works
    }
    return {
      kind: outcome.kind,
      heard: text,
      target,
      comparison: target ? compareSpeech(target, text) : undefined,
      outcome,
      tamilExplanation: explain(outcome),
      tips,
    };
  }
}

function explain(outcome: CorrectionOutcome): string {
  return outcome.explanations.map((e) => `• ${e.found} → ${e.replacement}\n${e.tamil}`).join('\n\n');
}
