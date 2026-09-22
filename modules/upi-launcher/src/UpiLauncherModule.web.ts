import type { UpiLaunchResult } from './UpiLauncher.types';

/** Web has no UPI app ecosystem to launch into; this module simply reports "unavailable". */
export default {
  async hasUpiApp(): Promise<boolean> {
    return false;
  },
  async pay(_uri: string): Promise<UpiLaunchResult> {
    throw new Error('UPI payments are not supported on web.');
  },
};
