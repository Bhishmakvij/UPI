export interface ContactPhoneNumber {
  number: string;
  label?: string;
}

/** A contact as read from the OS address book, normalized to the fields this app needs. */
export interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: ContactPhoneNumber[];
}

export interface ContactSearchMatch {
  contact: Contact;
  /** Index range of the matched substring within `contact.name`, for highlighting. */
  matchStart: number;
  matchEnd: number;
}

export type RecipientMethod = 'contact_search' | 'phone_entry' | 'upi_entry' | 'qr_scan';

/** The fully-resolved payee, in the shape every downstream screen (amount, splitting,
 * payment, history) consumes regardless of which of the three input methods produced it. */
export interface ResolvedRecipient {
  method: RecipientMethod;
  originalInput: string;
  upiId: string;
  name?: string;
  phone?: string;
  isContact: boolean;
  contactId?: string;
}

/** Result of classifying the unified recipient input field's current text. */
export type RecipientInputAnalysis =
  | { type: 'empty' }
  | { type: 'partial' }
  | { type: 'invalid'; reason: string }
  | { type: 'contact_name'; query: string }
  | { type: 'phone'; digits: string; upiId: string }
  | { type: 'upi_id'; upiId: string };

export interface RecentRecipient {
  name?: string;
  phone?: string;
  upiId: string;
  lastUsed: number;
  useCount: number;
}
