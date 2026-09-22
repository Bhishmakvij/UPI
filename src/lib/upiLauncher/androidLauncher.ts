import { NETWORK_ERRORS, PAYMENT_ERRORS } from '../errorMessages';
import { getConnectivityStatus } from '../network';
import UpiLauncherNative from '../../../modules/upi-launcher/src/UpiLauncherModule';
import type { UpiLaunchResult } from '../../../modules/upi-launcher/src/UpiLauncher.types';

export type AndroidPayErrorCode =
  | 'NO_UPI_APP'
  | 'LAUNCH_FAILED'
  | 'PAYMENT_IN_PROGRESS'
  | 'NO_ACTIVITY'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type AndroidPayOutcome =
  | { ok: true; result: UpiLaunchResult }
  | { ok: false; code: AndroidPayErrorCode; message: string };

/** In-flight timeout backstop: if the native module's promise never settles
 * (the module or the launched UPI app got stuck), treat it as a network/app
 * timeout rather than hanging the payment screen forever. Matches the 60s
 * duplicate-payment safety window described in the project plan. */
const PAY_TIMEOUT_MS = 60_000;

function mapNativeErrorCode(code: unknown): AndroidPayErrorCode {
  switch (code) {
    case 'ERR_NO_UPI_APP':
      return 'NO_UPI_APP';
    case 'ERR_PAYMENT_IN_PROGRESS':
      return 'PAYMENT_IN_PROGRESS';
    case 'ERR_NO_ACTIVITY':
      return 'NO_ACTIVITY';
    case 'ERR_LAUNCH_FAILED':
      return 'LAUNCH_FAILED';
    default:
      return 'UNKNOWN';
  }
}

function describeAndroidError(code: AndroidPayErrorCode): string {
  switch (code) {
    case 'NO_UPI_APP':
      return PAYMENT_ERRORS.noUpiApp;
    case 'PAYMENT_IN_PROGRESS':
      return PAYMENT_ERRORS.paymentInProgress;
    case 'TIMEOUT':
      return NETWORK_ERRORS.connectionLost;
    case 'NO_ACTIVITY':
    case 'LAUNCH_FAILED':
    case 'UNKNOWN':
    default:
      return PAYMENT_ERRORS.failedGeneric;
  }
}

/**
 * Whether any UPI app is installed on this device, checked before even
 * attempting a payment so a missing app produces the specific "install a UPI
 * app" prompt rather than a confusing launch failure.
 */
export async function hasUpiAppInstalled(): Promise<boolean> {
  try {
    return await UpiLauncherNative.hasUpiApp();
  } catch {
    return false;
  }
}

/**
 * Launches one UPI payment on Android through the owned native module, which
 * waits for the chosen UPI app to hand back a result so the caller can
 * auto-advance on a clean SUCCESS. Never throws — every failure mode is
 * reported as a typed, user-describable outcome.
 */
export async function payViaAndroid(uri: string): Promise<AndroidPayOutcome> {
  try {
    const result = await Promise.race<UpiLaunchResult>([
      UpiLauncherNative.pay(uri),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(Object.assign(new Error('TIMEOUT'), { isTimeout: true })), PAY_TIMEOUT_MS);
      }),
    ]);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof Error && (error as { isTimeout?: boolean }).isTimeout) {
      // Distinguish "no internet at all" from "the UPI app just didn't
      // respond in time" — they get different, more actionable copy.
      const connectivity = await getConnectivityStatus();
      const message = connectivity === 'offline' ? NETWORK_ERRORS.offline : describeAndroidError('TIMEOUT');
      return { ok: false, code: 'TIMEOUT', message };
    }
    const code = mapNativeErrorCode((error as { code?: unknown } | undefined)?.code);
    return { ok: false, code, message: describeAndroidError(code) };
  }
}
