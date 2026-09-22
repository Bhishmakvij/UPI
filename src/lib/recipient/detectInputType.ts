import { RECIPIENT_INPUT_ERRORS } from '../errorMessages';
import { validateUpiId } from '../upi/validateUpiId';
import { phoneToUpi } from '../upi/phoneToUpi';
import type { RecipientInputAnalysis } from './recipientTypes';

/**
 * Classifies free-form recipient input as a contact-name search, a phone number,
 * or a UPI ID, so the single unified input field can react per keystroke without
 * the user ever picking a mode explicitly. Never throws.
 *
 * Anything that doesn't cleanly match one of the three shapes (e.g. a phone
 * number still being typed, or letters mixed with digits) is reported as
 * `'partial'` rather than an error — the field should keep accepting keystrokes
 * rather than flashing a premature validation failure while the user is
 * mid-entry.
 */
export function detectInputType(text: string): RecipientInputAnalysis {
  const trimmed = text.trim();
  if (!trimmed) return { type: 'empty' };

  // A pure name: letters and spaces only, no @ and no digits.
  if (!trimmed.includes('@') && /^[a-zA-Z\s]+$/.test(trimmed)) {
    return { type: 'contact_name', query: trimmed };
  }

  // Phone-shaped: digits, optional leading +, and separators only, no @.
  if (!trimmed.includes('@') && /^[\d+\-\s]+$/.test(trimmed)) {
    const phoneResult = phoneToUpi(trimmed);
    if (phoneResult.ok) {
      return { type: 'phone', digits: phoneResult.digits!, upiId: phoneResult.upiId! };
    }
    // Digits so far but not yet a complete phone number (e.g. "+91 987654") — keep typing.
    return { type: 'partial' };
  }

  if (trimmed.includes('@')) {
    const validation = validateUpiId(trimmed);
    return validation.valid
      ? { type: 'upi_id', upiId: trimmed }
      : { type: 'invalid', reason: validation.error ?? RECIPIENT_INPUT_ERRORS.genericInvalid };
  }

  // Mixed letters/digits with no @ (e.g. "Raj123") — not yet classifiable either way.
  return { type: 'partial' };
}
