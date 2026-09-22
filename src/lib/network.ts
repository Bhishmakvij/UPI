export type ConnectivityStatus = 'online' | 'offline' | 'unknown';
export type ConnectivityChecker = () => Promise<ConnectivityStatus>;

/** Default checker, backed by `expo-network`, imported lazily so this module
 * has no load-time dependency on the native binding. */
async function defaultConnectivityChecker(): Promise<ConnectivityStatus> {
  try {
    const Network = await import('expo-network');
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === undefined) return 'unknown';
    return state.isConnected ? 'online' : 'offline';
  } catch {
    return 'unknown';
  }
}

/**
 * Reports device connectivity, used to distinguish a genuine "no internet"
 * failure from a UPI app simply not responding — the two get different
 * user-facing copy (see `errorMessages.ts`'s `NETWORK_ERRORS`). Accepts an
 * injectable checker so callers/tests never need the native module.
 */
export async function getConnectivityStatus(
  checker: ConnectivityChecker = defaultConnectivityChecker
): Promise<ConnectivityStatus> {
  return checker();
}
