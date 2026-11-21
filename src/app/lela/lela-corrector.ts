import { Injectable, InjectionToken, inject } from '@angular/core';
import { RuleBasedCorrector } from '../core/rule-based-corrector';
import type { CorrectionOutcome, SentenceCorrector } from '../core/sentence-corrector';
import { LelaDataService } from './lela-data.service';
import { applyMistakes, sameIgnoringStyle } from './lela-text';

/**
 * Free corrector for Lela: the app's built-in grammar rules PLUS the "mistakes" list in db.json
 * (common Indian-English mistakes such as "open the light"). It is rule-based, NOT AI.
 *
 * Spoken sentences have no punctuation, so a difference in capital letters, commas or full stops alone
 * is NOT treated as a mistake.
 */
@Injectable({ providedIn: 'root' })
export class LelaDbCorrector implements SentenceCorrector {
  readonly kind = 'rule-based' as const;
  private readonly rules = inject(RuleBasedCorrector);
  private readonly data = inject(LelaDataService);
  private readonly compiled = new Map<string, RegExp | null>();

  async correct(text: string): Promise<CorrectionOutcome> {
    const original = text.trim();
    let mistakes: Awaited<ReturnType<LelaDataService['db']>>['mistakes'] = [];
    try {
      mistakes = (await this.data.db()).mistakes;
    } catch {
      /* the grammar rules still work without the database */
    }
    const first = applyMistakes(original, mistakes, this.compiled);
    const base = await this.rules.correct(first.text);
    const changed = !sameIgnoringStyle(original, base.corrected);
    const explanations = changed
      ? [
          ...first.fixes.map((f) => ({ found: f.found, replacement: f.replacement, english: f.english, tamil: f.tamil })),
          ...base.explanations.map((e) => ({ found: e.found, replacement: e.replacement, english: e.english, tamil: e.tamil })),
        ]
      : [];
    return {
      kind: this.kind,
      original,
      corrected: changed ? base.corrected : original,
      changed,
      explanations,
      rulesChecked: base.rulesChecked + mistakes.length,
      disclaimer:
        `Rule-based check: ${base.rulesChecked} grammar rules and ${mistakes.length} common-mistake rules. ` +
        'It is not AI. It finds common mistakes only, so "no mistakes found" does not prove a sentence is perfect, and a suggestion can be wrong.',
    };
  }
}

/**
 * The corrector Lela uses. To connect a real AI later, write a class that implements SentenceCorrector
 * (call your own backend; never put an API key in the app) and provide it:
 *   { provide: LELA_CORRECTOR, useClass: MyAiCorrector }
 */
export const LELA_CORRECTOR = new InjectionToken<SentenceCorrector>('LELA_CORRECTOR', {
  providedIn: 'root',
  factory: () => inject(LelaDbCorrector),
});
