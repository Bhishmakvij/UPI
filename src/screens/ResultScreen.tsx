import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { SplitList } from '../components/SplitList';
import { formatRupees } from '../lib/format';
import type { SplitRow, TransactionRow } from '../lib/db/types';
import type { SplitRuntime } from '../lib/orchestrator/paymentMachine';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

function toRuntime(row: SplitRow): SplitRuntime {
  return {
    splitId: row.id,
    index: row.split_number,
    amount: row.amount,
    txnRef: row.txn_ref,
    status: row.status,
    attemptNumber: row.attempt_number,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
  };
}

/** Final summary once a run is COMPLETED or ABORTED: per-split outcome, and
 * a way back to Home or into the full History detail view. */
export function ResultScreen({ route, navigation }: Props) {
  const { transactionId } = route.params;
  const { transactionsRepo, splitsRepo } = useRepos();
  const [transaction, setTransaction] = useState<TransactionRow | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>([]);

  useEffect(() => {
    (async () => {
      setTransaction(await transactionsRepo.get(transactionId));
      setSplits(await splitsRepo.listByTransaction(transactionId));
    })();
  }, [transactionId, transactionsRepo, splitsRepo]);

  const succeeded = splits.filter((s) => s.status === 'SUCCESS').reduce((sum, s) => sum + s.amount, 0);
  const failed = splits.filter((s) => ['FAILED', 'CANCELLED', 'SUBMITTED'].includes(s.status));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{transaction?.status === 'COMPLETED' ? 'Payment Complete' : 'Payment Ended Early'}</Text>
      <Text style={styles.summary}>Sent: {formatRupees(succeeded)}</Text>
      {failed.length > 0 ? (
        <Text style={styles.summarySecondary}>{failed.length} split(s) not completed</Text>
      ) : null}

      <View style={styles.listBox}>
        <SplitList splits={splits.map(toRuntime)} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('HistoryDetail', { transactionId })}>
          <Text style={styles.secondaryButtonText}>View in History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.popToTop()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  summary: { fontSize: 17, fontWeight: '600' },
  summarySecondary: { fontSize: 14, color: '#FF3B30', marginTop: 4 },
  listBox: { marginTop: 20, flex: 1 },
  actions: { flexDirection: 'row', gap: 12 },
  secondaryButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#EEE' },
  secondaryButtonText: { fontWeight: '700', color: '#444' },
  primaryButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#1F3A93' },
  primaryButtonText: { fontWeight: '700', color: '#fff' },
});
