import {
  paymentMachineReducer,
  initialOrchestratorState,
  type OrchestratorState,
} from '../../src/lib/orchestrator/paymentMachine';

function started(splitCount = 1): OrchestratorState {
  const splits = Array.from({ length: splitCount }, (_, i) => ({
    index: i + 1,
    amount: 2000,
    txnRef: `REF${i + 1}`,
  }));
  return paymentMachineReducer(initialOrchestratorState, {
    type: 'START',
    payload: { runId: 'run-1', recipientUpi: 'shop@axis', splits },
  });
}

describe('paymentMachineReducer', () => {
  it('START seeds one PENDING split per input split and sets IN_PROGRESS', () => {
    const state = started(3);
    expect(state.runStatus).toBe('IN_PROGRESS');
    expect(state.currentIndex).toBe(0);
    expect(state.splits.map((s) => s.status)).toEqual(['PENDING', 'PENDING', 'PENDING']);
  });

  it('Android success path auto-advances', () => {
    let state = started(2);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    expect(state.splits[0].status).toBe('LAUNCHING');

    state = paymentMachineReducer(state, {
      type: 'ANDROID_RESULT',
      payload: { status: 'SUCCESS', upiAppUsed: 'com.google.android.apps.nbu.paisa.user' },
    });
    expect(state.splits[0].status).toBe('SUCCESS');
    expect(state.splits[0].upiAppUsed).toBe('com.google.android.apps.nbu.paisa.user');
    expect(state.currentIndex).toBe(1);
    expect(state.runStatus).toBe('IN_PROGRESS');
  });

  it('completes the run once the last split succeeds', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'SUCCESS' } });
    expect(state.runStatus).toBe('COMPLETED');
  });

  it('Android failure blocks auto-advance and records the error', () => {
    let state = started(2);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, {
      type: 'ANDROID_RESULT',
      payload: { status: 'FAILURE', errorMessage: 'Insufficient balance' },
    });
    expect(state.splits[0].status).toBe('FAILED');
    expect(state.splits[0].errorMessage).toBe('Insufficient balance');
    expect(state.currentIndex).toBe(0); // did not advance
  });

  it('failure -> retry -> success path generates a new txn ref and eventually advances', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, {
      type: 'ANDROID_RESULT',
      payload: { status: 'FAILURE', errorMessage: 'Payment failed' },
    });
    expect(state.splits[0].retryCount).toBe(0);

    state = paymentMachineReducer(state, { type: 'RETRY_CURRENT', payload: { newTxnRef: 'REF1-RETRY-1' } });
    expect(state.splits[0].status).toBe('PENDING');
    expect(state.splits[0].txnRef).toBe('REF1-RETRY-1');
    expect(state.splits[0].txnRef).not.toBe('REF1');
    expect(state.splits[0].retryCount).toBe(1);
    expect(state.splits[0].attemptNumber).toBe(2);

    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'SUCCESS' } });
    expect(state.splits[0].status).toBe('SUCCESS');
    expect(state.runStatus).toBe('COMPLETED');
  });

  it('enforces the manual retry limit: a 4th retry after 3 failures is ignored', () => {
    let state = started(1);
    for (let i = 0; i < 3; i++) {
      state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
      state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'FAILURE' } });
      state = paymentMachineReducer(state, { type: 'RETRY_CURRENT', payload: { newTxnRef: `RETRY-${i}` } });
    }
    expect(state.splits[0].retryCount).toBe(3);
    const beforeFourthRetry = state;

    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'FAILURE' } });
    const afterFourthFailure = state;
    state = paymentMachineReducer(state, { type: 'RETRY_CURRENT', payload: { newTxnRef: 'SHOULD-NOT-APPLY' } });

    // The 4th RETRY_CURRENT is a no-op: state is unchanged from right after the 4th failure.
    expect(state).toBe(afterFourthFailure);
    expect(state.splits[0].retryCount).toBe(3);
    expect(state.splits[0].status).toBe('FAILED');
  });

  it('Android CANCELLED blocks auto-advance without an error message treated as a hard failure', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'CANCELLED' } });
    expect(state.splits[0].status).toBe('CANCELLED');
    expect(state.currentIndex).toBe(0);
  });

  it('Android SUBMITTED (ambiguous) blocks auto-advance pending explicit user confirmation', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'SUBMITTED' } });
    expect(state.splits[0].status).toBe('SUBMITTED');
    expect(state.currentIndex).toBe(0);
    expect(state.runStatus).toBe('IN_PROGRESS');
  });

  it('iOS return -> confirm success advances exactly like an Android success', () => {
    let state = started(2);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'IOS_LAUNCHED' });
    expect(state.splits[0].status).toBe('AWAITING_IOS_RETURN');

    state = paymentMachineReducer(state, { type: 'IOS_RETURNED_FOREGROUND' });
    expect(state.splits[0].status).toBe('AWAITING_IOS_RETURN'); // unchanged; hook shows the dialog

    state = paymentMachineReducer(state, { type: 'IOS_CONFIRM_SUCCESS' });
    expect(state.splits[0].status).toBe('SUCCESS');
    expect(state.currentIndex).toBe(1);
  });

  it('iOS confirm-unclear blocks advance with the unclear-status marker', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'IOS_LAUNCHED' });
    state = paymentMachineReducer(state, { type: 'IOS_RETURNED_FOREGROUND' });
    state = paymentMachineReducer(state, { type: 'IOS_CONFIRM_UNCLEAR' });
    expect(state.splits[0].status).toBe('SUBMITTED');
    expect(state.splits[0].errorMessage).toBe('Payment status unclear');
    expect(state.currentIndex).toBe(0);
  });

  it('iOS retry after a no-return timeout regenerates the ref and can still succeed', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'IOS_LAUNCHED' });
    state = paymentMachineReducer(state, { type: 'IOS_TIMEOUT' });
    expect(state.splits[0].status).toBe('FAILED');

    state = paymentMachineReducer(state, { type: 'RETRY_CURRENT', payload: { newTxnRef: 'REF1-RETRY' } });
    expect(state.splits[0].status).toBe('PENDING');
    expect(state.splits[0].txnRef).toBe('REF1-RETRY');

    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'IOS_LAUNCHED' });
    state = paymentMachineReducer(state, { type: 'IOS_RETURNED_FOREGROUND' });
    state = paymentMachineReducer(state, { type: 'IOS_CONFIRM_SUCCESS' });
    expect(state.splits[0].status).toBe('SUCCESS');
    expect(state.runStatus).toBe('COMPLETED');
  });

  it('mid-run abort marks the current and remaining splits SKIPPED but preserves already-succeeded ones', () => {
    let state = started(3);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'SUCCESS' } });
    expect(state.currentIndex).toBe(1);

    state = paymentMachineReducer(state, { type: 'ABORT_RUN' });
    expect(state.runStatus).toBe('ABORTED');
    expect(state.splits[0].status).toBe('SUCCESS'); // untouched
    expect(state.splits[1].status).toBe('SKIPPED');
    expect(state.splits[2].status).toBe('SKIPPED');
  });

  it('SKIP_CURRENT advances past a split the user chose not to retry', () => {
    let state = started(2);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'ANDROID_RESULT', payload: { status: 'FAILURE' } });
    state = paymentMachineReducer(state, { type: 'SKIP_CURRENT' });
    expect(state.splits[0].status).toBe('SKIPPED');
    expect(state.currentIndex).toBe(1);
  });

  it('duplicate-launch prevention: LAUNCH_CURRENT is ignored once already LAUNCHING', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    const afterFirstLaunch = state;
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    expect(state).toBe(afterFirstLaunch);
  });

  it('LAUNCH_FAILED (e.g. no UPI app installed) marks the split FAILED without ever going through LAUNCHING', () => {
    let state = started(1);
    state = paymentMachineReducer(state, {
      type: 'LAUNCH_FAILED',
      payload: { errorMessage: "The UPI payment app isn't installed. Install one to continue." },
    });
    expect(state.splits[0].status).toBe('FAILED');
    expect(state.splits[0].errorMessage).toBe("The UPI payment app isn't installed. Install one to continue.");
    expect(state.currentIndex).toBe(0);
  });

  it('duplicate-launch prevention: LAUNCH_CURRENT is ignored while awaiting an iOS return', () => {
    let state = started(1);
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    state = paymentMachineReducer(state, { type: 'IOS_LAUNCHED' });
    const awaitingReturn = state;
    state = paymentMachineReducer(state, { type: 'LAUNCH_CURRENT' });
    expect(state).toBe(awaitingReturn);
  });
});
