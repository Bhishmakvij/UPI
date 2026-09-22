import { ContactUpiLinks, type ContactUpiLinkStore } from '../../src/lib/recipient/contactUpiLinks';

function createFakeStore(): ContactUpiLinkStore {
  const map = new Map<string, string>();
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, upiId) {
      map.set(key, upiId);
    },
    async findKeyByUpiId(upiId) {
      for (const [key, value] of map.entries()) {
        if (value === upiId) return key;
      }
      return undefined;
    },
  };
}

describe('ContactUpiLinks', () => {
  it('returns undefined for a contact with no learned UPI yet', async () => {
    const links = new ContactUpiLinks(createFakeStore());
    expect(await links.resolve('contact-1')).toBeUndefined();
  });

  it('remembers a learned UPI ID for later resolution', async () => {
    const links = new ContactUpiLinks(createFakeStore());
    await links.learn('contact-1', 'raj.kumar@axis');
    expect(await links.resolve('contact-1')).toBe('raj.kumar@axis');
  });

  it('overwrites a previously learned UPI ID', async () => {
    const links = new ContactUpiLinks(createFakeStore());
    await links.learn('contact-1', 'old@axis');
    await links.learn('contact-1', 'new@axis');
    expect(await links.resolve('contact-1')).toBe('new@axis');
  });

  it('supports reverse lookup from a UPI ID to its contact key', async () => {
    const links = new ContactUpiLinks(createFakeStore());
    await links.learn('contact-1', 'raj.kumar@axis');
    expect(await links.findContactKeyForUpi('raj.kumar@axis')).toBe('contact-1');
    expect(await links.findContactKeyForUpi('unknown@axis')).toBeUndefined();
  });
});
