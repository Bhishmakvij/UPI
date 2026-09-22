import { Linking } from 'react-native';

/**
 * Opens the OS settings screen for this app, so a user who denied camera or
 * contacts access can grant it without hunting through Settings manually.
 * Used by `PermissionGate` whenever a permission request comes back denied.
 */
export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
