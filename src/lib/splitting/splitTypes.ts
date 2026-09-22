/** One payment chunk within a (possibly single-chunk) split run. */
export interface Split {
  /** 1-based position within the run. */
  index: number;
  /** Whole-rupee amount for this chunk. */
  amount: number;
}

export type SplitResult = { ok: true; splits: Split[] } | { ok: false; error: 'INVALID_AMOUNT' };

export interface AmountValidation {
  valid: boolean;
  error?: string;
}
