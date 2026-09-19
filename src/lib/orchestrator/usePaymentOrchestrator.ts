import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { paymentMachineReducer, initialOrchestratorState } from './paymentMachine';
import type { OrchestratorState, SplitRuntime } from './paymentMachine';
import { generateTxnRef } from './generateTxnRef';
import { buildUpiUri } from '../upi/buildUpiUri';
import { payViaAndroid } from '../upiLauncher/androidLauncher';
import { payViaIos } from '../upiLauncher/iosLauncher';
import type { TransactionsRepo } from '../db/transactionsRepo';
import type { SplitsRepo } from '../db/splitsRepo';
import type { RecipientMethod, SplitStatus } from '../db/types';

export interface StartRunParams {
  recipientUpi: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientMethod: RecipientMethod;
  originalInput: string;
  isContact: boolean;
  contactId?: string;
  splits: { index: number; amount: number }[];
}

export interface UsePaymentOrchestratorDeps {
  transactionsRepo: TransactionsRepo;
  splitsRepo: SplitsRepo;
}

/** 30s: how long we wait for the user to return from a UPI app on iOS before
 * offering a manual "Payment timeout. Try again?" prompt. */
const IOS_RETURN_TIMEOUT_MS = 30_000;

/**
 * Wires the pure `paymentMachineReducer` (see `paymentMachine.ts`) to its real
 * side effects: launching the platform-appropriate UPI mechanism, listening
 * for an iOS foreground return, and persisting every transition to SQLite as
 * it happens (not just at the end of the run) so a killed app never loses an
 * accurate record of what was actually paid.
 *
 * The reducer transitions themselves are covered by `paymentMachine.test.ts`;
 * this hook's own effect-wiring is exercised through manual device testing
 * (see the project plan's testing section) since it depends on the real
 * native module, `Linking`, and `AppState` behavior.
 */
