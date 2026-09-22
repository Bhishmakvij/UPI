import { resolveUpiFromDecodedStrings } from '../../src/lib/qr/resolveUpiFromDecodedStrings';

describe('resolveUpiFromDecodedStrings', () => {
  it('reports no_qr_found for an empty decode list', () => {
    expect(resolveUpiFromDecodedStrings([])).toEqual({ status: 'no_qr_found' });
  });

  it('reports not_upi when every decoded code is non-UPI', () => {
    expect(resolveUpiFromDecodedStrings(['https://example.com', 'plain text'])).toEqual({ status: 'not_upi' });
  });

  it('resolves the first UPI-shaped code among several decoded strings', () => {
    const result = resolveUpiFromDecodedStrings(['https://example.com', 'upi://pay?pa=merchant@bank&pn=Merchant']);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.pa).toBe('merchant@bank');
      expect(result.data.pn).toBe('Merchant');
    }
  });

  it('resolves a single valid UPI QR', () => {
    const result = resolveUpiFromDecodedStrings(['upi://pay?pa=raj@upi']);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.pa).toBe('raj@upi');
    }
  });
});
