import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { HistoryFilterBar } from '../components/HistoryFilterBar';
import { EmptyState } from '../components/EmptyState';
import { formatRupees } from '../lib/format';
import type { TransactionRow, TransactionStatus } from '../lib/db/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryList'>;

/** Full transaction history with search and status filtering, per the project plan's Part 7/9. */
export function HistoryListScreen({ navigation }: Props) {
  const { transactionsRepo } = useRepos();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransactionStatus | undefined>(undefined);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const reload = useCallback(async () => {
    setTransactions(await transactionsRepo.list({ search: search || undefined, status }));
  }, [transactionsRepo, search, status]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refresh whenever the screen regains focus (e.g. returning from a new payment).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <SafeAreaView style={styles.container}>
      <HistoryFilterBar search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />
      {transactions.length === 0 ? (
        <EmptyState message="No transactions yet." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('HistoryDetail', { transactionId: item.id })}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{item.recipient_name ?? item.recipient_upi}</Text>
                <Text style={styles.rowAmount}>{formatRupees(item.total_amount)}</Text>
              </View>
              <Text style={styles.rowSubtitle}>
                {new Date(item.created_at).toLocaleDateString()} · {item.status}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowAmount: { fontSize: 16, fontWeight: '700' },
  rowSubtitle: { fontSize: 13, color: '#777', marginTop: 4 },
});
