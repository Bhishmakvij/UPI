import { AMOUNT_ERRORS } from '../errorMessages';
import type { AmountValidation } from './splitTypes';

/** Upper bound on a single payment request, per product spec. */
export const MAX_AMOUNT_RUPEES = 999_999;

/**
 * Validates a whole-rupee amount typed into the amount field. This app works in
 * whole rupees only (no paise/decimals), so a value with a decimal point is
 * rejected rather than rounded — silently rounding a typed amount is more
 * surprising to a user than asking them to re-enter it.
 *
 * Error priority mirrors the product spec's own ordering for values that could
 * match more than one rule (e.g. "-0.5" is reported as negative, not as a
 * decimal, since a negative amount is the more fundamental problem).
 */
export function validateAmount(input: string): AmountValidation {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: AMOUNT_ERRORS.empty };

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { valid: false, error: AMOUNT_ERRORS.nonNumeric };
  }

  const isNegative = trimmed.startsWith('-');
  const isDecimal = trimmed.includes('.');
  const value = Number(trimmed);

  if (isNegative) return { valid: false, error: AMOUNT_ERRORS.negative };
  if (value === 0) return { valid: false, error: AMOUNT_ERRORS.zero };
  if (isDecimal) return { valid: false, error: AMOUNT_ERRORS.decimal };
  if (value > MAX_AMOUNT_RUPEES) return { valid: false, error: AMOUNT_ERRORS.overLimit };

  return { valid: true };
}
