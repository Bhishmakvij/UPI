import type { RecipientMethod } from '../lib/db/types';

/** A fully-resolved payee, in the one shape every downstream screen consumes
 * regardless of which of the three input methods (QR / contact / phone / UPI
 * ID) produced it. */
export interface ResolvedRecipientParams {
  method: RecipientMethod;
  originalInput: string;
  upiId: string;
  name?: string;
  phone?: string;
  isContact: boolean;
  contactId?: string;
  /** Amount pre-filled from a QR's `am` param, if any — still editable, and
   * still subject to the >₹2000 splitting rule regardless of its source. */
  prefilledAmount?: number;
  /** Transaction note from a QR, if any. */
  qrNote?: string;
  /** Currency from a QR, if any — surfaced so AmountEntry can warn when it isn't INR. */
  currency?: string;
}

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  RecipientInput: undefined;
  AmountEntry: { recipient: ResolvedRecipientParams };
  ConfirmSplits: { recipient: ResolvedRecipientParams; amount: number };
  PaymentProgress: { recipient: ResolvedRecipientParams; amount: number };
  Result: { transactionId: string };
  HistoryList: undefined;
  HistoryDetail: { transactionId: string };
};
