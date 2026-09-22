import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, TextInput as PaperTextInput } from 'react-native-paper';
import type { TabScreenProps } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { RecentRecipientsService } from '../lib/recipient/recentRecipients';
import type { RecentRecipient } from '../lib/recipient/recipientTypes';
import { validateAmount } from '../lib/splitting/validateAmount';
import { colors, radii, spacing, typography, CTA_MIN_HEIGHT } from '../theme/theme';

type Props = TabScreenProps<'Pay'>;

const QUICK_ACCESS = [
  { key: 'contact', label: 'Pay Contact', icon: 'account-search' },
  { key: 'phone', label: 'Phone', icon: 'phone' },
  { key: 'upi', label: 'UPI ID', icon: 'at' },
  { key: 'scan', label: 'Scan QR', icon: 'qrcode-scan' },
] as const;

/**
 * Home / Pay tab: a "Quick Send" amount shortcut, quick-access entry chips
 * for the three unified-input methods plus QR scan, a horizontal recent-
 * recipients carousel, and a primary "Send Money" CTA — all funneling into
 * the same RecipientInputScreen (name/phone/UPI auto-detection), since that
 * one screen already handles every method.
 */
export function HomeScreen({ navigation }: Props) {
  const { recentContactsRepo } = useRepos();
  const recentService = useMemo(() => new RecentRecipientsService(recentContactsRepo), [recentContactsRepo]);
  const [quickAmount, setQuickAmount] = useState('');
  const [recent, setRecent] = useState<RecentRecipient[]>([]);

  useFocusEffect(
    useCallback(() => {
      recentService.list(10).then(setRecent);
    }, [recentService])
  );

  const quickAmountValidation = useMemo(() => validateAmount(quickAmount), [quickAmount]);
  const canQuickSend = quickAmount.length > 0 && quickAmountValidation.valid;

  const goToRecipientInput = useCallback(
    (prefilledAmount?: number) => {
      navigation.navigate('RecipientInput', prefilledAmount !== undefined ? { prefilledAmount } : undefined);
    },
    [navigation]
  );

  const handleQuickAccess = useCallback(
    (key: (typeof QUICK_ACCESS)[number]['key']) => {
      if (key === 'scan') {
        navigation.navigate('Scan');
        return;
      }
      goToRecipientInput();
    },
    [navigation, goToRecipientInput]
  );

  const selectRecent = useCallback(
    (recipient: RecentRecipient) => {
      navigation.navigate('AmountEntry', {
        recipient: {
          method: 'contact_search',
          originalInput: recipient.name ?? recipient.upiId,
          upiId: recipient.upiId,
          name: recipient.name,
          phone: recipient.phone,
          isContact: Boolean(recipient.name),
          prefilledAmount: canQuickSend ? Number(quickAmount) : undefined,
        },
      });
    },
    [navigation, canQuickSend, quickAmount]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>UPI Splitter</Text>
        <Text style={styles.subheader}>Pay anyone, auto-split any amount over ₹2,000.</Text>

        <Card style={styles.quickSendCard} mode="elevated">
          <Card.Content>
            <Text style={styles.sectionLabel}>QUICK SEND</Text>
            <PaperTextInput
              mode="outlined"
              value={quickAmount}
              onChangeText={setQuickAmount}
              placeholder="Enter amount (₹)"
              keyboardType="number-pad"
              style={styles.amountInput}
            />
            {quickAmount.length > 0 && !quickAmountValidation.valid ? (
              <Text style={styles.errorText}>{quickAmountValidation.error}</Text>
            ) : null}
            <Button
              mode="contained"
              style={styles.quickSendButton}
              contentStyle={styles.ctaContent}
              disabled={!canQuickSend}
              onPress={() => goToRecipientInput(Number(quickAmount))}
            >
              Send Money
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.chipsRow}>
          {QUICK_ACCESS.map((item) => (
            <Chip key={item.key} icon={item.icon} style={styles.chip} onPress={() => handleQuickAccess(item.key)}>
              {item.label}
            </Chip>
          ))}
        </View>

        {recent.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RECENT RECIPIENTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recent.map((r) => (
                <Card key={r.upiId} style={styles.recentCard} onPress={() => selectRecent(r)} mode="elevated">
                  <Card.Content>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {r.name ?? r.upiId}
                    </Text>
                    <Text style={styles.recentUpi} numberOfLines={1}>
                      {r.upiId}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Button
          mode="contained"
          style={styles.sendMoneyCta}
          contentStyle={styles.ctaContent}
          onPress={() => goToRecipientInput()}
        >
          Send Money
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { ...typography.heading },
  subheader: { ...typography.secondary, marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  quickSendCard: { borderRadius: radii.card, backgroundColor: colors.surface },
  amountInput: { marginTop: spacing.sm },
  errorText: { color: colors.error, fontSize: 13, marginTop: 4 },
  quickSendButton: { marginTop: spacing.md, borderRadius: radii.button },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.chipBackground },
  recentCard: { width: 160, marginRight: spacing.sm, borderRadius: radii.card },
  recentName: { fontSize: 15, fontWeight: '700', color: colors.text },
  recentUpi: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sendMoneyCta: {
    marginTop: spacing.xl,
    borderRadius: radii.button,
    minHeight: CTA_MIN_HEIGHT,
    justifyContent: 'center',
  },
  ctaContent: { height: CTA_MIN_HEIGHT },
});
