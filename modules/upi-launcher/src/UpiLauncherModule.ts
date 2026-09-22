import { NativeModule, requireNativeModule } from 'expo';
import type { UpiLaunchResult } from './UpiLauncher.types';

declare class UpiLauncherModule extends NativeModule<Record<string, never>> {
  /** Whether any app on the device can handle a `upi://pay` intent. */
  hasUpiApp(): Promise<boolean>;
  /**
   * Launches `uri` via `startActivityForResult` and resolves once the UPI app
   * returns control to this app, with its parsed result. Rejects with
   * `ERR_NO_UPI_APP` if no app can handle the intent, or `ERR_PAYMENT_IN_PROGRESS`
   * if a previous call hasn't resolved yet (the JS orchestrator should never do
   * this, but the native side guards against it regardless).
   */
  pay(uri: string): Promise<UpiLaunchResult>;
}

export default requireNativeModule<UpiLauncherModule>('UpiLauncher');