export function usePaymentOrchestrator({ transactionsRepo, splitsRepo }: UsePaymentOrchestratorDeps) {
  const [state, dispatch] = useReducer(paymentMachineReducer, initialOrchestratorState);
  const iosTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosReturnHandledRef = useRef(false);
  // The reducer's AWAITING_IOS_RETURN status doesn't itself change when the
  // app comes back to the foreground (IOS_RETURNED_FOREGROUND is a no-op at
  // the state level, see paymentMachine.ts) — this flag is what actually
  // tells the UI "show the Yes/Retry/Unclear dialog now".
  const [showIosConfirmDialog, setShowIosConfirmDialog] = useState(false);

  const currentSplit: SplitRuntime | undefined = state.splits[state.currentIndex];

  const clearIosTimeout = useCallback(() => {
    if (iosTimeoutRef.current) {
      clearTimeout(iosTimeoutRef.current);
      iosTimeoutRef.current = null;
    }
  }, []);

  /** Mirrors one split's current in-memory status into its SQLite row. Called
   * after every transition so history is always accurate, even mid-run. */
  const persistSplit = useCallback(
    async (split: SplitRuntime | undefined) => {
      if (!split) return;
      await splitsRepo.updateStatus(split.splitId, {
        status: split.status as SplitStatus,
        error_message: split.errorMessage,
        retry_count: split.retryCount,
      });
    },
    [splitsRepo]
  );

  /** Starts a new run: persists the parent transaction and every split as
   * PENDING immediately, before any payment is attempted, so a crash right
   * after tapping "Confirm" still leaves an auditable — if incomplete —
   * transaction in history rather than nothing at all. */
  const start = useCallback(
    async (params: StartRunParams) => {
      const runId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const splitsWithRefs = await Promise.all(
        params.splits.map(async (s) => ({ ...s, txnRef: await generateTxnRef(runId, s.index, 1) }))
      );

      const totalAmount = params.splits.reduce((sum, s) => sum + s.amount, 0);
      await transactionsRepo.insert({
        id: runId,
        recipient_method: params.recipientMethod,
        original_input: params.originalInput,
        recipient_name: params.recipientName,
        recipient_phone: params.recipientPhone,
        recipient_upi: params.recipientUpi,
        is_contact: params.isContact,
        contact_id: params.contactId,
        total_amount: totalAmount,
        status: 'IN_PROGRESS',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      for (const s of splitsWithRefs) {
        await splitsRepo.insert(
          {
            id: `${runId}-${s.index}`,
            transaction_id: runId,
            split_number: s.index,
            attempt_number: 1,
            amount: s.amount,
            txn_ref: s.txnRef,
            status: 'PENDING',
            retry_count: 0,
            timestamp: Date.now(),
          },
          () => s.txnRef
        );
      }

      dispatch({
        type: 'START',
        payload: { runId, recipientUpi: params.recipientUpi, splits: splitsWithRefs },
      });
    },
    [transactionsRepo, splitsRepo]
  );

  /** Launches the currently-pending split on whichever platform we're running on. */
  const launchCurrent = useCallback(async () => {
    const split = state.splits[state.currentIndex];
    if (!split || split.status !== 'PENDING') return; // matches the reducer's own duplicate-launch guard

    dispatch({ type: 'LAUNCH_CURRENT' });
    const uri = buildUpiUri({
      pa: state.recipientUpi,
      am: split.amount,
      tn: `Split ${split.index} of ${state.splits.length}`,
      tr: split.txnRef,
    });

    if (Platform.OS === 'android') {
      const outcome = await payViaAndroid(uri);
      if (outcome.ok) {
        dispatch({
          type: 'ANDROID_RESULT',
          payload: {
            status: outcome.result.status,
            errorMessage:
              outcome.result.status === 'FAILURE' ? 'Payment failed. Please try again.' : undefined,
            // Android's chooser intent doesn't report which package the user
            // picked (a real platform limitation, not an oversight) — history
            // will show this split's UPI app as unknown rather than guessing.
          },
        });
      } else if (outcome.code === 'TIMEOUT') {
        dispatch({ type: 'ANDROID_TIMEOUT' });
      } else {
        dispatch({ type: 'LAUNCH_FAILED', payload: { errorMessage: outcome.message } });
      }
    } else {
      const outcome = await payViaIos(uri);
      if (!outcome.ok) {
        dispatch({ type: 'LAUNCH_FAILED', payload: { errorMessage: outcome.message } });
        return;
      }
      dispatch({ type: 'IOS_LAUNCHED' });
      iosReturnHandledRef.current = false;
      setShowIosConfirmDialog(false);
      clearIosTimeout();
      iosTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'IOS_TIMEOUT' });
      }, IOS_RETURN_TIMEOUT_MS);
    }
  }, [state, clearIosTimeout]);

  // Persist every split transition immediately, and roll the parent
  // transaction's own status forward once the run finishes.
  useEffect(() => {
    persistSplit(currentSplit);
  }, [currentSplit?.status, currentSplit?.retryCount, persistSplit, currentSplit]);

  useEffect(() => {
    if (state.runStatus === 'COMPLETED' || state.runStatus === 'ABORTED') {
      transactionsRepo.updateStatus(state.runId, state.runStatus);
    }
  }, [state.runStatus, state.runId, transactionsRepo]);

  // iOS-only: listen for the app returning to the foreground while a split is
  // AWAITING_IOS_RETURN, and surface the confirmation dialog exactly once per
  // launch (debounced via iosReturnHandledRef) — the OS can fire multiple
  // foreground events in quick succession (e.g. a notification tray dismiss),
  // and each one must not be mistaken for a fresh return from the UPI app.
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (currentSplit?.status !== 'AWAITING_IOS_RETURN') return;
      if (iosReturnHandledRef.current) return;
      iosReturnHandledRef.current = true;
      clearIosTimeout();
      setShowIosConfirmDialog(true);
      dispatch({ type: 'IOS_RETURNED_FOREGROUND' });
    });
    return () => subscription.remove();
  }, [currentSplit?.status, clearIosTimeout]);

  useEffect(() => clearIosTimeout, [clearIosTimeout]);

  const confirmIosSuccess = useCallback(() => {
    setShowIosConfirmDialog(false);
    dispatch({ type: 'IOS_CONFIRM_SUCCESS' });
  }, []);
  const confirmIosUnclear = useCallback(() => {
    setShowIosConfirmDialog(false);
    dispatch({ type: 'IOS_CONFIRM_UNCLEAR' });
  }, []);

  const retryCurrent = useCallback(async () => {
    const split = state.splits[state.currentIndex];
    if (!split) return;
    setShowIosConfirmDialog(false);
    const newTxnRef = await generateTxnRef(state.runId, split.index, split.attemptNumber + 1);
    dispatch({ type: 'RETRY_CURRENT', payload: { newTxnRef } });
  }, [state]);

  const skipCurrent = useCallback(() => dispatch({ type: 'SKIP_CURRENT' }), []);
  const abortRun = useCallback(() => dispatch({ type: 'ABORT_RUN' }), []);

  return useMemo(
    () => ({
      state,
      currentSplit,
      showIosConfirmDialog,
      start,
      launchCurrent,
      confirmIosSuccess,
      confirmIosUnclear,
      retryCurrent,
      skipCurrent,
      abortRun,
    }),
    [
      state,
      currentSplit,
      showIosConfirmDialog,
      start,
      launchCurrent,
      confirmIosSuccess,
      confirmIosUnclear,
      retryCurrent,
      skipCurrent,
      abortRun,
    ]
  );
}

export type { OrchestratorState };
