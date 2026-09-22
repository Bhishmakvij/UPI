import { Linking } from 'react-native';
import { payViaIos } from '../../src/lib/upiLauncher/iosLauncher';

describe('payViaIos', () => {
  let canOpenURLSpy: jest.SpyInstance;
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL');
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    canOpenURLSpy.mockRestore();
    openURLSpy.mockRestore();
  });

  it('opens the URL and resolves ok:true when a UPI app can handle it', async () => {
    canOpenURLSpy.mockResolvedValue(true);
    const outcome = await payViaIos('upi://pay?pa=a@b');
    expect(outcome).toEqual({ ok: true });
    expect(openURLSpy).toHaveBeenCalledWith('upi://pay?pa=a@b');
  });

  it('reports NO_UPI_APP without ever calling openURL when nothing can handle the scheme', async () => {
    canOpenURLSpy.mockResolvedValue(false);
    const outcome = await payViaIos('upi://pay?pa=a@b');
    expect(outcome).toEqual({
      ok: false,
      code: 'NO_UPI_APP',
      message: 'Cannot open payment app. Install a UPI app to continue.',
    });
    expect(openURLSpy).not.toHaveBeenCalled();
  });

  it('reports OPEN_FAILED if openURL rejects', async () => {
    canOpenURLSpy.mockResolvedValue(true);
    openURLSpy.mockRejectedValue(new Error('failed'));
    const outcome = await payViaIos('upi://pay?pa=a@b');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe('OPEN_FAILED');
  });
});
