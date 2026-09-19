import { buildUpiUri } from '../../src/lib/upi/buildUpiUri';
import { parseUpiUri } from '../../src/lib/upi/parseUpiUri';

describe('buildUpiUri', () => {
  it('builds a well-formed upi://pay link with all fields', () => {
    const uri = buildUpiUri({
      pa: 'merchant@okaxis',
      pn: 'Ramesh Traders',
      am: 2000,
      cu: 'INR',
      tn: 'Split 1 of 3',
      tr: 'SPL1A1XYZ',
    });
    expect(uri.startsWith('upi://pay?')).toBe(true);
    expect(uri).toContain('pa=merchant%40okaxis');
    expect(uri).toContain('am=2000.00');
  });

  it('never emits a literal + for spaces (uses %20 via encodeURIComponent)', () => {
    const uri = buildUpiUri({ pa: 'a@b', pn: 'Ramesh Traders', tr: 'REF' });
    expect(uri).not.toContain('+');
    expect(uri).toContain('Ramesh%20Traders');
  });

  it('round-trips through parseUpiUri with equivalent values', () => {
    const built = buildUpiUri({
      pa: 'shop.owner@ybl',
      pn: "O'Brien & Sons",
      am: 1500,
      tn: 'Payment for order #42',
      tr: 'REF-ABC-123',
    });
    const parsed = parseUpiUri(built);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.pa).toBe('shop.owner@ybl');
      expect(parsed.data.pn).toBe("O'Brien & Sons");
      expect(parsed.data.am).toBe(1500);
      expect(parsed.data.tn).toBe('Payment for order #42');
      expect(parsed.data.tr).toBe('REF-ABC-123');
      expect(parsed.data.cu).toBe('INR');
    }
  });

  it('omits optional fields that were not provided', () => {
    const uri = buildUpiUri({ pa: 'a@b', tr: 'REF' });
    expect(uri).not.toContain('pn=');
    expect(uri).not.toContain('am=');
    expect(uri).not.toContain('tn=');
    expect(uri).not.toContain('mc=');
  });
});
