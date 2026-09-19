import { NETWORK_ERRORS, PAYMENT_ERRORS, STATUS_UNCLEAR } from '../errorMessages';
import { canManuallyRetry } from './retryPolicy';

export type SplitRunStatus =
  | 'PENDING'
  | 'LAUNCHING'
  | 'AWAITING_ANDROID_RESULT'
  | 'AWAITING_IOS_RETURN'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'SUBMITTED'
  | 'SKIPPED';

/** Runtime state for one split within an in-progress payment run. */
export interface SplitRuntime {
  splitId: string;
  index: number;
  amount: number;
  /** Current unique transaction reference — changes on every retry. */
  txnRef: string;
  status: SplitRunStatus;
  attemptNumber: number;
  retryCount: number;
  errorMessage?: string;
  upiAppUsed?: string;
}

export interface OrchestratorState {
  runId: string;
  recipientUpi: string;
  splits: SplitRuntime[];
  currentIndex: number;
  runStatus: 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
}

export const initialOrchestratorState: OrchestratorState = {
  runId: '',
  recipientUpi: '',
  splits: [],
  currentIndex: 0,
  runStatus: 'IDLE',
};

export type AndroidResultStatus = 'SUCCESS' | 'FAILURE' | 'SUBMITTED' | 'CANCELLED';

export type OrchestratorAction =
  | {
      type: 'START';
      payload: {
        runId: string;
        recipientUpi: string;
        splits: { index: number; amount: number; txnRef: string }[];
      };
    }
  | { type: 'LAUNCH_CURRENT' }
  | { type: 'LAUNCH_FAILED'; payload: { errorMessage: string } }
  | { type: 'ANDROID_RESULT'; payload: { status: AndroidResultStatus; errorMessage?: string; upiAppUsed?: string } }
  | { type: 'ANDROID_TIMEOUT' }
  | { type: 'IOS_LAUNCHED' }
  | { type: 'IOS_RETURNED_FOREGROUND' }
  | { type: 'IOS_CONFIRM_SUCCESS' }
  | { type: 'IOS_CONFIRM_UNCLEAR' }
  | { type: 'IOS_TIMEOUT' }
  | { type: 'RETRY_CURRENT'; payload: { newTxnRef: string } }
  | { type: 'SKIP_CURRENT' }
  | { type: 'ABORT_RUN' }
  | { type: 'ADVANCE' };

function updateCurrentSplit(
  state: OrchestratorState,
  updater: (split: SplitRuntime) => SplitRuntime
): OrchestratorState {
  const splits = state.splits.map((split, i) => (i === state.currentIndex ? updater(split) : split));
  return { ...state, splits };
}

/** Moves to the next split, or marks the run COMPLETED once every split has resolved. */
function advance(state: OrchestratorState): OrchestratorState {
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.splits.length) {
    return { ...state, currentIndex: nextIndex, runStatus: 'COMPLETED' };
  }
  return { ...state, currentIndex: nextIndex };
}

/**
 * Pure reducer driving one payment run through however many ≤₹2000 splits it
 * has. All side effects (launching the native Android module, opening an iOS
 * deep link, writing to SQLite) live in `usePaymentOrchestrator`, which
 * dispatches into this reducer in response to their results — keeping the
 * actual state transitions here fully synchronous and unit-testable.
 */
