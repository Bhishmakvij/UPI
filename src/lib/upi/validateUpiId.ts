import { RECIPIENT_INPUT_ERRORS } from '../errorMessages';
import type { UpiIdValidation } from './upiTypes';

/**
 * A non-exhaustive allowlist of common PSP/bank UPI handles, used only to decide
 * whether to show a soft "unknown bank" warning. An unrecognized handle is never
 * treated as invalid — UPI adds new handles over time and this list will always
 * lag reality, so it only ever downgrades to a dismissible warning, never a hard error.
 */
const KNOWN_HANDLES = new Set([
  'okhdfcbank', 'okaxis', 'okicici', 'oksbi', 'okbizaxis',
  'ybl', 'ibl', 'axl', 'apl', 'jio', 'airtel',
  'paytm', 'upi', 'freecharge', 'idbi', 'indus', 'kotak',
  'pnb', 'uco', 'yesbank', 'rbl', 'cnrb', 'barodampay',
  'federal', 'hsbc', 'citi', 'dbs', 'sc',
]);

/**
 * Validates a manually-entered UPI ID against the general `identifier@handle` shape
 * UPI uses. Never throws; returns a typed result the UI renders directly as inline
 * field feedback while the user is still typing.
 */
export function validateUpiId(input: string): UpiIdValidation {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: RECIPIENT_INPUT_ERRORS.upiEmpty };

  if (!trimmed.includes('@')) {
    return { valid: false, error: RECIPIENT_INPUT_ERRORS.upiMissingAt };
  }
  if ((trimmed.match(/@/g) ?? []).length > 1) {
    return { valid: false, error: RECIPIENT_INPUT_ERRORS.upiBadFormat };
  }

  const [localPart, handle] = trimmed.split('@');
  if (!localPart || !/^[A-Za-z0-9._-]+$/.test(localPart)) {
    return { valid: false, error: RECIPIENT_INPUT_ERRORS.upiInvalidChars };
  }
  if (!handle || !/^[A-Za-z][A-Za-z0-9.]*$/.test(handle)) {
    return { valid: false, error: RECIPIENT_INPUT_ERRORS.upiBadFormat };
  }

  if (!KNOWN_HANDLES.has(handle.toLowerCase())) {
    return { valid: true, warning: RECIPIENT_INPUT_ERRORS.upiUnknownBank };
  }
  return { valid: true };
}
