import { InjectionToken, inject } from '@angular/core';
import type { BrainQuestion, BrainTurn, Level, LelaMemory, TopicChoice } from './lela.models';
import { DatabaseBrain } from './database-brain';

/**
 * The "AI service interface" of the conversation.
 *
 * The screen and the voice code only talk to this interface. The free version uses DatabaseBrain:
 * it picks stored questions from db.json and reacts to keywords. It does NOT understand sentences, so
 * it cannot follow an unexpected answer or hold a real open conversation.
 *
 * To connect a genuine AI model later:
 *  1. write a class that implements ConversationBrain and calls YOUR OWN backend (the backend holds the
 *     API key; a key must never be placed inside the app);
 *  2. register it in app.config.ts:  { provide: CONVERSATION_BRAIN, useClass: MyAiBrain }
 *  3. optionally also replace the corrector: { provide: LELA_CORRECTOR, useClass: MyAiCorrector }.
 * No screen needs to change. Return `kind: 'ai'` so that the screen labels the replies honestly.
 */
export interface ConversationBrain {
  readonly kind: 'database' | 'ai';

  /** Begins a conversation: Lela's greeting and first question. */
  start(options: { modeId: string; level: Level; memory: LelaMemory; returning: boolean }): Promise<BrainTurn>;

  /** The learner answered. Lela reacts and asks the next question. */
  next(userText: string, context: { memory: LelaMemory }): Promise<BrainTurn>;

  /** Move to a topic the learner (or the topic picker) chose. */
  goToTopic(topicId: string): Promise<BrainTurn>;

  /** Move to the next suitable topic. */
  nextTopic(): Promise<BrainTurn>;

  /** Skip the current question. */
  skip(): Promise<BrainTurn>;

  /** The mode or level was changed in the middle of a conversation. */
  configure(modeId: string, level: Level): Promise<void>;

  /** Topics the learner can pick from. */
  topics(): Promise<TopicChoice[]>;

  /** Words the learner may say to ask for a topic ("let's talk about cooking"). */
  findTopic(text: string): Promise<TopicChoice | null>;

  /** The question Lela is waiting for an answer to (for "repeat" and "need help?"). */
  current(): BrainQuestion | null;
}

export const CONVERSATION_BRAIN = new InjectionToken<ConversationBrain>('CONVERSATION_BRAIN', {
  providedIn: 'root',
  factory: () => inject(DatabaseBrain),
});
