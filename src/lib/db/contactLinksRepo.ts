import type { ContactUpiLinkStore } from '../recipient/contactUpiLinks';
import type { TableStore } from './tableStore';
import type { ContactUpiLinkRow } from './types';

/** SQLite-backed implementation of `ContactUpiLinkStore` — the app's own memory
 * of which UPI ID belongs to which contact (see the iOS Contacts-notes caveat
 * in the project plan for why this can't live in the OS contact itself). */
export class ContactLinksRepo implements ContactUpiLinkStore {
  constructor(private readonly store: TableStore<ContactUpiLinkRow>) {}

  async get(contactKey: string): Promise<string | undefined> {
    const row = await this.store.get(contactKey);
    return row?.upi_id;
  }

  async set(contactKey: string, upiId: string): Promise<void> {
    const existing = await this.store.get(contactKey);
    const row: ContactUpiLinkRow = { id: contactKey, upi_id: upiId, learned_at: Date.now() };
    if (existing) {
      await this.store.update(contactKey, row);
    } else {
      await this.store.insert(row);
    }
  }

  async findKeyByUpiId(upiId: string): Promise<string | undefined> {
    const all = await this.store.all();
    return all.find((row) => row.upi_id === upiId)?.id;
  }
}
