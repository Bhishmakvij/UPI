import { phoneToUpi } from '../../src/lib/upi/phoneToUpi';

describe('phoneToUpi', () => {
  it('accepts a bare 10-digit number', () => {
    expect(phoneToUpi('9876543210')).toEqual({ ok: true, digits: '9876543210', upiId: '9876543210@upi' });
  });

  it('accepts a +91-prefixed number with spaces', () => {
    expect(phoneToUpi('+91 98765 43210')).toEqual({
      ok: true,
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('accepts a 0-prefixed 11-digit number', () => {
    expect(phoneToUpi('09876543210')).toEqual({
      ok: true,
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('accepts a bare 91-prefixed 12-digit number', () => {
    expect(phoneToUpi('919876543210')).toEqual({
      ok: true,
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('accepts dashes as separators', () => {
    expect(phoneToUpi('98765-43210')).toEqual({
      ok: true,
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('rejects fewer than 10 digits', () => {
    expect(phoneToUpi('98765')).toEqual({ ok: false, error: 'Phone must be 10 digits' });
  });

  it('rejects more than 10 digits after stripping known prefixes', () => {
    expect(phoneToUpi('123456789012345')).toEqual({ ok: false, error: 'Phone must be 10 digits' });
  });

  it('rejects non-numeric input', () => {
    expect(phoneToUpi('98765abcde')).toEqual({ ok: false, error: 'Only numbers allowed' });
  });

  it('rejects empty input', () => {
    expect(phoneToUpi('')).toEqual({ ok: false, error: 'Please enter phone number' });
    expect(phoneToUpi('   ')).toEqual({ ok: false, error: 'Please enter phone number' });
  });
});
