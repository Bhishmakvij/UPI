import type { RecentRecipient } from './recipientTypes';

export interface RecentRecipientsStore {
  list(limit: number): Promise<RecentRecipient[]>;
  upsert(recipient: { name?: string; phone?: string; upiId: string }): Promise<void>;
  clear(): Promise<void>;
}

/**
 * The "Recent Recipients" quick-select list: the last people paid, most
 * recently used first, so a repeat payment never requires retyping.
 */
export class RecentRecipientsService {
  constructor(private readonly store: RecentRecipientsStore) {}

  list(limit = 10): Promise<RecentRecipient[]> {
    return this.store.list(limit);
  }

  /** Called after every successful recipient resolution to bump it to the top of Recent. */
  recordUse(recipient: { name?: string; phone?: string; upiId: string }): Promise<void> {
    return this.store.upsert(recipient);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }
}
