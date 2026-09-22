import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';

/**
 * Minimal profile tab: this app has no accounts or backend, so there's no
 * sign-in/settings surface to build yet — just app identity and a reminder
 * that everything here lives only on this device.
 */
export function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="account" size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>UPI Splitter</Text>
      <Text style={styles.subtitle}>All your transaction history is stored only on this device.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 64, paddingHorizontal: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.chipBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { ...typography.heading, marginBottom: 8 },
  subtitle: { ...typography.secondary, textAlign: 'center' },
});
