import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Chip, SegmentedButtons, TextInput as PaperTextInput } from 'react-native-paper';
import type { TabScreenProps } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { EmptyState } from '../components/EmptyState';
import { formatRupees } from '../lib/format';
import { splitAmount } from '../lib/splitting/splitAmount';
import type { TransactionRow, TransactionStatus } from '../lib/db/types';
import { colors, radii, spacing, typography } from '../theme/theme';

type Props = TabScreenProps<'History'>;

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
] as const;
type DateRangeKey = (typeof DATE_RANGE_OPTIONS)[number]['value'];

const STATUS_OPTIONS: { label: string; value: TransactionStatus | undefined }[] = [
  { label: 'All statuses', value: undefined },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Aborted', value: 'ABORTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
];

function dateFromForRange(range: DateRangeKey): number | undefined {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today': {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return startOfDay.getTime();
    }
    case 'week':
      return now - 7 * DAY_MS;
    case 'month':
      return now - 30 * DAY_MS;
    case 'all':
      return undefined;
  }
}

function statusColor(status: TransactionStatus): string {
  switch (status) {
    case 'COMPLETED':
      return colors.success;
    case 'ABORTED':
      return colors.error;
    case 'IN_PROGRESS':
      return colors.secondary;
  }
}

function splitCountFor(totalAmount: number): number {
  const result = splitAmount(totalAmount);
  return result.ok ? result.splits.length : 1;
}

/** Full transaction history: Today/Week/Month quick filters, a status
 * filter, search, and per-row date/amount/recipient/status/split-count. */
export function HistoryListScreen({ navigation }: Props) {
  const { transactionsRepo } = useRepos();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TransactionStatus | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const reload = useCallback(async () => {
    setTransactions(
      await transactionsRepo.list({
        search: search || undefined,
        status,
        dateFrom: dateFromForRange(dateRange),
      })
    );
  }, [transactionsRepo, search, status, dateRange]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refresh whenever the screen regains focus (e.g. returning from a new payment).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const statusChips = useMemo(() => STATUS_OPTIONS, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      <View style={styles.filters}>
        <SegmentedButtons
          value={dateRange}
          onValueChange={(value) => setDateRange(value as DateRangeKey)}
          buttons={DATE_RANGE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
        />
        <PaperTextInput
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or UPI ID"
          autoCapitalize="none"
          style={styles.searchInput}
          left={<PaperTextInput.Icon icon="magnify" />}
        />
        <View style={styles.statusRow}>
          {statusChips.map((option) => (
            <Chip
              key={option.label}
              selected={option.value === status}
              onPress={() => setStatus(option.value)}
              style={styles.statusChip}
            >
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      {transactions.length === 0 ? (
        <EmptyState message="No transactions yet." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const splitCount = splitCountFor(item.total_amount);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('HistoryDetail', { transactionId: item.id })}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.recipient_name ?? item.recipient_upi}
                  </Text>
                  <Text style={styles.rowAmount}>{formatRupees(item.total_amount)}</Text>
                </View>
                <View style={styles.rowFooter}>
                  <Text style={styles.rowSubtitle}>
                    {new Date(item.created_at).toLocaleDateString()}
                    {splitCount > 1 ? ` · ${splitCount} splits` : ' · 1 payment'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}22` }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { ...typography.heading },
  filters: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  searchInput: { backgroundColor: colors.surface },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statusChip: { backgroundColor: colors.chipBackground },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  rowAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  rowSubtitle: { fontSize: 13, color: colors.textSecondary },
  statusBadge: { borderRadius: radii.chip, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
