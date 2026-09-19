import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { formatRupees } from '../lib/format';
import type { SplitRow, TransactionRow } from '../lib/db/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

/** The full audit view for one transaction: every split *attempt* (including
 * failed ones superseded by a later retry), with its reference, status, and
 * timestamp — nothing is hidden or collapsed. */
export function HistoryDetailScreen({ route }: Props) {
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

  if (!transaction) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>{transaction.recipient_name ?? transaction.recipient_upi}</Text>
        <Text style={styles.subtitle}>{transaction.recipient_upi}</Text>
        <Text style={styles.meta}>
          {formatRupees(transaction.total_amount)} · {transaction.status} · via {transaction.recipient_method}
        </Text>
        <Text style={styles.meta}>{new Date(transaction.created_at).toLocaleString()}</Text>

        <View style={styles.divider} />

        {splits.map((split) => (
          <View key={split.id} style={styles.splitRow}>
            <Text style={styles.splitTitle}>
              {split.status === 'SUCCESS' ? '✓' : '✗'} Split {split.split_number}
              {split.attempt_number > 1 ? ` (attempt ${split.attempt_number})` : ''}: {formatRupees(split.amount)}
            </Text>
            <Text style={styles.splitStatus}>{split.status}</Text>
            {split.error_message ? <Text style={styles.splitError}>{split.error_message}</Text> : null}
            <Text style={styles.splitMeta}>
              Ref: {split.txn_ref} · {new Date(split.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  meta: { fontSize: 13, color: '#888', marginTop: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#ddd', marginVertical: 16 },
  splitRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  splitTitle: { fontSize: 15, fontWeight: '700' },
  splitStatus: { fontSize: 13, color: '#555', marginTop: 2 },
  splitError: { fontSize: 13, color: '#B3261E', marginTop: 2 },
  splitMeta: { fontSize: 12, color: '#999', marginTop: 4 },
});
