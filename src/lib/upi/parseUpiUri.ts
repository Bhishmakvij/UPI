import type { ParseUpiResult, ParsedUpiQr } from './upiTypes';

/** Query keys we lift into typed fields; everything else is preserved verbatim in `extra`. */
const KNOWN_KEYS = new Set(['pa', 'pn', 'am', 'cu', 'tn', 'tr', 'mc']);

/**
 * Parses a scanned or manually-supplied UPI deep link (`upi://pay?...`) into a typed,
 * spec-tolerant structure. Never throws — every failure mode returns a typed error so
 * callers (e.g. the QR scan screen) can show a specific, recoverable message instead of
 * crashing on an unexpected QR payload.
 *
 * Deliberately does NOT use the global `URL` class to parse the whole string: React
 * Native's `URL` polyfill handles custom schemes like `upi://` inconsistently across
 * engines/versions. Instead we manually split off the query string and hand only that
 * to `URLSearchParams`, which reliably percent-decodes both `%XX` and `+` regardless of
 * how the host/scheme portion is shaped.
 */
export function parseUpiUri(input: string): ParseUpiResult {
  if (typeof input !== 'string') return { ok: false, error: 'MALFORMED' };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'MALFORMED' };

  // Accepts `upi://pay?...`, `UPI://PAY?...`, and the trailing-slash variant `upi://pay/?...`
  // seen from some QR generators, all case-insensitively.
  const schemeMatch = trimmed.match(/^upi:\/\/([^?]*)(?:\?(.*))?$/i);
  if (!schemeMatch) return { ok: false, error: 'NOT_UPI_URI' };

  const host = schemeMatch[1].replace(/\/+$/, '');
  if (host.toLowerCase() !== 'pay') {
    return { ok: false, error: 'NOT_UPI_URI' };
  }

  const queryString = schemeMatch[2] ?? '';
  const extra: Record<string, string> = {};
  let pa: string | undefined;
  let pn: string | undefined;
  let amRaw: string | undefined;
  let cu: string | undefined;
  let tn: string | undefined;
  let tr: string | undefined;
  let mc: string | undefined;

  if (queryString) {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(queryString);
    } catch {
      return { ok: false, error: 'MALFORMED' };
    }
    for (const [rawKey, value] of params.entries()) {
      const key = rawKey.toLowerCase();
      if (!KNOWN_KEYS.has(key)) {
        extra[rawKey] = value;
        continue;
      }
      switch (key) {
        case 'pa':
          pa = value;
          break;
        case 'pn':
          pn = value;
          break;
        case 'am':
          amRaw = value;
          break;
        case 'cu':
          cu = value;
          break;
        case 'tn':
          tn = value;
          break;
        case 'tr':
          tr = value;
          break;
        case 'mc':
          mc = value;
          break;
      }
    }
  }

  // `pa` is the one field we treat as truly mandatory — everything downstream (payment,
  // history) is keyed on it. A garbled/absent `am` is NOT a hard failure: the user can
  // still enter the amount manually on the next screen.
  if (!pa || !/^[\w.-]+@[\w.-]+$/.test(pa)) {
    return { ok: false, error: 'MISSING_PAYEE_ADDRESS' };
  }

  let am: number | undefined;
  if (amRaw !== undefined) {
    const parsed = Number(amRaw);
    if (Number.isFinite(parsed) && parsed > 0) am = parsed;
  }

  const data: ParsedUpiQr = {
    raw: trimmed,
    pa,
    pn: pn || undefined,
    am,
    cu: cu || 'INR',
    tn: tn || undefined,
    tr: tr || undefined,
    mc: mc || undefined,
    extra,
  };
  return { ok: true, data };
}
