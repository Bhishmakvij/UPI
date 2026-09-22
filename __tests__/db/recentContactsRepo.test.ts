import { createInMemoryTableStore } from '../../src/lib/db/tableStore';
import { RecentContactsRepo } from '../../src/lib/db/recentContactsRepo';
import type { RecentContactRow } from '../../src/lib/db/types';

describe('RecentContactsRepo', () => {
  it('upserts a new recipient and lists it most-recent-first', async () => {
    const repo = new RecentContactsRepo(createInMemoryTableStore<RecentContactRow>());
    await repo.upsert({ name: 'Raj Kumar', phone: '9876543210', upiId: 'raj@axis' });
    await new Promise((r) => setTimeout(r, 2));
    await repo.upsert({ name: 'Priya', upiId: 'priya@ybl' });

    const list = await repo.list(10);
    expect(list.map((r) => r.upiId)).toEqual(['priya@ybl', 'raj@axis']);
  });

  it('increments use_count on repeat upsert to the same UPI id', async () => {
    const repo = new RecentContactsRepo(createInMemoryTableStore<RecentContactRow>());
    await repo.upsert({ upiId: 'raj@axis' });
    await repo.upsert({ upiId: 'raj@axis' });
    const [row] = await repo.list(10);
    expect(row.useCount).toBe(2);
  });

  it('respects the limit parameter', async () => {
    const repo = new RecentContactsRepo(createInMemoryTableStore<RecentContactRow>());
    for (let i = 0; i < 15; i++) {
      await repo.upsert({ upiId: `user${i}@axis` });
    }
    expect(await repo.list(5)).toHaveLength(5);
  });

  it('clears all recent recipients', async () => {
    const repo = new RecentContactsRepo(createInMemoryTableStore<RecentContactRow>());
    await repo.upsert({ upiId: 'raj@axis' });
    await repo.clear();
    expect(await repo.list(10)).toEqual([]);
  });
});
