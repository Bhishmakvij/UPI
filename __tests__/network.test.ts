import { getConnectivityStatus } from '../src/lib/network';

describe('getConnectivityStatus', () => {
  it('returns whatever the injected checker reports', async () => {
    expect(await getConnectivityStatus(async () => 'online')).toBe('online');
    expect(await getConnectivityStatus(async () => 'offline')).toBe('offline');
    expect(await getConnectivityStatus(async () => 'unknown')).toBe('unknown');
  });

  it('never throws when using the default checker, even without a real network module', async () => {
    await expect(getConnectivityStatus()).resolves.toEqual(expect.any(String));
  });
});
