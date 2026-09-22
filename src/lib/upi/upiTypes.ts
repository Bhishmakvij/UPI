/** Shape of a successfully parsed `upi://pay?...` deep link, per the NPCI UPI Linking Specification. */
export interface ParsedUpiQr {
  /** The exact string that was scanned/parsed, kept for audit. */
  raw: string;
  /** Payee VPA — the only mandatory field we enforce. */
  pa: string;
  /** Payee display name, if the QR/link included one. */
  pn?: string;
  /** Amount in rupees, if the QR/link included one and it parsed as a positive number. */
  am?: number;
  /** ISO currency code; defaults to 'INR' when the source omitted it. */
  cu: string;
  /** Transaction note / description. */
  tn?: string;
  /** The merchant/payee's own transaction reference (not one we generate). */
  tr?: string;
  /** Merchant category code, if present. */
  mc?: string;
  /** Any other query params, verbatim, so vendor-specific fields are never silently dropped. */
  extra: Record<string, string>;
}

export type ParseUpiError = 'NOT_UPI_URI' | 'MISSING_PAYEE_ADDRESS' | 'MALFORMED';

export type ParseUpiResult = { ok: true; data: ParsedUpiQr } | { ok: false; error: ParseUpiError };

/** Parameters used to build an outgoing `upi://pay` deep link for one split payment. */
export interface BuildUpiUriParams {
  pa: string;
  pn?: string;
  /** Whole-rupee amount for this split. */
  am?: number;
  cu?: string;
  tn?: string;
  /** Our own generated, per-attempt unique transaction reference. */
  tr: string;
  mc?: string;
}

export interface UpiIdValidation {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface PhoneToUpiResult {
  ok: boolean;
  error?: string;
  digits?: string;
  upiId?: string;
}
