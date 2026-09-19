/** Injectable random-hex source, so tests never need the native crypto binding. */
export type RandomHexSource = () => Promise<string> | string;

/** Default random source: 6 cryptographically-random bytes from `expo-crypto`,
 * imported lazily so importing this module has no load-time native dependency. */
async function defaultRandomHex(): Promise<string> {
  const Crypto = await import('expo-crypto');
  const bytes = await Crypto.getRandomBytesAsync(6);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a unique, PSP-safe transaction reference (`tr`) for one split
 * payment attempt. Every retry of a split MUST call this again rather than
 * reusing a previous reference — PSPs reject a duplicate `tr` even for a
 * legitimately retried payment, so reuse would silently break retries.
 *
 * The result is alphanumeric-only and capped at 35 characters, comfortably
 * inside the reference-length limits observed across PSPs.
 */
export async function generateTxnRef(
  runId: string,
  splitIndex: number,
  attempt: number,
  randomHex: RandomHexSource = defaultRandomHex
): Promise<string> {
  const rand = await randomHex();
  const shortRunId = runId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  const ref = `SPL${splitIndex}A${attempt}${shortRunId}${rand}`.toUpperCase();
  return ref.slice(0, 35);
}
