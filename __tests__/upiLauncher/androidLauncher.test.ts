const mockPay = jest.fn();
const mockHasUpiApp = jest.fn();

jest.mock('../../modules/upi-launcher/src/UpiLauncherModule', () => ({
  __esModule: true,
  default: {
    pay: (...args: unknown[]) => mockPay(...args),
    hasUpiApp: (...args: unknown[]) => mockHasUpiApp(...args),
  },
}));

jest.mock('../../src/lib/network', () => ({
  getConnectivityStatus: jest.fn(async () => 'online'),
}));

import { payViaAndroid, hasUpiAppInstalled } from '../../src/lib/upiLauncher/androidLauncher';
import { getConnectivityStatus } from '../../src/lib/network';

describe('payViaAndroid', () => {
  beforeEach(() => {
    mockPay.mockReset();
    mockHasUpiApp.mockReset();
    (getConnectivityStatus as jest.Mock).mockReset();
    (getConnectivityStatus as jest.Mock).mockResolvedValue('online');
  });

  it('resolves ok:true with the native result on a clean SUCCESS', async () => {
    mockPay.mockResolvedValue({ status: 'SUCCESS', txnId: 'T1' });
    const outcome = await payViaAndroid('upi://pay?pa=a@b');
    expect(outcome).toEqual({ ok: true, result: { status: 'SUCCESS', txnId: 'T1' } });
  });

  it('resolves ok:true even for a non-success native status (caller maps it further)', async () => {
    mockPay.mockResolvedValue({ status: 'CANCELLED' });
    const outcome = await payViaAndroid('upi://pay?pa=a@b');
    expect(outcome.ok).toBe(true);
  });

  it('maps ERR_NO_UPI_APP to a typed NO_UPI_APP outcome with a specific message', async () => {
    mockPay.mockRejectedValue(Object.assign(new Error('no app'), { code: 'ERR_NO_UPI_APP' }));
    const outcome = await payViaAndroid('upi://pay?pa=a@b');
    expect(outcome).toEqual({
      ok: false,
      code: 'NO_UPI_APP',
      message: "The UPI payment app isn't installed. Install one to continue.",
    });
  });

  it('maps ERR_PAYMENT_IN_PROGRESS to a typed outcome', async () => {
    mockPay.mockRejectedValue(Object.assign(new Error('busy'), { code: 'ERR_PAYMENT_IN_PROGRESS' }));
    const outcome = await payViaAndroid('upi://pay?pa=a@b');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe('PAYMENT_IN_PROGRESS');
  });

  it('maps an unrecognized native error code to UNKNOWN with a generic message', async () => {
    mockPay.mockRejectedValue(Object.assign(new Error('mystery'), { code: 'ERR_SOMETHING_ELSE' }));
    const outcome = await payViaAndroid('upi://pay?pa=a@b');
    expect(outcome).toEqual({ ok: false, code: 'UNKNOWN', message: 'Something went wrong. Please try again.' });
  });

  it('reports offline-specific copy when a timeout coincides with no connectivity', async () => {
    jest.useFakeTimers();
    (getConnectivityStatus as jest.Mock).mockResolvedValue('offline');
    mockPay.mockImplementation(() => new Promise(() => {})); // never resolves
    const outcome = payViaAndroid('upi://pay?pa=a@b');
    await jest.advanceTimersByTimeAsync(61_000);
    const result = await outcome;
    expect(result).toEqual({ ok: false, code: 'TIMEOUT', message: 'No internet connection. Check your network.' });
    jest.useRealTimers();
  });
});

describe('hasUpiAppInstalled', () => {
  it('returns the native module result', async () => {
    mockHasUpiApp.mockResolvedValue(true);
    expect(await hasUpiAppInstalled()).toBe(true);
  });

  it('returns false rather than throwing if the native call fails', async () => {
    mockHasUpiApp.mockRejectedValue(new Error('boom'));
    expect(await hasUpiAppInstalled()).toBe(false);
  });
});
