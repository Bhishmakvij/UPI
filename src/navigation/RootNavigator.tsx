import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { RepoProvider } from './RepoProvider';
import { MainTabs } from './MainTabs';
import { RecipientInputScreen } from '../screens/RecipientInputScreen';
import { AmountEntryScreen } from '../screens/AmountEntryScreen';
import { ConfirmSplitsScreen } from '../screens/ConfirmSplitsScreen';
import { PaymentProgressScreen } from '../screens/PaymentProgressScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <RepoProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Main">
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="RecipientInput" component={RecipientInputScreen} options={{ title: 'Enter Recipient' }} />
          <Stack.Screen name="AmountEntry" component={AmountEntryScreen} options={{ title: 'Amount' }} />
          <Stack.Screen name="ConfirmSplits" component={ConfirmSplitsScreen} options={{ title: 'Confirm' }} />
          <Stack.Screen
            name="PaymentProgress"
            component={PaymentProgressScreen}
            options={{ title: 'Paying', gestureEnabled: false, headerBackVisible: false }}
          />
          <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Result', headerBackVisible: false }} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: 'Details' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </RepoProvider>
  );
}
