import { RECIPIENT_INPUT_ERRORS } from '../errorMessages';
import type { PhoneToUpiResult } from './upiTypes';

/**
 * Normalizes user-entered phone number text — accepting a `+91` prefix, a bare `91`
 * prefix on a 12-digit string, a leading `0` on an 11-digit string, or a plain
 * 10-digit number, with optional spaces/dashes throughout — and converts it to the
 * `<10digits>@upi` numeric-UPI convention. Never throws.
 *
 * Note this convention is a fallback, not a guarantee: it resolves at some but not
 * all PSPs. Callers should label a phone-derived UPI ID as such in the UI rather
 * than presenting it with the same confidence as a directly-entered UPI ID.
 */
export function phoneToUpi(input: string): PhoneToUpiResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: RECIPIENT_INPUT_ERRORS.phoneEmpty };

  let stripped = trimmed.replace(/[\s-]/g, '');
  if (stripped.startsWith('+91')) {
    stripped = stripped.slice(3);
  } else if (stripped.startsWith('91') && stripped.length === 12) {
    stripped = stripped.slice(2);
  } else if (stripped.startsWith('0') && stripped.length === 11) {
    stripped = stripped.slice(1);
  }

  if (!/^\d+$/.test(stripped)) {
    return { ok: false, error: RECIPIENT_INPUT_ERRORS.phoneNonNumeric };
  }
  if (stripped.length !== 10) {
    return { ok: false, error: RECIPIENT_INPUT_ERRORS.phoneTooShort };
  }

  return { ok: true, digits: stripped, upiId: `${stripped}@upi` };
}
