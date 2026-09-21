import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RecentRecipient } from '../lib/recipient/recipientTypes';

/** Quick-select list of the last people paid, most recently used first, so a
 * repeat payment never requires retyping. */
export function RecentRecipients({
  recipients,
  onSelect,
  onClear,
}: {
  recipients: RecentRecipient[];
  onSelect: (recipient: RecentRecipient) => void;
  onClear: () => void;
}) {
  if (recipients.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent</Text>
        <TouchableOpacity onPress={onClear}>
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={recipients}
        keyExtractor={(item) => item.upiId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
            <Text style={styles.rowText}>
              {item.name ?? item.phone ?? item.upiId}
              {item.name || item.phone ? ` (${item.phone ?? item.upiId})` : ''}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  clear: { fontSize: 13, color: '#1F3A93' },
  row: { paddingVertical: 8 },
  rowText: { fontSize: 15 },
});
