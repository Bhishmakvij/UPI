import { validateAmount } from '../../src/lib/splitting/validateAmount';

describe('validateAmount', () => {
  it('accepts valid whole-rupee amounts', () => {
    expect(validateAmount('1')).toEqual({ valid: true });
    expect(validateAmount('2000')).toEqual({ valid: true });
    expect(validateAmount('999999')).toEqual({ valid: true });
  });

  it('rejects empty input', () => {
    expect(validateAmount('').valid).toBe(false);
    expect(validateAmount('   ').valid).toBe(false);
  });

  it('rejects zero', () => {
    expect(validateAmount('0')).toEqual({ valid: false, error: 'Amount must be greater than 0' });
  });

  it('rejects negative amounts', () => {
    expect(validateAmount('-5')).toEqual({ valid: false, error: 'Amount cannot be negative' });
  });

  it('rejects decimal amounts', () => {
    expect(validateAmount('100.50')).toEqual({ valid: false, error: 'Enter whole rupees only' });
  });

  it('rejects non-numeric input', () => {
    expect(validateAmount('abc')).toEqual({ valid: false, error: 'Only numbers allowed' });
    expect(validateAmount('100rs')).toEqual({ valid: false, error: 'Only numbers allowed' });
  });

  it('rejects amounts over the limit', () => {
    expect(validateAmount('1000000')).toEqual({ valid: false, error: 'Max amount: 999,999 rupees' });
  });

  it('prioritizes the negative error over the decimal error for a negative decimal', () => {
    expect(validateAmount('-0.5')).toEqual({ valid: false, error: 'Amount cannot be negative' });
  });
});
