import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ContactSearchMatch } from '../lib/recipient/recipientTypes';

/** Bold the substring of `name` between `start` and `end`, for search-match highlighting. */
function HighlightedName({ name, start, end }: { name: string; start: number; end: number }) {
  if (start < 0 || end <= start) return <Text style={styles.name}>{name}</Text>;
  return (
    <Text style={styles.name}>
      {name.slice(0, start)}
      <Text style={styles.highlight}>{name.slice(start, end)}</Text>
      {name.slice(end)}
    </Text>
  );
}

/**
 * Renders contact search results (or an ambiguous-match list) with the
 * matched substring bolded, a phone number, and best-known UPI ID per row.
 * Never auto-selects — every row requires an explicit tap, even for a single
 * unambiguous match, so a payment is never sent to the wrong "Raj".
 */
export function ContactMatchList({
  matches,
  onSelect,
  resolveUpiLabel,
}: {
  matches: ContactSearchMatch[];
  onSelect: (match: ContactSearchMatch) => void;
  /** Returns the display label for a match's best-known UPI (learned, or
   * "(converted from phone)", or "no UPI set"), resolved async by the caller. */
  resolveUpiLabel?: (match: ContactSearchMatch) => string | undefined;
}) {
  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.contact.id}
      renderItem={({ item }) => {
        const phone = item.contact.phoneNumbers[0]?.number;
        const upiLabel = resolveUpiLabel?.(item);
        return (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
            <HighlightedName name={item.contact.name} start={item.matchStart} end={item.matchEnd} />
            {phone ? <Text style={styles.detail}>📱 {phone}</Text> : <Text style={styles.detail}>No phone number</Text>}
            {upiLabel ? <Text style={styles.detail}>💳 {upiLabel}</Text> : null}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  name: { fontSize: 16, fontWeight: '600' },
  highlight: { backgroundColor: '#FFF3B0' },
  detail: { fontSize: 13, color: '#666', marginTop: 2 },
});
