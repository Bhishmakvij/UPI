import { RecentRecipientsService, type RecentRecipientsStore } from '../../src/lib/recipient/recentRecipients';
import type { RecentRecipient } from '../../src/lib/recipient/recipientTypes';

function createFakeStore(): RecentRecipientsStore {
  const rows = new Map<string, RecentRecipient>();
  return {
    async list(limit) {
      return Array.from(rows.values())
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, limit);
    },
    async upsert(recipient) {
      const existing = rows.get(recipient.upiId);
      rows.set(recipient.upiId, {
        ...recipient,
        lastUsed: Date.now(),
        useCount: (existing?.useCount ?? 0) + 1,
      });
    },
    async clear() {
      rows.clear();
    },
  };
}

describe('RecentRecipientsService', () => {
  it('starts empty', async () => {
    const service = new RecentRecipientsService(createFakeStore());
    expect(await service.list()).toEqual([]);
  });

  it('records a used recipient and lists it', async () => {
    const service = new RecentRecipientsService(createFakeStore());
    await service.recordUse({ name: 'Raj Kumar', phone: '9876543210', upiId: 'raj@axis' });
    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0].upiId).toBe('raj@axis');
    expect(list[0].useCount).toBe(1);
  });

  it('increments use count on repeat use rather than duplicating the entry', async () => {
    const service = new RecentRecipientsService(createFakeStore());
    await service.recordUse({ upiId: 'raj@axis' });
    await service.recordUse({ upiId: 'raj@axis' });
    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0].useCount).toBe(2);
  });

  it('clears all recent recipients', async () => {
    const service = new RecentRecipientsService(createFakeStore());
    await service.recordUse({ upiId: 'raj@axis' });
    await service.clear();
    expect(await service.list()).toEqual([]);
  });
});
