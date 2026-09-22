import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatRupees } from '../lib/format';
import { canManuallyRetry } from '../lib/orchestrator/retryPolicy';

/**
 * Shown when the app returns to the foreground after opening a UPI app on
 * iOS, where there is no OS-level way to know whether the payment actually
 * succeeded. Offers "Next Payment" (the user confirms success by choosing to
 * proceed), Retry, or "status unclear" — never a bare yes/no.
 */
export function IosConfirmDialog({
  visible,
  amount,
  retryCount,
  onConfirmSuccess,
  onRetry,
  onUnclear,
}: {
  visible: boolean;
  amount: number;
  retryCount: number;
  onConfirmSuccess: () => void;
  onRetry: () => void;
  onUnclear: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Did this payment of {formatRupees(amount)} succeed?</Text>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={onConfirmSuccess}>
            <Text style={styles.primaryText}>Yes — Next Payment</Text>
          </TouchableOpacity>
          {canManuallyRetry(retryCount) ? (
            <TouchableOpacity style={styles.button} onPress={onRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={onUnclear}>
            <Text style={styles.buttonText}>Not sure / Status unclear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 10 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  button: { paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#F0F0F0' },
  buttonText: { fontSize: 15, fontWeight: '500' },
  primary: { backgroundColor: '#1F3A93' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
