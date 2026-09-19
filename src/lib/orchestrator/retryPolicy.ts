/**
 * Centralizes the retry limits referenced from both the Android and iOS
 * payment paths, so "how many times can this split be retried" is answered
 * in exactly one place rather than duplicated per platform.
 */

/** A manually-triggered retry (user tapped "Retry" after a failure/cancellation). */
export const MAX_MANUAL_RETRIES = 3;

/** An automatic retry the app performs itself after a network timeout, before
 * falling back to asking the user to retry manually. */
export const MAX_AUTOMATIC_TIMEOUT_RETRIES = 1;

/** Whether the user should still be offered a "Retry" action for this split. */
export function canManuallyRetry(retryCount: number): boolean {
  return retryCount < MAX_MANUAL_RETRIES;
}

/** Whether a network-timeout failure should be retried automatically, once,
 * before surfacing a manual retry prompt. */
export function canAutomaticallyRetryTimeout(automaticRetryCount: number): boolean {
  return automaticRetryCount < MAX_AUTOMATIC_TIMEOUT_RETRIES;
}
