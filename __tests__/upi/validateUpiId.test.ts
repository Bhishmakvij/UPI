import { validateUpiId } from '../../src/lib/upi/validateUpiId';

describe('validateUpiId', () => {
  it('accepts a well-known handle with no warning', () => {
    expect(validateUpiId('raj.kumar@okaxis')).toEqual({ valid: true });
    expect(validateUpiId('name@okhdfcbank')).toEqual({ valid: true });
  });

  it('accepts an unrecognized-but-well-formed handle with a soft warning', () => {
    const result = validateUpiId('name@somebrandnewbank');
    expect(result.valid).toBe(true);
    expect(result.warning).toBe('Unknown bank. Continue anyway?');
  });

  it('rejects empty input', () => {
    expect(validateUpiId('')).toEqual({ valid: false, error: 'Please enter UPI ID' });
    expect(validateUpiId('   ')).toEqual({ valid: false, error: 'Please enter UPI ID' });
  });

  it('rejects input missing @', () => {
    expect(validateUpiId('rajkumar')).toEqual({
      valid: false,
      error: 'UPI ID must contain @ (e.g., name@bank)',
    });
  });

  it('rejects input with more than one @', () => {
    expect(validateUpiId('raj@kumar@axis').valid).toBe(false);
  });

  it('rejects invalid characters in the local part', () => {
    const result = validateUpiId('raj#kumar@axis');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid characters. Use letters, numbers, dots');
  });

  it('rejects a malformed handle', () => {
    expect(validateUpiId('raj@123').valid).toBe(false);
    expect(validateUpiId('raj@').valid).toBe(false);
  });

  it('accepts dots, underscores, and hyphens in the local part', () => {
    expect(validateUpiId('raj.kumar-2_3@okaxis')).toEqual({ valid: true });
  });
});
