import {
  canManuallyRetry,
  canAutomaticallyRetryTimeout,
  MAX_MANUAL_RETRIES,
  MAX_AUTOMATIC_TIMEOUT_RETRIES,
} from '../../src/lib/orchestrator/retryPolicy';

describe('retryPolicy', () => {
  it('allows manual retries below the limit', () => {
    for (let i = 0; i < MAX_MANUAL_RETRIES; i++) {
      expect(canManuallyRetry(i)).toBe(true);
    }
  });

  it('disallows manual retry once the limit is reached', () => {
    expect(canManuallyRetry(MAX_MANUAL_RETRIES)).toBe(false);
    expect(canManuallyRetry(MAX_MANUAL_RETRIES + 1)).toBe(false);
  });

  it('allows exactly one automatic timeout retry', () => {
    expect(canAutomaticallyRetryTimeout(0)).toBe(true);
    expect(canAutomaticallyRetryTimeout(MAX_AUTOMATIC_TIMEOUT_RETRIES)).toBe(false);
  });
});
