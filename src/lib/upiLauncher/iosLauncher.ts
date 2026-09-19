import { Linking } from 'react-native';
import { PAYMENT_ERRORS } from '../errorMessages';

export type IosPayErrorCode = 'NO_UPI_APP' | 'OPEN_FAILED';

export type IosPayOutcome = { ok: true } | { ok: false; code: IosPayErrorCode; message: string };

/**
 * Opens a `upi://pay` deep link on iOS. Unlike Android, this cannot wait for
 * a result — iOS has no cross-app callback for arbitrary custom URL schemes.
 * Completion is inferred by the caller (`usePaymentOrchestrator`) from the
 * app returning to the foreground plus an explicit user confirmation.
 *
 * `Linking.canOpenURL` requires the `upi` scheme to be declared under
 * `LSApplicationQueriesSchemes` in Info.plist (already configured in
 * app.json) — without that entry this always reports `false` on iOS 9+
 * regardless of whether a UPI app is actually installed.
 */
export async function payViaIos(uri: string): Promise<IosPayOutcome> {
  try {
    const supported = await Linking.canOpenURL(uri);
    if (!supported) {
      return {
        ok: false,
        code: 'NO_UPI_APP',
        message: PAYMENT_ERRORS.cannotOpenPaymentApp,
      };
    }
    await Linking.openURL(uri);
    return { ok: true };
  } catch {
    return { ok: false, code: 'OPEN_FAILED', message: PAYMENT_ERRORS.failedGeneric };
  }
}
