import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** Entry point: Scan QR Code / Enter Recipient (the unified name-phone-UPI
 * input) / Transaction History. */
export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>UPI Splitter</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.buttonText}>📱 Scan QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('RecipientInput')}>
          <Text style={styles.buttonText}>📝 Enter Recipient</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('HistoryList')}>
          <Text style={styles.buttonText}>📊 Transaction History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 40 },
  buttons: { gap: 14 },
  button: { backgroundColor: '#F0F4FF', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#1A3A8F' },
});
