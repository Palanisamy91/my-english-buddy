import { Injectable, inject } from '@angular/core';
import type { ConversationBrain } from './conversation-brain';
import { DatabaseBrainCore } from './database-brain-core';
import { LelaDataService } from './lela-data.service';
import type { BrainQuestion, BrainTurn, Level, LelaMemory, TopicChoice } from './lela.models';

/** The free, database-driven brain (see DatabaseBrainCore). Not AI. */
@Injectable({ providedIn: 'root' })
export class DatabaseBrain implements ConversationBrain {
  readonly kind = 'database' as const;
  private readonly data = inject(LelaDataService);
  private core: DatabaseBrainCore | null = null;

  private async ready(): Promise<DatabaseBrainCore> {
    if (!this.core) {
      const [db, book] = await Promise.all([this.data.db(), this.data.phraseBook()]);
      this.core = new DatabaseBrainCore(db, book);
    }
    return this.core;
  }

  async start(options: { modeId: string; level: Level; memory: LelaMemory; returning: boolean }): Promise<BrainTurn> {
    return (await this.ready()).start(options);
  }
  async next(userText: string, context: { memory: LelaMemory }): Promise<BrainTurn> {
    return (await this.ready()).next(userText, context);
  }
  async goToTopic(topicId: string): Promise<BrainTurn> {
    return (await this.ready()).goToTopic(topicId);
  }
  async nextTopic(): Promise<BrainTurn> {
    return (await this.ready()).nextTopic();
  }
  async skip(): Promise<BrainTurn> {
    return (await this.ready()).skip();
  }
  async configure(modeId: string, level: Level): Promise<void> {
    (await this.ready()).configure(modeId, level);
  }
  async topics(): Promise<TopicChoice[]> {
    return (await this.ready()).topics();
  }
  async findTopic(text: string): Promise<TopicChoice | null> {
    return (await this.ready()).findTopic(text);
  }
  current(): BrainQuestion | null {
    return this.core?.current() ?? null;
  }
}
