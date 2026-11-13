import { Injectable, signal } from '@angular/core';

/**
 * A safe wrapper around localStorage. Browsers can refuse it (private windows, blocked site data,
 * a full disk), so every call is wrapped; when saving fails, the data stays in memory for this visit
 * and `healthy` becomes false so the app can warn the learner.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /** false once a read or write has failed. */
  readonly healthy = signal(true);
  private readonly memory = new Map<string, string>();

  read(key: string): string | null {
    try {
      const value = globalThis.localStorage?.getItem(key) ?? null;
      return value ?? this.memory.get(key) ?? null;
    } catch {
      this.healthy.set(false);
      return this.memory.get(key) ?? null;
    }
  }

  write(key: string, value: string): boolean {
    this.memory.set(key, value);
    try {
      globalThis.localStorage.setItem(key, value);
      return true;
    } catch {
      this.healthy.set(false);
      return false;
    }
  }

  remove(key: string): void {
    this.memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      this.healthy.set(false);
    }
  }
}
