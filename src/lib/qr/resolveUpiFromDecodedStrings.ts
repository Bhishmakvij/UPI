import { parseUpiUri } from '../upi/parseUpiUri';
import type { ParsedUpiQr } from '../upi/upiTypes';

/**
 * Outcome of decoding a still image for QR content: the image may contain no
 * QR at all, one or more QR codes that aren't UPI links, or a usable UPI
 * link. Kept separate from {@link ParseUpiResult}'s error union because
 * "no QR found in the picture" is a distinct, more common failure than "the
 * QR wasn't UPI-shaped" and the UI needs to tell them apart.
 */
export type ImageQrOutcome =
  | { status: 'no_qr_found' }
  | { status: 'not_upi' }
  | { status: 'ok'; data: ParsedUpiQr };

/**
 * Picks the first UPI-shaped code out of everything a still image decoded to
 * (an image can contain more than one QR code, e.g. a screenshot with a page
 * of unrelated codes). Pure — no I/O — so it's unit-testable independent of
 * the camera/image-picker bindings that produce `decoded`.
 */
export function resolveUpiFromDecodedStrings(decoded: string[]): ImageQrOutcome {
  if (decoded.length === 0) return { status: 'no_qr_found' };
  for (const candidate of decoded) {
    const result = parseUpiUri(candidate);
    if (result.ok) return { status: 'ok', data: result.data };
  }
  return { status: 'not_upi' };
}
