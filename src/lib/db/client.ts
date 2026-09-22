import { SCHEMA_STATEMENTS } from './schema';
import type { TableStore } from './tableStore';

/** The subset of expo-sqlite's async database API this app relies on. */
export interface SqliteDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

let dbPromise: Promise<SqliteDb> | null = null;

/**
 * Opens (once) the app's on-device SQLite database and applies schema
 * migrations. Safe to call repeatedly — later calls reuse the same open
 * connection. `expo-sqlite` is imported lazily so this module has no
 * load-time dependency on the native binding.
 */
export async function getDb(): Promise<SqliteDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQLite = await import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync('upi-splitter.db');
      for (const statement of SCHEMA_STATEMENTS) {
        await db.execAsync(statement);
      }
      return db as unknown as SqliteDb;
    })();
  }
  return dbPromise;
}

function toSqlValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

/**
 * Generic CRUD wrapper over one SQLite table, keyed by an `id` column. This is
 * the "hand-written thin query wrapper" referenced in the project plan in
 * place of an ORM — the schema is simple enough that dynamic column lists
 * built from the row object's own keys are all that's needed.
 */
export function createSqliteTableStore<T extends { id: string }>(
  db: SqliteDb,
  tableName: string
): TableStore<T> {
  return {
    async get(id) {
      return db.getFirstAsync<T>(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    },
    async all() {
      return db.getAllAsync<T>(`SELECT * FROM ${tableName}`);
    },
    async insert(row) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((column) => toSqlValue((row as Record<string, unknown>)[column]));
      await db.runAsync(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    },
    async update(id, patch) {
      const columns = Object.keys(patch);
      if (columns.length === 0) return;
      const setClause = columns.map((column) => `${column} = ?`).join(', ');
      const values = columns.map((column) => toSqlValue((patch as Record<string, unknown>)[column]));
      await db.runAsync(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
    },
    async delete(id) {
      await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    },
    async clear() {
      await db.runAsync(`DELETE FROM ${tableName}`);
    },
  };
}
