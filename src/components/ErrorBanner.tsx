import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** A simple, dismissible-by-navigation-away inline error banner used across
 * every input screen for scan/validation/permission failures. */
export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FDECEC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  text: {
    color: '#B3261E',
    fontSize: 14,
  },
});
