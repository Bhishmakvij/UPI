import { getDb, createSqliteTableStore } from './client';
import { TransactionsRepo } from './transactionsRepo';
import { SplitsRepo } from './splitsRepo';
import { RecentContactsRepo } from './recentContactsRepo';
import { ContactLinksRepo } from './contactLinksRepo';
import type { ContactUpiLinkRow, RecentContactRow, SplitRow, TransactionRow } from './types';

export interface AppRepos {
  transactionsRepo: TransactionsRepo;
  splitsRepo: SplitsRepo;
  recentContactsRepo: RecentContactsRepo;
  contactLinksRepo: ContactLinksRepo;
}

let reposPromise: Promise<AppRepos> | null = null;

/**
 * Lazily opens the on-device SQLite database (running schema migrations the
 * first time) and constructs every repo against it, once per app process.
 * Screens consume these through `useRepos()` (see `RepoProvider.tsx`) rather
 * than calling this directly.
 */
export function getAppRepos(): Promise<AppRepos> {
  if (!reposPromise) {
    reposPromise = (async () => {
      const db = await getDb();
      return {
        transactionsRepo: new TransactionsRepo(createSqliteTableStore<TransactionRow>(db, 'transactions')),
        splitsRepo: new SplitsRepo(createSqliteTableStore<SplitRow>(db, 'splits')),
        recentContactsRepo: new RecentContactsRepo(
          createSqliteTableStore<RecentContactRow>(db, 'recent_contacts')
        ),
        contactLinksRepo: new ContactLinksRepo(
          createSqliteTableStore<ContactUpiLinkRow>(db, 'contact_upi_links')
        ),
      };
    })();
  }
  return reposPromise;
}
