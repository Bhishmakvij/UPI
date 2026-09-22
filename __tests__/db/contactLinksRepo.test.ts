import { createInMemoryTableStore } from '../../src/lib/db/tableStore';
import { ContactLinksRepo } from '../../src/lib/db/contactLinksRepo';
import type { ContactUpiLinkRow } from '../../src/lib/db/types';

describe('ContactLinksRepo', () => {
  it('returns undefined for an unknown contact key', async () => {
    const repo = new ContactLinksRepo(createInMemoryTableStore<ContactUpiLinkRow>());
    expect(await repo.get('contact-1')).toBeUndefined();
  });

  it('learns and resolves a UPI id for a contact key', async () => {
    const repo = new ContactLinksRepo(createInMemoryTableStore<ContactUpiLinkRow>());
    await repo.set('contact-1', 'raj@axis');
    expect(await repo.get('contact-1')).toBe('raj@axis');
  });

  it('overwrites an existing link rather than duplicating it', async () => {
    const repo = new ContactLinksRepo(createInMemoryTableStore<ContactUpiLinkRow>());
    await repo.set('contact-1', 'old@axis');
    await repo.set('contact-1', 'new@axis');
    expect(await repo.get('contact-1')).toBe('new@axis');
  });

  it('resolves a contact key by reverse UPI-id lookup', async () => {
    const repo = new ContactLinksRepo(createInMemoryTableStore<ContactUpiLinkRow>());
    await repo.set('contact-1', 'raj@axis');
    expect(await repo.findKeyByUpiId('raj@axis')).toBe('contact-1');
    expect(await repo.findKeyByUpiId('missing@axis')).toBeUndefined();
  });
});
