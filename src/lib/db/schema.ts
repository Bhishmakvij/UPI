/**
 * SQLite DDL for the app's four tables, applied idempotently on every launch
 * via `client.ts`. Every table uses a TEXT `id` primary key so the generic
 * `createSqliteTableStore` (and its in-memory test double) can treat all four
 * tables identically.
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    recipient_method TEXT NOT NULL,
    original_input TEXT NOT NULL,
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_upi TEXT NOT NULL,
    is_contact INTEGER NOT NULL DEFAULT 0,
    contact_id TEXT,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS splits (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    split_number INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    amount INTEGER NOT NULL,
    txn_ref TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_splits_transaction ON splits(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`,
  `CREATE TABLE IF NOT EXISTS recent_contacts (
    id TEXT PRIMARY KEY,
    contact_name TEXT,
    contact_phone TEXT,
    contact_upi TEXT NOT NULL,
    last_used INTEGER NOT NULL,
    use_count INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS contact_upi_links (
    id TEXT PRIMARY KEY,
    upi_id TEXT NOT NULL,
    learned_at INTEGER NOT NULL
  )`,
];
