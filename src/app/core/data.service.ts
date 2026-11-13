import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ContentCategory,
  Expression,
  GrammarLesson,
  Manifest,
  Roleplay,
  Sentence,
  Word,
} from '../models/learning.models';
import { prefixOf } from './plan';

/** A readable error for the screen (the technical cause is kept in `cause`). */
export class DataError extends Error {
  constructor(message: string, readonly path: string, override readonly cause?: unknown) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * Loads the learning content from the JSON files in public/data.
 * Each file is fetched once, when first needed, and kept in memory. Files are small groups
 * (one category each), so the app never loads everything at start-up.
 * Once fetched, the browser's cache (see the service worker) lets the files work offline.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<unknown>>();

  manifest(): Promise<Manifest> {
    return this.get<Manifest>('data/manifest.json');
  }

  async vocabulary(categoryId: string): Promise<Word[]> {
    const category = await this.category('vocab', categoryId);
    return this.get<Word[]>('data/' + category.file);
  }

  async sentences(categoryId: string): Promise<Sentence[]> {
    const category = await this.category('sentences', categoryId);
    return this.get<Sentence[]>('data/' + category.file);
  }

  grammar(): Promise<GrammarLesson[]> {
    return this.get<GrammarLesson[]>('data/grammar.json');
  }

  roleplays(): Promise<Roleplay[]> {
    return this.get<Roleplay[]>('data/roleplays.json');
  }

  expressions(): Promise<Expression[]> {
    return this.get<Expression[]>('data/expressions.json');
  }

  /** Looks up words by id, loading only the categories that are needed. Unknown ids are skipped. */
  async wordsByIds(ids: string[]): Promise<Word[]> {
    const manifest = await this.manifest();
    const wanted = new Set(ids);
    const prefixes = new Set(ids.map(prefixOf));
    const categories = manifest.vocabCategories.filter((c) => prefixes.has(c.prefix));
    const lists = await Promise.all(categories.map((c) => this.vocabulary(c.id)));
    const found = new Map(lists.flat().filter((w) => wanted.has(w.id)).map((w) => [w.id, w]));
    return ids.map((id) => found.get(id)).filter((w): w is Word => w !== undefined);
  }

  async sentencesByIds(ids: string[]): Promise<Sentence[]> {
    const manifest = await this.manifest();
    const wanted = new Set(ids);
    const prefixes = new Set(ids.map(prefixOf));
    const categories = manifest.sentenceCategories.filter((c) => prefixes.has(c.prefix));
    const lists = await Promise.all(categories.map((c) => this.sentences(c.id)));
    const found = new Map(lists.flat().filter((s) => wanted.has(s.id)).map((s) => [s.id, s]));
    return ids.map((id) => found.get(id)).filter((s): s is Sentence => s !== undefined);
  }

  /** A pool of other words for wrong answers in quizzes: the first words of up to 3 categories. */
  async distractorWords(): Promise<Word[]> {
    const manifest = await this.manifest();
    const lists = await Promise.all(manifest.vocabCategories.slice(0, 4).map((c) => this.vocabulary(c.id)));
    return lists.flat();
  }

  async distractorSentences(): Promise<Sentence[]> {
    const manifest = await this.manifest();
    const lists = await Promise.all(manifest.sentenceCategories.slice(0, 4).map((c) => this.sentences(c.id)));
    return lists.flat();
  }

  private async category(kind: 'vocab' | 'sentences', id: string): Promise<ContentCategory> {
    const manifest = await this.manifest();
    const list = kind === 'vocab' ? manifest.vocabCategories : manifest.sentenceCategories;
    const found = list.find((c) => c.id === id);
    if (!found) throw new DataError(`Unknown category "${id}".`, id);
    return found;
  }

  private get<T>(path: string): Promise<T> {
    const known = this.cache.get(path);
    if (known) return known as Promise<T>;
    const request: Promise<T> = this.fetchJson<T>(path).catch((cause: unknown) => {
      this.cache.delete(path); // allow a retry later
      throw new DataError(
        'Could not load the lesson data. If you are offline, open this screen once while online so it can be saved, then try again.',
        path,
        cause,
      );
    });
    this.cache.set(path, request);
    return request;
  }

  private fetchJson<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(path));
  }
}
