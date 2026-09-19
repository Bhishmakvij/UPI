import { createInMemoryTableStore } from '../../src/lib/db/tableStore';
import { TransactionsRepo } from '../../src/lib/db/transactionsRepo';
import type { TransactionRow } from '../../src/lib/db/types';

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    recipient_method: 'upi_entry',
    original_input: 'raj@axis',
    recipient_upi: 'raj@axis',
    is_contact: false,
    total_amount: 2000,
    status: 'IN_PROGRESS',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

describe('TransactionsRepo', () => {
  it('inserts and retrieves a transaction', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    const tx = makeTransaction({ id: 't1' });
    await repo.insert(tx);
    expect(await repo.get('t1')).toEqual(tx);
  });

  it('updates status and bumps updated_at', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    await repo.insert(makeTransaction({ id: 't1', status: 'IN_PROGRESS', updated_at: 1 }));
    await repo.updateStatus('t1', 'COMPLETED');
    const row = await repo.get('t1');
    expect(row?.status).toBe('COMPLETED');
    expect(row?.updated_at).toBeGreaterThan(1);
  });

  it('finds transactions left IN_PROGRESS (crash recovery)', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    await repo.insert(makeTransaction({ id: 't1', status: 'IN_PROGRESS' }));
    await repo.insert(makeTransaction({ id: 't2', status: 'COMPLETED' }));
    const inProgress = await repo.findInProgress();
    expect(inProgress.map((t) => t.id)).toEqual(['t1']);
  });

  it('filters by status, payment method, amount range, and date range', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    await repo.insert(makeTransaction({ id: 't1', status: 'COMPLETED', recipient_method: 'qr_scan', total_amount: 500, created_at: 100 }));
    await repo.insert(makeTransaction({ id: 't2', status: 'ABORTED', recipient_method: 'phone_entry', total_amount: 5000, created_at: 200 }));
    await repo.insert(makeTransaction({ id: 't3', status: 'COMPLETED', recipient_method: 'upi_entry', total_amount: 2000, created_at: 300 }));

    expect((await repo.list({ status: 'COMPLETED' })).map((t) => t.id).sort()).toEqual(['t1', 't3']);
    expect((await repo.list({ paymentMethod: 'phone_entry' })).map((t) => t.id)).toEqual(['t2']);
    expect((await repo.list({ amountMin: 1000, amountMax: 3000 })).map((t) => t.id)).toEqual(['t3']);
    expect((await repo.list({ dateFrom: 150, dateTo: 250 })).map((t) => t.id)).toEqual(['t2']);
  });

  it('searches case-insensitively across recipient name and UPI id', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    await repo.insert(makeTransaction({ id: 't1', recipient_name: 'Raj Kumar', recipient_upi: 'raj@axis' }));
    await repo.insert(makeTransaction({ id: 't2', recipient_name: 'Priya Singh', recipient_upi: 'priya@ybl' }));

    expect((await repo.list({ search: 'raj' })).map((t) => t.id)).toEqual(['t1']);
    expect((await repo.list({ search: 'YBL' })).map((t) => t.id)).toEqual(['t2']);
    expect((await repo.list({ search: 'nomatch' }))).toEqual([]);
  });

  it('sorts newest first', async () => {
    const repo = new TransactionsRepo(createInMemoryTableStore<TransactionRow>());
    await repo.insert(makeTransaction({ id: 'old', created_at: 1 }));
    await repo.insert(makeTransaction({ id: 'new', created_at: 2 }));
    expect((await repo.list()).map((t) => t.id)).toEqual(['new', 'old']);
  });
});
