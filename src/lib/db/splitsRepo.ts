import type { TableStore } from './tableStore';
import type { SplitRow } from './types';

/**
 * CRUD over the `splits` table. One row per **attempt** (not per logical
 * split position), so a failed attempt followed by a successful retry both
 * remain visible in history — see the project plan for the full rationale.
 */
export class SplitsRepo {
  constructor(private readonly store: TableStore<SplitRow>) {}

  /**
   * Inserts a new split-attempt row. `txn_ref` must be globally unique (the
   * real SQLite schema also enforces this with a `UNIQUE` constraint as a
   * hard backstop); if the freshly-generated reference somehow collides with
   * an existing one, `regenerateRef` is called to produce a new one, up to
   * `maxAttempts` times, before giving up.
   */
  async insert(row: SplitRow, regenerateRef: () => string, maxAttempts = 3): Promise<SplitRow> {
    let candidate = row;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const existing = await this.findByTxnRef(candidate.txn_ref);
      if (!existing) {
        await this.store.insert(candidate);
        return candidate;
      }
      candidate = { ...candidate, txn_ref: regenerateRef() };
    }
    throw new Error('Could not generate a unique transaction reference after multiple attempts');
  }

  async findByTxnRef(txnRef: string): Promise<SplitRow | undefined> {
    const all = await this.store.all();
    return all.find((row) => row.txn_ref === txnRef);
  }

  async updateStatus(
    id: string,
    patch: Partial<Pick<SplitRow, 'status' | 'error_message' | 'retry_count'>>
  ): Promise<void> {
    await this.store.update(id, { ...patch, timestamp: Date.now() });
  }

  /** All attempts for one transaction, ordered for the History detail view
   * (logical split position, then attempt order within that position). */
  async listByTransaction(transactionId: string): Promise<SplitRow[]> {
    const all = await this.store.all();
    return all
      .filter((row) => row.transaction_id === transactionId)
      .sort((a, b) => a.split_number - b.split_number || a.attempt_number - b.attempt_number);
  }
}
