import { splitAmount } from '../../src/lib/splitting/splitAmount';

describe('splitAmount', () => {
  it('does not split an amount at or below 2000', () => {
    expect(splitAmount(2000)).toEqual({ ok: true, splits: [{ index: 1, amount: 2000 }] });
    expect(splitAmount(1)).toEqual({ ok: true, splits: [{ index: 1, amount: 1 }] });
  });

  it('matches every example in the product spec', () => {
    expect(splitAmount(2500)).toEqual({
      ok: true,
      splits: [
        { index: 1, amount: 2000 },
        { index: 2, amount: 500 },
      ],
    });
    expect(splitAmount(5000)).toEqual({
      ok: true,
      splits: [
        { index: 1, amount: 2000 },
        { index: 2, amount: 2000 },
        { index: 3, amount: 1000 },
      ],
    });
    expect(splitAmount(7500)).toEqual({
      ok: true,
      splits: [
        { index: 1, amount: 2000 },
        { index: 2, amount: 2000 },
        { index: 3, amount: 2000 },
        { index: 4, amount: 1500 },
      ],
    });
  });

  it('does not produce a spurious zero-amount split on an exact multiple of 2000', () => {
    expect(splitAmount(4000)).toEqual({
      ok: true,
      splits: [
        { index: 1, amount: 2000 },
        { index: 2, amount: 2000 },
      ],
    });
    expect(splitAmount(6000).ok && (splitAmount(6000) as any).splits).toHaveLength(3);
  });

  it('handles the maximum supported amount', () => {
    const result = splitAmount(999999);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.splits).toHaveLength(500);
      expect(result.splits[499].amount).toBe(1999);
      const total = result.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(999999);
    }
  });

  it('rejects zero, negative, non-integer, and non-finite amounts', () => {
    expect(splitAmount(0)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(splitAmount(-5)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(splitAmount(NaN)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(splitAmount(Infinity)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(splitAmount(100.5)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
  });
});
