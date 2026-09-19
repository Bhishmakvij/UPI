import type { Split, SplitResult } from './splitTypes';

/** UPI's per-transaction cap this app splits against. */
export const CHUNK_RUPEES = 2000;

/**
 * Splits a whole-rupee total into chunks of at most {@link CHUNK_RUPEES} each,
 * with any remainder carried as the final chunk. A total already at or below
 * the chunk size is returned as a single split so every caller can route
 * through the same one-or-many code path.
 *
 * Pure function; never mutates input, never throws. Callers are expected to
 * have already run the amount through `validateAmount` — this is a defensive
 * second check, not the primary validation surface.
 */
export function splitAmount(totalRupees: number): SplitResult {
  if (!Number.isInteger(totalRupees) || totalRupees <= 0) {
    return { ok: false, error: 'INVALID_AMOUNT' };
  }

  if (totalRupees <= CHUNK_RUPEES) {
    return { ok: true, splits: [{ index: 1, amount: totalRupees }] };
  }

  const fullChunks = Math.floor(totalRupees / CHUNK_RUPEES);
  const remainder = totalRupees - fullChunks * CHUNK_RUPEES;

  const splits: Split[] = Array.from({ length: fullChunks }, (_, i) => ({
    index: i + 1,
    amount: CHUNK_RUPEES,
  }));
  // Omitted entirely when the remainder is exactly 0, so an exact multiple of
  // 2000 (e.g. 4000) produces 2 splits, not 2 splits plus a spurious ₹0 one.
  if (remainder > 0) {
    splits.push({ index: fullChunks + 1, amount: remainder });
  }

  return { ok: true, splits };
}
