export type RecipientMethod = 'contact_search' | 'phone_entry' | 'upi_entry' | 'qr_scan';
export type TransactionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
export type SplitStatus =
  | 'PENDING'
  | 'LAUNCHING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUBMITTED'
  | 'SKIPPED';

export interface TransactionRow {
  id: string;
  recipient_method: RecipientMethod;
  original_input: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_upi: string;
  is_contact: boolean;
  contact_id?: string;
  total_amount: number;
  status: TransactionStatus;
  created_at: number;
  updated_at: number;
}

export interface SplitRow {
  /** One row per *attempt* — a failed attempt and a successful retry both survive. */
  id: string;
  transaction_id: string;
  split_number: number;
  attempt_number: number;
  amount: number;
  txn_ref: string;
  status: SplitStatus;
  error_message?: string;
  retry_count: number;
  timestamp: number;
}

export interface RecentContactRow {
  /** = contact_upi; a repeat payment to the same UPI ID upserts this row rather than duplicating it. */
  id: string;
  contact_name?: string;
  contact_phone?: string;
  contact_upi: string;
  last_used: number;
  use_count: number;
}

export interface ContactUpiLinkRow {
  /** = OS contact id, or phone digits when no contact id exists. */
  id: string;
  upi_id: string;
  learned_at: number;
}

export interface TransactionListFilter {
  status?: TransactionStatus;
  paymentMethod?: RecipientMethod;
  /** Case-insensitive substring match against recipient name or UPI ID. */
  search?: string;
  dateFrom?: number;
  dateTo?: number;
  amountMin?: number;
  amountMax?: number;
}
