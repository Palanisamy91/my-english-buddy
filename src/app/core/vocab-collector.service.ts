import { Injectable, inject } from '@angular/core';
import { Word } from '../models/learning.models';
import { DataService } from './data.service';
import { ProgressService } from './progress.service';
import { VocabIndex, buildVocabIndex, findVocab } from './vocab-index';

/** A conversation message, as far as the collector needs it. */
export interface CollectableMessage {
  from: 'lela' | 'user';
  text: string;
}

/**
 * Collects the vocabulary words that come up in Lela's conversations and saves them on this device
 * (in the learner's progress, so it works offline). It only ADDS to the "From my conversations" list:
 * favourites, learned marks and the revision list are never changed by it.
 */
@Injectable({ providedIn: 'root' })
export class VocabCollectorService {
  private readonly data = inject(DataService);
  private readonly progress = inject(ProgressService);
  private index: Promise<VocabIndex | null> | null = null;

  /** The word index is built once, from the 4,000+ words (they load category by category and are cached). */
  private ensureIndex(): Promise<VocabIndex | null> {
    this.index ??= (async () => {
      try {
        const manifest = await this.data.manifest();
        const lists = await Promise.all(manifest.vocabCategories.map((c) => this.data.vocabulary(c.id)));
        return buildVocabIndex(lists.flat());
      } catch {
        this.index = null; // offline before the words were ever loaded: try again next time
        return null;
      }
    })();
    return this.index;
  }

  /** Collects the words found in one message. "taught" is for words Lela deliberately teaches. */
  async collectText(text: string, how: 'taught' | 'seen' = 'seen'): Promise<number> {
    const index = await this.ensureIndex();
    if (!index || !text) return 0;
    return this.progress.collectChatWords(findVocab(text, index), how);
  }

  /** Collects the exact word Lela taught (e.g. in vocabulary practice). */
  async collectTaught(word: string): Promise<number> {
    return this.collectText(word, 'taught');
  }

  /** The vocabulary words (full records) found in some messages, for the "Words from this chat" panel. */
  async wordsIn(messages: readonly CollectableMessage[]): Promise<Word[]> {
    const index = await this.ensureIndex();
    if (!index) return [];
    const ids = new Set<string>();
    for (const m of messages) for (const id of findVocab(m.text, index)) ids.add(id);
    return this.data.wordsByIds([...ids]);
  }

  /** Collects from saved conversations (the learner's own history on this device). Safe to run again. */
  async collectFromMessages(messages: readonly CollectableMessage[]): Promise<number> {
    const index = await this.ensureIndex();
    if (!index) return 0;
    const ids = new Set<string>();
    for (const m of messages) for (const id of findVocab(m.text, index)) ids.add(id);
    return this.progress.collectChatWords([...ids], 'seen');
  }
}
