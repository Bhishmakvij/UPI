import type { TableStore } from './tableStore';
import type { TransactionListFilter, TransactionRow, TransactionStatus } from './types';

/**
 * CRUD + filtering over the `transactions` table (one row per user-initiated
 * payment, grouping its splits). Filtering/search/sorting is done in plain
 * TypeScript over `all()` rather than dynamic SQL — see `tableStore.ts` for why.
 */
export class TransactionsRepo {
  constructor(private readonly store: TableStore<TransactionRow>) {}

  insert(row: TransactionRow): Promise<void> {
    return this.store.insert(row);
  }

  get(id: string): Promise<TransactionRow | null> {
    return this.store.get(id);
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<void> {
    await this.store.update(id, { status, updated_at: Date.now() });
  }

  /** Transactions left `IN_PROGRESS` from a previous run — the app was killed or
   * crashed mid-payment. Surfaced on launch as "Previous payment interrupted". */
  async findInProgress(): Promise<TransactionRow[]> {
    const all = await this.store.all();
    return all.filter((row) => row.status === 'IN_PROGRESS');
  }

  async list(filter: TransactionListFilter = {}): Promise<TransactionRow[]> {
    const all = await this.store.all();
    const needle = filter.search?.trim().toLowerCase();

    return all
      .filter((row) => !filter.status || row.status === filter.status)
      .filter((row) => !filter.paymentMethod || row.recipient_method === filter.paymentMethod)
      .filter((row) => filter.dateFrom === undefined || row.created_at >= filter.dateFrom)
      .filter((row) => filter.dateTo === undefined || row.created_at <= filter.dateTo)
      .filter((row) => filter.amountMin === undefined || row.total_amount >= filter.amountMin)
      .filter((row) => filter.amountMax === undefined || row.total_amount <= filter.amountMax)
      .filter(
        (row) =>
          !needle ||
          row.recipient_name?.toLowerCase().includes(needle) ||
          row.recipient_upi.toLowerCase().includes(needle)
      )
      .sort((a, b) => b.created_at - a.created_at);
  }
}
