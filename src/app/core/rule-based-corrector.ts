import { Injectable, inject } from '@angular/core';
import { CorrectionService } from '../services/correction.service';
import type { CorrectionExplanation, CorrectionOutcome, SentenceCorrector } from './sentence-corrector';

/**
 * Free corrector: fixed, hand-written grammar rules (see CorrectionService). It runs on the device,
 * needs no internet and no key, and is NOT AI. It only knows common beginner mistakes.
 */
@Injectable({ providedIn: 'root' })
export class RuleBasedCorrector implements SentenceCorrector {
  readonly kind = 'rule-based' as const;
  private readonly rules = inject(CorrectionService);

  correct(text: string): Promise<CorrectionOutcome> {
    const original = text.trim();
    const result = this.rules.check(original);
    const explanations: CorrectionExplanation[] = result.issues.flatMap((issue) =>
      issue.changes.map((change) => ({
        found: change.found,
        replacement: change.replacement,
        english: issue.english,
        tamil: issue.tamil,
        example: issue.example,
      })),
    );
    return Promise.resolve({
      kind: this.kind,
      original,
      corrected: result.corrected,
      changed: result.hasMistakes,
      explanations,
      rulesChecked: result.rulesChecked,
      disclaimer:
        `Rule-based check: it applies ${result.rulesChecked} fixed rules for common beginner mistakes. ` +
        'It is not AI, so it cannot fix every sentence and it can be wrong. Always read the result yourself.',
    });
  }
}
