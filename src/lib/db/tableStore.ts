/**
 * Minimal CRUD abstraction over one table, keyed by an `id` column present on
 * every row. Repos build filtering/sorting/search in plain TypeScript on top
 * of `all()` rather than via dynamic SQL — the data volumes here (one user's
 * own transaction history) are small enough that this trades a little raw
 * query performance for code that's trivially unit-testable and doesn't need
 * an ORM or hand-rolled dynamic WHERE-clause builder.
 */
export interface TableStore<T extends { id: string }> {
  get(id: string): Promise<T | null>;
  all(): Promise<T[]>;
  insert(row: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory `TableStore`, used by unit tests as a stand-in for the real
 * SQLite-backed store (see `client.ts`) so repo logic is fully testable
 * without the native SQLite binding.
 */
export function createInMemoryTableStore<T extends { id: string }>(): TableStore<T> {
  const rows = new Map<string, T>();
  return {
    async get(id) {
      return rows.get(id) ?? null;
    },
    async all() {
      return Array.from(rows.values());
    },
    async insert(row) {
      rows.set(row.id, row);
    },
    async update(id, patch) {
      const existing = rows.get(id);
      if (existing) rows.set(id, { ...existing, ...patch });
    },
    async delete(id) {
      rows.delete(id);
    },
    async clear() {
      rows.clear();
    },
  };
}
