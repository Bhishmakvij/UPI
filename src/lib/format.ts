import type { SplitRunStatus } from './orchestrator/paymentMachine';

/** Formats a whole-rupee amount with the ₹ symbol and Indian-style thousands separators. */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** "Payment 2 of 4 — ₹2000" header text used on the payment progress screen. */
export function formatSplitProgressLabel(index: number, total: number, amount: number): string {
  return `Payment ${index} of ${total} — ${formatRupees(amount)}`;
}

const IN_FLIGHT_STATUSES: SplitRunStatus[] = ['LAUNCHING', 'AWAITING_ANDROID_RESULT', 'AWAITING_IOS_RETURN'];

function markerForStatus(status: SplitRunStatus): string {
  if (status === 'SUCCESS') return '✓';
  if (status === 'PENDING') return '○';
  if (IN_FLIGHT_STATUSES.includes(status)) return '⟳';
  return '✗'; // FAILED, CANCELLED, SUBMITTED, SKIPPED
}

/** "✓ Payment 1/3: 2000 - SUCCESS" style line used in the split progress list. */
export function formatSplitStatusLine(
  index: number,
  total: number,
  amount: number,
  status: SplitRunStatus
): string {
  return `${markerForStatus(status)} Payment ${index}/${total}: ${amount} - ${status}`;
}
