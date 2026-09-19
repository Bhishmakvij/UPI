import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { TransactionStatus } from '../lib/db/types';

const STATUS_OPTIONS: { label: string; value: TransactionStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Aborted', value: 'ABORTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
];

export function HistoryFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  search: string;
  onSearchChange: (text: string) => void;
  status: TransactionStatus | undefined;
  onStatusChange: (status: TransactionStatus | undefined) => void;
}) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search by name or UPI ID"
        autoCapitalize="none"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {STATUS_OPTIONS.map((option) => {
          const active = option.value === status;
          return (
            <TouchableOpacity
              key={option.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onStatusChange(option.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  search: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  chips: { marginTop: 10 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#EEE', marginRight: 8 },
  chipActive: { backgroundColor: '#1A73E8' },
  chipText: { fontSize: 13, color: '#444', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
});
