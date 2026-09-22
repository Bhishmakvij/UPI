import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { validateAmount } from '../lib/splitting/validateAmount';
import { ErrorBanner } from '../components/ErrorBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'AmountEntry'>;

/**
 * Shows the resolved recipient (read-only — never editable post-resolution,
 * to prevent a misdirected payment) and the amount field. An amount
 * pre-filled from a QR's `am` is still fully editable and still subject to
 * the >₹2000 splitting rule on the next screen regardless of its source.
 */
export function AmountEntryScreen({ route, navigation }: Props) {
  const { recipient } = route.params;
  const [amountText, setAmountText] = useState(
    recipient.prefilledAmount !== undefined ? String(recipient.prefilledAmount) : ''
  );

  const validation = useMemo(() => validateAmount(amountText), [amountText]);
  const canContinue = amountText.length > 0 && validation.valid;

  const handleContinue = () => {
    if (!validation.valid) return;
    if (recipient.currency && recipient.currency !== 'INR') {
      Alert.alert(
        `This QR requests payment in ${recipient.currency}`,
        'This app only supports INR amounts.',
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate('ConfirmSplits', { recipient, amount: Number(amountText) });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Paying</Text>
      <View style={styles.recipientCard}>
        <Text style={styles.recipientName}>{recipient.name ?? recipient.upiId}</Text>
        <Text style={styles.recipientUpi}>{recipient.upiId}</Text>
      </View>

      <Text style={styles.label}>Amount (₹)</Text>
      <TextInput
        style={styles.input}
        value={amountText}
        onChangeText={setAmountText}
        placeholder="Enter amount"
        keyboardType="number-pad"
        autoFocus
      />
      {amountText.length > 0 ? <ErrorBanner message={validation.valid ? '' : validation.error ?? ''} /> : null}

      <TouchableOpacity
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        disabled={!canContinue}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#888', marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  recipientCard: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14 },
  recipientName: { fontSize: 17, fontWeight: '700' },
  recipientUpi: { fontSize: 14, color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20 },
  button: { marginTop: 24, backgroundColor: '#1F3A93', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#B7C8EA' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
