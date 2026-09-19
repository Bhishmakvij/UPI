import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatSplitProgressLabel } from '../lib/format';

/** "Payment 2 of 4 — ₹2,000" header shown atop the payment-progress screen. */
export function ProgressHeader({ index, total, amount }: { index: number; total: number; amount: number }) {
  return <Text style={styles.text}>{formatSplitProgressLabel(index, total, amount)}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});
