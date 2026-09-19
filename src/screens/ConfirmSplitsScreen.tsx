import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { splitAmount } from '../lib/splitting/splitAmount';
import { formatRupees } from '../lib/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmSplits'>;

/**
 * Shows the exact "Payment Summary" breakdown before any money moves. A
 * single-split case (≤₹2000) collapses to a one-line confirmation, but still
 * routes through the same orchestrator code path on PaymentProgress.
 */
export function ConfirmSplitsScreen({ route, navigation }: Props) {
  const { recipient, amount } = route.params;
  const splitResult = useMemo(() => splitAmount(amount), [amount]);
  const splits = splitResult.ok ? splitResult.splits : [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Payment Summary</Text>
      <Text style={styles.line}>Recipient: {recipient.name ?? recipient.upiId}</Text>
      <Text style={styles.line}>Total Amount: {formatRupees(amount)}</Text>

      {splits.length > 1 ? (
        <View style={styles.splitsBox}>
          <Text style={styles.splitsTitle}>Will be split into:</Text>
          {splits.map((split) => (
            <Text key={split.index} style={styles.splitLine}>
              ✓ Payment {split.index}: {formatRupees(split.amount)}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.singleLine}>
          This is a single payment of {formatRupees(amount)} — no splitting needed.
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => navigation.navigate('PaymentProgress', { recipient, amount })}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  line: { fontSize: 16, marginBottom: 6 },
  splitsBox: { marginTop: 16, backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14 },
  splitsTitle: { fontWeight: '700', marginBottom: 8 },
  splitLine: { fontSize: 15, marginVertical: 2 },
  singleLine: { marginTop: 16, fontSize: 15, color: '#555' },
  actions: { flexDirection: 'row', marginTop: 32, gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#EEE' },
  cancelButtonText: { fontWeight: '700', color: '#444' },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#1A73E8' },
  confirmButtonText: { fontWeight: '700', color: '#fff' },
});
