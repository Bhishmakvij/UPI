/**
 * Storage interface for the app's own contact→UPI memory (see the iOS Contacts
 * Notes-entitlement caveat in the project plan: we cannot rely on the OS
 * Contacts app to hold a UPI ID, so we keep this mapping ourselves).
 */
export interface ContactUpiLinkStore {
  get(contactKey: string): Promise<string | undefined>;
  set(contactKey: string, upiId: string): Promise<void>;
  findKeyByUpiId(upiId: string): Promise<string | undefined>;
}

/**
 * Resolves and remembers which UPI ID belongs to a given contact (or, when no
 * OS contact id exists, a phone number used as the key). This is what lets a
 * phone-number payment made once become a real, named UPI ID on every later
 * payment to the same person.
 */
export class ContactUpiLinks {
  constructor(private readonly store: ContactUpiLinkStore) {}

  /** Looks up a previously-learned UPI ID for a contact/phone key, if any. */
  resolve(contactKey: string): Promise<string | undefined> {
    return this.store.get(contactKey);
  }

  /** Records (or overwrites) the UPI ID associated with a contact/phone key. */
  learn(contactKey: string, upiId: string): Promise<void> {
    return this.store.set(contactKey, upiId);
  }

  /** Reverse lookup: given a UPI ID the user just typed, find which contact (if any) it's linked to. */
  findContactKeyForUpi(upiId: string): Promise<string | undefined> {
    return this.store.findKeyByUpiId(upiId);
  }
}
