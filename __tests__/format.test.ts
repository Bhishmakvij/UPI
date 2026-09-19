import { formatRupees, formatSplitProgressLabel, formatSplitStatusLine } from '../src/lib/format';

describe('formatRupees', () => {
  it('formats with the rupee symbol and Indian-style grouping', () => {
    expect(formatRupees(2000)).toBe('₹2,000');
    expect(formatRupees(100000)).toBe('₹1,00,000');
    expect(formatRupees(500)).toBe('₹500');
  });
});

describe('formatSplitProgressLabel', () => {
  it('matches the spec format', () => {
    expect(formatSplitProgressLabel(2, 4, 2000)).toBe('Payment 2 of 4 — ₹2,000');
  });
});

describe('formatSplitStatusLine', () => {
  it('matches the spec format with a checkmark for a successful split', () => {
    expect(formatSplitStatusLine(1, 3, 2000, 'SUCCESS')).toBe('✓ Payment 1/3: 2000 - SUCCESS');
  });

  it('uses a spinner marker for an in-flight split', () => {
    expect(formatSplitStatusLine(2, 3, 2000, 'LAUNCHING')).toBe('⟳ Payment 2/3: 2000 - LAUNCHING');
    expect(formatSplitStatusLine(2, 3, 2000, 'AWAITING_IOS_RETURN')).toBe(
      '⟳ Payment 2/3: 2000 - AWAITING_IOS_RETURN'
    );
  });

  it('uses a hollow circle for a pending split', () => {
    expect(formatSplitStatusLine(3, 3, 1000, 'PENDING')).toBe('○ Payment 3/3: 1000 - PENDING');
  });

  it('uses a cross for a failed/cancelled/skipped split', () => {
    expect(formatSplitStatusLine(1, 1, 2000, 'FAILED')).toBe('✗ Payment 1/1: 2000 - FAILED');
    expect(formatSplitStatusLine(1, 1, 2000, 'SKIPPED')).toBe('✗ Payment 1/1: 2000 - SKIPPED');
  });
});
