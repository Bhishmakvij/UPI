import { createInMemoryTableStore } from '../../src/lib/db/tableStore';
import { SplitsRepo } from '../../src/lib/db/splitsRepo';
import type { SplitRow } from '../../src/lib/db/types';

function makeSplit(overrides: Partial<SplitRow> = {}): SplitRow {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    transaction_id: 'tx1',
    split_number: 1,
    attempt_number: 1,
    amount: 2000,
    txn_ref: 'REF1',
    status: 'PENDING',
    retry_count: 0,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('SplitsRepo', () => {
  it('inserts a split with a unique ref on the first try', async () => {
    const repo = new SplitsRepo(createInMemoryTableStore<SplitRow>());
    const inserted = await repo.insert(makeSplit({ id: 's1', txn_ref: 'REF1' }), () => 'REF-NEVER-USED');
    expect(inserted.txn_ref).toBe('REF1');
    expect(await repo.findByTxnRef('REF1')).toBeDefined();
  });

  it('regenerates the reference on a collision and retries', async () => {
    const repo = new SplitsRepo(createInMemoryTableStore<SplitRow>());
    // Both the original ref and the first regenerated ref are already taken,
    // so a correct implementation must retry twice before succeeding on the third.
    await repo.insert(makeSplit({ id: 's1', txn_ref: 'DUPLICATE' }), () => 'unused');
    await repo.insert(makeSplit({ id: 's-taken', txn_ref: 'STILL-DUPLICATE' }), () => 'unused');

    const refs = ['STILL-DUPLICATE', 'FINALLY-UNIQUE'];
    let call = 0;
    const inserted = await repo.insert(makeSplit({ id: 's2', txn_ref: 'DUPLICATE' }), () => refs[call++]);

    expect(inserted.txn_ref).toBe('FINALLY-UNIQUE');
  });

  it('throws after exhausting max attempts on persistent collisions', async () => {
    const repo = new SplitsRepo(createInMemoryTableStore<SplitRow>());
    await repo.insert(makeSplit({ id: 's1', txn_ref: 'ALWAYS-TAKEN' }), () => 'unused');

    await expect(
      repo.insert(makeSplit({ id: 's2', txn_ref: 'ALWAYS-TAKEN' }), () => 'ALWAYS-TAKEN', 3)
    ).rejects.toThrow(/unique transaction reference/);
  });

  it('updates status, error message, and retry count, bumping timestamp', async () => {
    const repo = new SplitsRepo(createInMemoryTableStore<SplitRow>());
    await repo.insert(makeSplit({ id: 's1', timestamp: 1 }), () => 'unused');
    await repo.updateStatus('s1', { status: 'FAILED', error_message: 'Insufficient balance', retry_count: 1 });

    const all = await repo.listByTransaction('tx1');
    expect(all[0].status).toBe('FAILED');
    expect(all[0].error_message).toBe('Insufficient balance');
    expect(all[0].retry_count).toBe(1);
    expect(all[0].timestamp).toBeGreaterThan(1);
  });

  it('lists attempts for a transaction ordered by split number then attempt number', async () => {
    const repo = new SplitsRepo(createInMemoryTableStore<SplitRow>());
    await repo.insert(makeSplit({ id: 's1', split_number: 2, attempt_number: 1, txn_ref: 'A' }), () => 'x');
    await repo.insert(makeSplit({ id: 's2', split_number: 1, attempt_number: 2, txn_ref: 'B' }), () => 'x');
    await repo.insert(makeSplit({ id: 's3', split_number: 1, attempt_number: 1, txn_ref: 'C' }), () => 'x');

    const ordered = await repo.listByTransaction('tx1');
    expect(ordered.map((s) => s.id)).toEqual(['s3', 's2', 's1']);
  });
});
