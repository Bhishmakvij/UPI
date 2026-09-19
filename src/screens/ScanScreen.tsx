import React, { useCallback, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { parseUpiUri } from '../lib/upi/parseUpiUri';
import { QR_ERRORS } from '../lib/errorMessages';
import { ErrorBanner } from '../components/ErrorBanner';
import { PermissionGate } from '../components/PermissionGate';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

/** After this many seconds without a successful scan, nudge the user toward manual entry. */
const SCAN_TIMEOUT_MS = 30_000;

/**
 * QR scanning — the fast path. Scans continuously, tolerates bad/non-UPI QR
 * codes without ever exiting the camera view, and always keeps a manual-entry
 * escape hatch visible per the "Can't scan? Enter manually instead" rule.
 */
export function ScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [showTimeoutHint, setShowTimeoutHint] = useState(false);
  const scanLockedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTimeoutHint(false);
    timeoutRef.current = setTimeout(() => setShowTimeoutHint(true), SCAN_TIMEOUT_MS);
  }, []);

  React.useEffect(() => {
    armTimeout();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [armTimeout]);

  const goToManualEntry = useCallback(() => {
    navigation.replace('RecipientInput');
  }, [navigation]);

  const handleScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanLockedRef.current) return; // debounce: ignore rapid-fire re-scans of the same frame
      scanLockedRef.current = true;
      setTimeout(() => {
        scanLockedRef.current = false;
      }, 1000);

      const result = parseUpiUri(data);
      if (!result.ok) {
        setError(result.error === 'NOT_UPI_URI' ? QR_ERRORS.notUpiQr : QR_ERRORS.aimAtValidQr);
        return;
      }

      setError(null);
      const proceed = () => {
        navigation.navigate('AmountEntry', {
          recipient: {
            method: 'qr_scan',
            originalInput: result.data.raw,
            upiId: result.data.pa,
            name: result.data.pn,
            isContact: false,
            prefilledAmount: result.data.am,
            qrNote: result.data.tn,
            currency: result.data.cu,
          },
        });
      };

      if (result.data.cu !== 'INR') {
        Alert.alert(
          `This QR requests payment in ${result.data.cu}`,
          'This app only supports INR. Continue anyway at your own risk?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: proceed },
          ]
        );
        return;
      }
      proceed();
    },
    [navigation]
  );

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <PermissionGate
          message={
            permission.canAskAgain
              ? 'UPI Splitter needs camera access to scan UPI QR codes.'
              : QR_ERRORS.cameraPermissionNeeded
          }
          onManualEntry={goToManualEntry}
        />
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.grantButton} onPress={() => requestPermission()}>
            <Text style={styles.grantButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScanned}
      />
      <SafeAreaView style={styles.overlay}>
        <ErrorBanner message={error ?? ''} />
        {showTimeoutHint ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Having trouble scanning?</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.manualButton} onPress={goToManualEntry}>
          <Text style={styles.manualButtonText}>{QR_ERRORS.scanTimeoutPrompt}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  hint: { alignItems: 'center', marginBottom: 8 },
  hintText: { color: '#fff', fontSize: 14 },
  manualButton: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  manualButtonText: { fontSize: 16, fontWeight: '600', color: '#1A3A8F' },
  grantButton: { backgroundColor: '#1A73E8', margin: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  grantButtonText: { color: '#fff', fontWeight: '700' },
});
