import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { openAppSettings } from '../lib/permissions';

/**
 * Shown in place of a camera/contacts-dependent UI when permission was
 * denied. Never a dead end: always offers Settings plus a manual-entry
 * escape hatch, per the "allow manual entry even without permission" rule.
 */
export function PermissionGate({
  message,
  onManualEntry,
  manualEntryLabel = 'Enter manually instead',
}: {
  message: string;
  onManualEntry: () => void;
  manualEntryLabel?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={() => openAppSettings()}>
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkButton} onPress={onManualEntry}>
        <Text style={styles.linkText}>{manualEntryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', gap: 12 },
  message: { fontSize: 15, textAlign: 'center', color: '#444' },
  button: { backgroundColor: '#1F3A93', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  linkButton: { paddingVertical: 8 },
  linkText: { color: '#1F3A93', fontWeight: '500' },
});
