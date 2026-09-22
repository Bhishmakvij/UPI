import React, { useEffect, useRef } from 'react';
import { Alert, BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useRepos } from '../navigation/RepoProvider';
import { usePaymentOrchestrator } from '../lib/orchestrator/usePaymentOrchestrator';
import { splitAmount } from '../lib/splitting/splitAmount';
import { canManuallyRetry } from '../lib/orchestrator/retryPolicy';
import { PAYMENT_ERRORS } from '../lib/errorMessages';
import { ProgressHeader } from '../components/ProgressHeader';
import { SplitList } from '../components/SplitList';
import { IosConfirmDialog } from '../components/IosConfirmDialog';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentProgress'>;

const RECOVERABLE_STATUSES = ['FAILED', 'CANCELLED', 'SUBMITTED'];

function openUpiAppStore() {
  const url =
    Platform.OS === 'android'
      ? 'market://search?q=upi%20payment&c=apps'
      : 'https://apps.apple.com/search?term=upi%20payment';
  Linking.openURL(url).catch(() => {});
}

/**
 * Drives one payment run to completion: launches each split, shows live
 * progress, and surfaces the platform-appropriate recovery UI (Android:
 * inline retry/skip/abort on a non-success result; iOS: the foreground-return
 * confirmation dialog) without ever silently losing track of a split.
 */
export function PaymentProgressScreen({ route, navigation }: Props) {
  const { recipient, amount } = route.params;
  const { transactionsRepo, splitsRepo } = useRepos();
  const orchestrator = usePaymentOrchestrator({ transactionsRepo, splitsRepo });
  const startedRef = useRef(false);

  // Starts the run exactly once, on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const result = splitAmount(amount);
    if (!result.ok) return; // AmountEntry already validated; defensive only
    orchestrator.start({
      recipientUpi: recipient.upiId,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientMethod: recipient.method,
      originalInput: recipient.originalInput,
      isContact: recipient.isContact,
      contactId: recipient.contactId,
      splits: result.splits,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-launches whenever a fresh PENDING split becomes current — this is
  // what drives both the very first split and every subsequent auto-advance.
  useEffect(() => {
    if (orchestrator.state.runStatus === 'IN_PROGRESS' && orchestrator.currentSplit?.status === 'PENDING') {
      orchestrator.launchCurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrator.state.runStatus, orchestrator.currentSplit?.status, orchestrator.currentSplit?.index]);

  // Once the run finishes, hand off to the Result screen.
  useEffect(() => {
    if (orchestrator.state.runStatus === 'COMPLETED' || orchestrator.state.runStatus === 'ABORTED') {
      navigation.replace('Result', { transactionId: orchestrator.state.runId });
    }
  }, [orchestrator.state.runStatus, orchestrator.state.runId, navigation]);

  // Intercept the Android hardware back button (and, via `gestureEnabled` set
  // on the navigator, the iOS swipe-back) so a mid-run exit is always an
  // explicit choice, never an accidental abandonment of an in-flight payment.
  useEffect(() => {
    const handler = () => {
      if (orchestrator.state.runStatus !== 'IN_PROGRESS') return false;
      Alert.alert('Abort remaining payments?', 'Payments already completed will not be reversed.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Abort', style: 'destructive', onPress: () => orchestrator.abortRun() },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [orchestrator]);

  const currentSplit = orchestrator.currentSplit;
  const isNoUpiApp = currentSplit?.errorMessage === PAYMENT_ERRORS.noUpiApp;

  return (
    <SafeAreaView style={styles.container}>
      {currentSplit ? (
        <ProgressHeader
          index={currentSplit.index}
          total={orchestrator.state.splits.length}
          amount={currentSplit.amount}
        />
      ) : null}

      <SplitList splits={orchestrator.state.splits} />

      {currentSplit && ['LAUNCHING', 'AWAITING_ANDROID_RESULT'].includes(currentSplit.status) ? (
        <Text style={styles.waiting}>Waiting for the UPI app…</Text>
      ) : null}

      {currentSplit && currentSplit.status === 'AWAITING_IOS_RETURN' ? (
        <Text style={styles.waiting}>Complete the payment, then return to this app.</Text>
      ) : null}

      {currentSplit && RECOVERABLE_STATUSES.includes(currentSplit.status) ? (
        <View style={styles.recoveryBox}>
          <Text style={styles.errorText}>{currentSplit.errorMessage ?? PAYMENT_ERRORS.failedGeneric}</Text>
          <View style={styles.recoveryActions}>
            {isNoUpiApp ? (
              <TouchableOpacity style={styles.actionButton} onPress={openUpiAppStore}>
                <Text style={styles.actionButtonText}>Install a UPI App</Text>
              </TouchableOpacity>
            ) : canManuallyRetry(currentSplit.retryCount) ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => orchestrator.retryCurrent()}>
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => orchestrator.skipCurrent()}>
              <Text style={styles.actionButtonSecondaryText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => orchestrator.abortRun()}>
              <Text style={styles.actionButtonSecondaryText}>Abort</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {currentSplit ? (
        <IosConfirmDialog
          visible={orchestrator.showIosConfirmDialog}
          amount={currentSplit.amount}
          retryCount={currentSplit.retryCount}
          onConfirmSuccess={orchestrator.confirmIosSuccess}
          onRetry={() => orchestrator.retryCurrent()}
          onUnclear={orchestrator.confirmIosUnclear}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  waiting: { marginTop: 16, fontSize: 15, color: '#555', textAlign: 'center' },
  recoveryBox: { marginTop: 20, backgroundColor: '#FDECEC', borderRadius: 10, padding: 14 },
  errorText: { color: '#FF3B30', fontSize: 15, marginBottom: 10 },
  recoveryActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionButton: { backgroundColor: '#1F3A93', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  actionButtonSecondary: { backgroundColor: '#EEE', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  actionButtonSecondaryText: { color: '#444', fontWeight: '600' },
});
