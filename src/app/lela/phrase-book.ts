import type { LelaPhrase } from './lela.models';
import { fillTemplate } from './lela-text';

/**
 * Lela's fixed lines from db.json ("phrases"), picked at random without repeating the same line twice
 * in a row. Every sentence Lela says on her own comes from the database, not from code.
 */
export class PhraseBook {
  private readonly byType = new Map<string, LelaPhrase[]>();
  private readonly last = new Map<string, number>();

  constructor(
    phrases: readonly LelaPhrase[],
    private readonly rng: () => number = Math.random,
  ) {
    for (const phrase of phrases) {
      const list = this.byType.get(phrase.type) ?? [];
      list.push(phrase);
      this.byType.set(phrase.type, list);
    }
  }

  has(type: string): boolean {
    return (this.byType.get(type)?.length ?? 0) > 0;
  }

  pick(type: string, vars: Record<string, string | undefined> = {}): { text: string; tamil?: string } {
    const list = this.byType.get(type);
    if (!list || list.length === 0) return { text: '' };
    let index = Math.floor(this.rng() * list.length);
    if (list.length > 1 && index === this.last.get(type)) index = (index + 1) % list.length;
    this.last.set(type, index);
    const phrase = list[index];
    return {
      text: fillTemplate(phrase.text, vars),
      tamil: phrase.tamil ? fillTemplate(phrase.tamil, vars) : undefined,
    };
  }
}
