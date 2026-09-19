import type { Contact, ContactSearchMatch } from './recipientTypes';

export type ContactPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Abstraction over "however we get contacts" so the search/matching logic below
 * can be unit tested against a fake list, without touching the native Contacts API. */
export interface ContactsDataSource {
  requestPermission(): Promise<ContactPermissionStatus>;
  getAllContacts(): Promise<Contact[]>;
}

const MAX_MATCHES = 10;

/** Compares phone numbers by their last 10 digits, so a stored "+91 98765 43210",
 * "09876543210", and "9876543210" are all recognized as the same number. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Case-insensitive substring search across a contact's full/first/last name,
 * capped at {@link MAX_MATCHES} results, reporting the matched character range
 * so the UI can bold the matching text. Pure function — no permission or I/O
 * concerns — so it's fully unit-testable.
 */
export function searchContactsByName(query: string, contacts: Contact[]): ContactSearchMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: ContactSearchMatch[] = [];
  for (const contact of contacts) {
    const haystacks = [contact.name, contact.firstName, contact.lastName].filter(
      (value): value is string => Boolean(value)
    );
    for (const haystack of haystacks) {
      const index = haystack.toLowerCase().indexOf(needle);
      if (index !== -1) {
        matches.push({ contact, matchStart: index, matchEnd: index + needle.length });
        break; // one match entry per contact even if multiple name fields match
      }
    }
    if (matches.length >= MAX_MATCHES) break;
  }
  return matches;
}

/** Finds the contact who owns a given 10-digit phone number, if any. */
export function findContactByPhone(digits: string, contacts: Contact[]): Contact | undefined {
  return contacts.find((contact) =>
    contact.phoneNumbers.some((phone) => normalizePhone(phone.number) === digits)
  );
}

/**
 * Live, device-backed data source using `expo-contacts`. The module is imported
 * lazily (only when a method is actually invoked) so this file has no load-time
 * dependency on the native Contacts binding — importing it to reuse the pure
 * search functions above never touches native code.
 */
export function createExpoContactsDataSource(): ContactsDataSource {
  return {
    async requestPermission() {
      const Contacts = await import('expo-contacts');
      const { status } = await Contacts.requestPermissionsAsync();
      return status as ContactPermissionStatus;
    },
    async getAllContacts() {
      const Contacts = await import('expo-contacts');
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
        ],
      });
      return data.map((raw): Contact => ({
        id: raw.id ?? '',
        name: raw.name ?? '',
        firstName: raw.firstName,
        lastName: raw.lastName,
        phoneNumbers: (raw.phoneNumbers ?? []).map((phone) => ({
          number: phone.number ?? '',
          label: phone.label,
        })),
      }));
    },
  };
}
