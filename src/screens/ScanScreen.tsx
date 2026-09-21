import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { TabScreenProps } from '../navigation/types';
import { parseUpiUri } from '../lib/upi/parseUpiUri';
import { createExpoQrImageSource } from '../lib/qr/qrImageSource';
import { resolveUpiFromDecodedStrings } from '../lib/qr/resolveUpiFromDecodedStrings';
import type { ParsedUpiQr } from '../lib/upi/upiTypes';
import { QR_ERRORS } from '../lib/errorMessages';
import { ErrorBanner } from '../components/ErrorBanner';
import { PermissionGate } from '../components/PermissionGate';

type Props = TabScreenProps<'Scan'>;

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

  const qrImageSource = useMemo(() => createExpoQrImageSource(), []);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ uri: string; parsed: ParsedUpiQr } | null>(null);

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

  // Shared by both the live camera scanner and the image-upload path below,
  // so a QR decoded from a gallery photo goes through the exact same
  // non-INR confirmation and AmountEntry hand-off as a live scan.
  const goToAmountEntry = useCallback(
    (parsed: ParsedUpiQr) => {
      const proceed = () => {
        navigation.navigate('AmountEntry', {
          recipient: {
            method: 'qr_scan',
            originalInput: parsed.raw,
            upiId: parsed.pa,
            name: parsed.pn,
            isContact: false,
            prefilledAmount: parsed.am,
            qrNote: parsed.tn,
            currency: parsed.cu,
          },
        });
      };

      if (parsed.cu !== 'INR') {
        Alert.alert(
          `This QR requests payment in ${parsed.cu}`,
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
      goToAmountEntry(result.data);
    },
    [goToAmountEntry]
  );

  const handlePickImage = useCallback(
    async (source: 'library' | 'camera') => {
      setImageError(null);
      setImagePreview(null);
      setImageLoading(true);
      try {
        const pick = source === 'library' ? await qrImageSource.pickFromLibrary() : await qrImageSource.pickFromCamera();
        if (pick.status === 'cancelled') return;
        if (pick.status === 'permission_denied') {
          setImageError(QR_ERRORS.galleryPermissionNeeded);
          return;
        }
        const decoded = await qrImageSource.scanUrl(pick.uri);
        const outcome = resolveUpiFromDecodedStrings(decoded);
        if (outcome.status === 'no_qr_found') {
          setImageError(QR_ERRORS.noQrInImage);
          return;
        }
        if (outcome.status === 'not_upi') {
          setImageError(QR_ERRORS.notUpiQr);
          return;
        }
        setImagePreview({ uri: pick.uri, parsed: outcome.data });
      } catch {
        setImageError(QR_ERRORS.imageLoadFailed);
      } finally {
        setImageLoading(false);
      }
    },
    [qrImageSource]
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
        {imagePreview ? (
          <View style={styles.imagePreviewCard}>
            <Image source={{ uri: imagePreview.uri }} style={styles.previewImage} />
            <Text style={styles.previewTitle}>✓ QR code found</Text>
            <Text style={styles.previewDetail}>
              Pay to: {imagePreview.parsed.pn ?? imagePreview.parsed.pa}
            </Text>
            {imagePreview.parsed.pn ? (
              <Text style={styles.previewDetailSecondary}>{imagePreview.parsed.pa}</Text>
            ) : null}
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setImagePreview(null)}>
                <Text style={styles.secondaryButtonText}>Choose Different Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => goToAmountEntry(imagePreview.parsed)}
              >
                <Text style={styles.primaryButtonText}>Confirm & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <ErrorBanner message={error ?? ''} />
            {showTimeoutHint ? (
              <View style={styles.hint}>
                <Text style={styles.hintText}>Having trouble scanning?</Text>
              </View>
            ) : null}
            <ErrorBanner message={imageError ?? ''} />
            <View style={styles.imageButtonsRow}>
              <TouchableOpacity
                style={styles.imageButton}
                disabled={imageLoading}
                onPress={() => handlePickImage('library')}
              >
                {imageLoading ? (
                  <ActivityIndicator color="#1A3A8F" />
                ) : (
                  <Text style={styles.imageButtonText}>🖼️ Upload QR Image</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                disabled={imageLoading}
                onPress={() => handlePickImage('camera')}
              >
                <Text style={styles.imageButtonText}>📷 Photograph QR</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.manualButton} onPress={goToManualEntry}>
              <Text style={styles.manualButtonText}>{QR_ERRORS.scanTimeoutPrompt}</Text>
            </TouchableOpacity>
          </>
        )}
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
  imageButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  imageButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  imageButtonText: { fontSize: 14, fontWeight: '600', color: '#1A3A8F' },
  imagePreviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 12, backgroundColor: '#eee' },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, color: '#00C853' },
  previewDetail: { fontSize: 15, fontWeight: '600', color: '#333' },
  previewDetailSecondary: { fontSize: 13, color: '#777', marginTop: 2 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#EEE' },
  secondaryButtonText: { fontWeight: '700', color: '#444' },
  primaryButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#1A73E8' },
  primaryButtonText: { fontWeight: '700', color: '#fff' },
});
