import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { HistoryListScreen } from '../screens/HistoryListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_BY_ROUTE: Record<keyof MainTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Pay: 'bank-transfer',
  Scan: 'qrcode-scan',
  History: 'history',
  Profile: 'account-circle-outline',
};

/**
 * The premium bottom nav: Pay / Scan QR / History / Profile. Nested inside
 * the root stack as its `Main` screen — the amount-entry/splitting/payment
 * flow, launched from the Pay tab, still lives in the root stack so it can
 * cover the tab bar and show its own header.
 */
export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={ICON_BY_ROUTE[route.name as keyof MainTabParamList]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Pay" component={HomeScreen} options={{ title: 'Pay' }} />
      {/* The scanner is a full-screen camera view — the tab bar would just
       * obscure it, so it's hidden while this tab is focused. */}
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan QR', tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="History" component={HistoryListScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
