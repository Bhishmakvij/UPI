import React from 'react';
import { View } from 'react-native';
import { SplitRow } from './SplitRow';
import type { SplitRuntime } from '../lib/orchestrator/paymentMachine';

/** Renders the full "✓ Payment 1/3: 2000 - SUCCESS" style progress list. */
export function SplitList({ splits }: { splits: SplitRuntime[] }) {
  return (
    <View>
      {splits.map((split) => (
        <SplitRow
          key={split.splitId}
          index={split.index}
          total={splits.length}
          amount={split.amount}
          status={split.status}
        />
      ))}
    </View>
  );
}
