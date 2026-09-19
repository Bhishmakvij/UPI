import { parseUpiUri } from '../../src/lib/upi/parseUpiUri';

describe('parseUpiUri', () => {
  it('parses a standard Google-Pay-style link', () => {
    const result = parseUpiUri(
      'upi://pay?pa=merchant@okaxis&pn=Ramesh%20Traders&am=250.00&cu=INR&tn=Order%20123&tr=REF123'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pa).toBe('merchant@okaxis');
      expect(result.data.pn).toBe('Ramesh Traders');
      expect(result.data.am).toBe(250);
      expect(result.data.cu).toBe('INR');
      expect(result.data.tn).toBe('Order 123');
      expect(result.data.tr).toBe('REF123');
    }
  });

  it('is case-insensitive for scheme and host, and tolerates a trailing slash', () => {
    for (const uri of [
      'UPI://PAY?pa=a@b',
      'Upi://Pay?pa=a@b',
      'upi://pay/?pa=a@b',
    ]) {
      const result = parseUpiUri(uri);
      expect(result.ok).toBe(true);
    }
  });

  it('treats a missing amount as absent rather than an error', () => {
    const result = parseUpiUri('upi://pay?pa=shop@ybl&pn=Shop');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.am).toBeUndefined();
    }
  });

  it('treats a garbled amount as absent rather than failing the whole parse', () => {
    const result = parseUpiUri('upi://pay?pa=shop@ybl&am=notanumber');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.am).toBeUndefined();
    }
  });

  it('defaults currency to INR when absent', () => {
    const result = parseUpiUri('upi://pay?pa=shop@ybl');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cu).toBe('INR');
  });

  it('preserves a non-INR currency rather than silently coercing it', () => {
    const result = parseUpiUri('upi://pay?pa=shop@ybl&cu=USD');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cu).toBe('USD');
  });

  it('passes through unknown vendor params verbatim in extra', () => {
    const result = parseUpiUri('upi://pay?pa=shop@ybl&mode=04&orgid=159761&sign=abc123');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.extra).toEqual({ mode: '04', orgid: '159761', sign: 'abc123' });
    }
  });

  it('fails with MISSING_PAYEE_ADDRESS when pa is absent', () => {
    const result = parseUpiUri('upi://pay?pn=Shop&am=100');
    expect(result).toEqual({ ok: false, error: 'MISSING_PAYEE_ADDRESS' });
  });

  it('fails with MISSING_PAYEE_ADDRESS when pa is malformed (no @)', () => {
    const result = parseUpiUri('upi://pay?pa=notanaddress');
    expect(result).toEqual({ ok: false, error: 'MISSING_PAYEE_ADDRESS' });
  });

  it('fails with NOT_UPI_URI for a non-UPI scheme', () => {
    expect(parseUpiUri('https://example.com?pa=a@b')).toEqual({ ok: false, error: 'NOT_UPI_URI' });
    expect(parseUpiUri('WIFI:T:WPA;S:mynetwork;P:pass;;')).toEqual({ ok: false, error: 'NOT_UPI_URI' });
  });

  it('fails with NOT_UPI_URI for a upi:// link that is not pay (e.g. mandate)', () => {
    expect(parseUpiUri('upi://mandate?pa=a@b')).toEqual({ ok: false, error: 'NOT_UPI_URI' });
  });

  it('fails with MALFORMED for empty or non-string input', () => {
    expect(parseUpiUri('')).toEqual({ ok: false, error: 'MALFORMED' });
    expect(parseUpiUri('   ')).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('never throws on garbage input', () => {
    expect(() => parseUpiUri('!!!not a uri at all!!!')).not.toThrow();
    expect(() => parseUpiUri('upi://')).not.toThrow();
  });
});