export function paymentMachineReducer(
  state: OrchestratorState,
  action: OrchestratorAction
): OrchestratorState {
  switch (action.type) {
    case 'START': {
      const splits: SplitRuntime[] = action.payload.splits.map((s) => ({
        splitId: `${action.payload.runId}-${s.index}`,
        index: s.index,
        amount: s.amount,
        txnRef: s.txnRef,
        status: 'PENDING',
        attemptNumber: 1,
        retryCount: 0,
      }));
      return {
        runId: action.payload.runId,
        recipientUpi: action.payload.recipientUpi,
        splits,
        currentIndex: 0,
        runStatus: 'IN_PROGRESS',
      };
    }

    case 'LAUNCH_CURRENT': {
      const current = state.splits[state.currentIndex];
      // Duplicate-payment guard: only a PENDING split can be launched. If a
      // launch is already in flight (or the split already resolved), a
      // second LAUNCH_CURRENT — e.g. from a double-tap — is silently ignored
      // rather than opening a second UPI intent for the same money.
      if (!current || current.status !== 'PENDING') return state;
      return updateCurrentSplit(state, (split) => ({ ...split, status: 'LAUNCHING' }));
    }

    case 'LAUNCH_FAILED': {
      // A pre-flight failure common to both platforms (no UPI app installed,
      // the deep link couldn't be opened at all) — never even reached a real
      // UPI app, so it's reported as FAILED without ever touching LAUNCHING.
      return updateCurrentSplit(state, (split) => ({
        ...split,
        status: 'FAILED',
        errorMessage: action.payload.errorMessage,
      }));
    }

    case 'ANDROID_RESULT': {
      const { status, errorMessage, upiAppUsed } = action.payload;
      const mapped: SplitRunStatus =
        status === 'SUCCESS'
          ? 'SUCCESS'
          : status === 'CANCELLED'
            ? 'CANCELLED'
            : status === 'SUBMITTED'
              ? 'SUBMITTED'
              : 'FAILED';
      const next = updateCurrentSplit(state, (split) => ({
        ...split,
        status: mapped,
        errorMessage: mapped === 'SUCCESS' ? undefined : errorMessage,
        upiAppUsed: upiAppUsed ?? split.upiAppUsed,
      }));
      // Only a clean SUCCESS auto-advances. FAILED/CANCELLED block for an
      // explicit retry/skip/abort choice; SUBMITTED (ambiguous, bank still
      // processing) blocks for the same unclear-status resolution iOS uses.
      return mapped === 'SUCCESS' ? advance(next) : next;
    }

    case 'ANDROID_TIMEOUT': {
      return updateCurrentSplit(state, (split) => ({
        ...split,
        status: 'FAILED',
        errorMessage: NETWORK_ERRORS.connectionLost,
      }));
    }

    case 'IOS_LAUNCHED': {
      return updateCurrentSplit(state, (split) => ({ ...split, status: 'AWAITING_IOS_RETURN' }));
    }

    case 'IOS_RETURNED_FOREGROUND': {
      // State itself doesn't change here — the hook uses this action as the
      // trigger to show the confirmation dialog; the actual resolution comes
      // via IOS_CONFIRM_SUCCESS / IOS_CONFIRM_UNCLEAR / RETRY_CURRENT.
      return state;
    }

    case 'IOS_CONFIRM_SUCCESS': {
      return advance(updateCurrentSplit(state, (split) => ({ ...split, status: 'SUCCESS' })));
    }

    case 'IOS_CONFIRM_UNCLEAR': {
      return updateCurrentSplit(state, (split) => ({
        ...split,
        status: 'SUBMITTED',
        errorMessage: STATUS_UNCLEAR.shortLabel,
      }));
    }

    case 'IOS_TIMEOUT': {
      return updateCurrentSplit(state, (split) => ({
        ...split,
        status: 'FAILED',
        errorMessage: PAYMENT_ERRORS.iosTimeout,
      }));
    }

    case 'RETRY_CURRENT': {
      const current = state.splits[state.currentIndex];
      if (!current || !canManuallyRetry(current.retryCount)) return state;
      return updateCurrentSplit(state, (split) => ({
        ...split,
        status: 'PENDING',
        attemptNumber: split.attemptNumber + 1,
        retryCount: split.retryCount + 1,
        txnRef: action.payload.newTxnRef,
        errorMessage: undefined,
      }));
    }

    case 'SKIP_CURRENT': {
      return advance(updateCurrentSplit(state, (split) => ({ ...split, status: 'SKIPPED' })));
    }

    case 'ABORT_RUN': {
      // Every not-yet-successful split from the current point on is marked
      // SKIPPED; anything already SUCCESS keeps that status — an abort must
      // never erase a payment that actually went through.
      const splits = state.splits.map((split, i) =>
        i >= state.currentIndex && split.status !== 'SUCCESS'
          ? { ...split, status: 'SKIPPED' as const }
          : split
      );
      return { ...state, splits, runStatus: 'ABORTED' };
    }

    case 'ADVANCE': {
      return advance(state);
    }

    default:
      return state;
  }
}
