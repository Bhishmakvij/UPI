import { MD3LightTheme } from 'react-native-paper';

/**
 * The BHIM/CRED-inspired palette and type scale used throughout the app.
 * Screens that don't use React Native Paper components directly (most of
 * them still use plain `StyleSheet`) should reference these constants
 * rather than inlining hex codes, so the two styling approaches stay
 * visually consistent.
 */
export const colors = {
  primary: '#1F3A93', // Deep Blue
  secondary: '#00D4FF', // Teal / Cyan
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#777777',
  success: '#00C853',
  error: '#FF3B30',
  border: '#E5E5EA',
  chipBackground: '#F0F4FF',
} as const;

export const typography = {
  heading: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  subheading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  secondary: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  card: 18,
  button: 14,
  chip: 20,
} as const;

/** CTA buttons per the design spec: 56px minimum touch height. */
export const CTA_MIN_HEIGHT = 56;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    secondary: colors.secondary,
    onSecondary: colors.text,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    error: colors.error,
    outline: colors.border,
  },
};
