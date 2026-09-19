import type { BuildUpiUriParams } from './upiTypes';

/**
 * Builds an outgoing `upi://pay?...` deep link for one split payment.
 *
 * Encodes each value with `encodeURIComponent` rather than relying on
 * `URLSearchParams#toString()`, which uses `application/x-www-form-urlencoded`
 * encoding and turns spaces into literal `+` characters. Some UPI apps decode
 * incoming links with a plain `decodeURIComponent` and don't treat `+` as a
 * space, so sticking to `%XX`-only encoding keeps this link interoperable with
 * every UPI app rather than just the ones with a lenient parser.
 */
export function buildUpiUri(params: BuildUpiUriParams): string {
  const entries: [string, string][] = [['pa', params.pa]];
  if (params.pn) entries.push(['pn', params.pn]);
  if (params.am !== undefined) entries.push(['am', params.am.toFixed(2)]);
  entries.push(['cu', params.cu ?? 'INR']);
  if (params.tn) entries.push(['tn', params.tn]);
  entries.push(['tr', params.tr]);
  if (params.mc) entries.push(['mc', params.mc]);

  const query = entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `upi://pay?${query}`;
}
