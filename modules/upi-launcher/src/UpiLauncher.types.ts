/** Outcome of one Android UPI payment intent, as resolved by the native module. */
export interface UpiLaunchResult {
  status: 'SUCCESS' | 'FAILURE' | 'SUBMITTED' | 'CANCELLED';
  txnId?: string;
  responseCode?: string;
  approvalRefNo?: string;
  /** The raw `response` extra string returned by the UPI app, kept for debugging. */
  rawResponse?: string;
}
