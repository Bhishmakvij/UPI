import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatSplitStatusLine } from '../lib/format';
import type { SplitRunStatus } from '../lib/orchestrator/paymentMachine';

export function SplitRow({
  index,
  total,
  amount,
  status,
}: {
  index: number;
  total: number;
  amount: number;
  status: SplitRunStatus;
}) {
  return <Text style={styles.text}>{formatSplitStatusLine(index, total, amount, status)}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 15, marginVertical: 3, fontVariant: ['tabular-nums'] },
});
