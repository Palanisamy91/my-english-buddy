import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DB_COLLECTIONS, type LelaDb } from './lela.models';
import { PhraseBook } from './phrase-book';

/**
 * Where Lela's database comes from.
 *  - static (default): the file db.json, copied to public/data/db.json by `npm run db`. Works offline.
 *  - api: a json-server running on your computer (`npm run api`), one endpoint per collection:
 *         GET {baseUrl}/topics, /questions, /dialogues ... To use it add this to app.config.ts:
 *         { provide: LELA_DB_SOURCE, useValue: { mode: 'api', baseUrl: 'http://localhost:3000' } }
 */
export type LelaDbSource = { mode: 'static'; url: string } | { mode: 'api'; baseUrl: string };

export const LELA_DB_SOURCE = new InjectionToken<LelaDbSource>('LELA_DB_SOURCE', {
  providedIn: 'root',
  factory: () => ({ mode: 'static', url: 'data/db.json' }),
});

export class LelaDataError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = 'LelaDataError';
  }
}

/** Checks the shape of a loaded database. Throws a readable error when something is missing. */
export function checkDb(raw: unknown): LelaDb {
  if (typeof raw !== 'object' || raw === null) throw new LelaDataError('db.json is empty or not an object.');
  const db = raw as Record<string, unknown>;
  for (const name of DB_COLLECTIONS) {
    if (!Array.isArray(db[name])) throw new LelaDataError(`db.json has no "${name}" list. Run "npm run db" to check the file.`);
  }
  const need: (typeof DB_COLLECTIONS)[number][] = ['modes', 'topics', 'questions', 'phrases', 'levels'];
  for (const name of need) {
    if ((db[name] as unknown[]).length === 0) throw new LelaDataError(`db.json "${name}" is empty. Run "npm run db" to check the file.`);
  }
  return raw as LelaDb;
}

@Injectable({ providedIn: 'root' })
export class LelaDataService {
  private readonly http = inject(HttpClient);
  private readonly source = inject(LELA_DB_SOURCE);
  private cache: Promise<LelaDb> | null = null;
  private book: PhraseBook | null = null;

  /** The whole database. Loaded once, then kept in memory. */
  db(): Promise<LelaDb> {
    if (!this.cache) {
      this.cache = this.load().catch((cause: unknown) => {
        this.cache = null; // allow "try again"
        throw cause instanceof LelaDataError
          ? cause
          : new LelaDataError(
              this.source.mode === 'api'
                ? `Could not reach the database API at ${this.source.baseUrl}. Is "npm run api" running?`
                : 'Could not load Lela\'s database (data/db.json). If you are offline, open Lela once while online so it can be saved.',
              cause,
            );
      });
    }
    return this.cache;
  }

  async phraseBook(): Promise<PhraseBook> {
    const db = await this.db();
    this.book ??= new PhraseBook(db.phrases);
    return this.book;
  }

  private async load(): Promise<LelaDb> {
    if (this.source.mode === 'static') {
      return checkDb(await firstValueFrom(this.http.get<unknown>(this.source.url)));
    }
    const base = this.source.baseUrl.replace(/\/+$/, '');
    const entries = await Promise.all(
      DB_COLLECTIONS.map(async (name) => [name, await firstValueFrom(this.http.get<unknown>(`${base}/${name}`))] as const),
    );
    return checkDb(Object.fromEntries(entries));
  }
}
