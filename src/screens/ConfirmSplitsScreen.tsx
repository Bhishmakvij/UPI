import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { splitAmount } from '../lib/splitting/splitAmount';
import { formatRupees } from '../lib/format';
import { colors, radii, spacing, typography, CTA_MIN_HEIGHT } from '../theme/theme';

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payment Summary</Text>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient</Text>
              <Text style={styles.summaryValue}>{recipient.name ?? recipient.upiId}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValueBold}>{formatRupees(amount)}</Text>
            </View>
          </Card.Content>
        </Card>

        {splits.length > 1 ? (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text style={styles.splitsTitle}>Will be split into {splits.length} payments</Text>
              {splits.map((split, i) => (
                <View key={split.index}>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitLabel}>Payment {split.index}</Text>
                    <Text style={styles.splitAmount}>{formatRupees(split.amount)}</Text>
                  </View>
                  {i < splits.length - 1 ? <Divider style={styles.divider} /> : null}
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Text style={styles.singleLine}>
            This is a single payment of {formatRupees(amount)} — no splitting needed.
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button mode="outlined" style={styles.backButton} contentStyle={styles.ctaContent} onPress={() => navigation.popToTop()}>
          Back
        </Button>
        <Button
          mode="contained"
          style={styles.confirmButton}
          contentStyle={styles.ctaContent}
          onPress={() => navigation.navigate('PaymentProgress', { recipient, amount })}
        >
          Confirm & Pay
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md },
  title: { ...typography.heading, marginBottom: spacing.md },
  card: { borderRadius: radii.card, backgroundColor: colors.surface, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { ...typography.secondary },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  summaryValueBold: { fontSize: 18, fontWeight: '800', color: colors.primary },
  splitsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  splitLabel: { fontSize: 15, color: colors.text },
  splitAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
  divider: { backgroundColor: colors.border },
  singleLine: { ...typography.secondary, marginTop: spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  backButton: { flex: 1, borderRadius: radii.button, borderColor: colors.primary },
  confirmButton: { flex: 2, borderRadius: radii.button },
  ctaContent: { height: CTA_MIN_HEIGHT },
});
