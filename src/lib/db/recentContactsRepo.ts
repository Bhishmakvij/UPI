import type { RecentRecipientsStore } from '../recipient/recentRecipients';
import type { RecentRecipient } from '../recipient/recipientTypes';
import type { TableStore } from './tableStore';
import type { RecentContactRow } from './types';

/** SQLite-backed implementation of `RecentRecipientsStore`, keyed by UPI ID so a
 * repeat payment to the same person upserts one row instead of duplicating it. */
export class RecentContactsRepo implements RecentRecipientsStore {
  constructor(private readonly store: TableStore<RecentContactRow>) {}

  async list(limit: number): Promise<RecentRecipient[]> {
    const all = await this.store.all();
    return all
      .sort((a, b) => b.last_used - a.last_used)
      .slice(0, limit)
      .map((row) => ({
        name: row.contact_name,
        phone: row.contact_phone,
        upiId: row.contact_upi,
        lastUsed: row.last_used,
        useCount: row.use_count,
      }));
  }

  async upsert(recipient: { name?: string; phone?: string; upiId: string }): Promise<void> {
    const existing = await this.store.get(recipient.upiId);
    if (existing) {
      await this.store.update(recipient.upiId, {
        contact_name: recipient.name ?? existing.contact_name,
        contact_phone: recipient.phone ?? existing.contact_phone,
        last_used: Date.now(),
        use_count: existing.use_count + 1,
      });
      return;
    }
    await this.store.insert({
      id: recipient.upiId,
      contact_name: recipient.name,
      contact_phone: recipient.phone,
      contact_upi: recipient.upiId,
      last_used: Date.now(),
      use_count: 1,
    });
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}
