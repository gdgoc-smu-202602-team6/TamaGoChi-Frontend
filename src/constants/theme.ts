/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Shared game palette. The existing system theme remains available to other screens.
export const GameColors = {
  sky: '#8099F2',
  skyLight: '#A9C9FF',
  ink: '#24213D',
  inkMuted: '#625C78',
  cream: '#FFF7DA',
  paper: '#FFFFFF',
  yellow: '#F6D85F',
  yellowShade: '#DFA647',
  green: '#87C45B',
  greenDark: '#4D753E',
  coral: '#CC555E',
  heart: '#E9788F',
  heartEmpty: '#6371A5',
  lavender: '#A387E5',
  track: '#E2DCCF',
  grass: '#85BB58',
  soil: '#BA8E59',
} as const;

export const GameUi = {
  borderWidth: 3,
  radius: { card: 24, button: 16, badge: 24 },
  depth: 5,
  contentWidth: 440,
  typography: {
    brand: { fontSize: 29, lineHeight: 38, fontWeight: '900' },
    title: { fontSize: 19, lineHeight: 27, fontWeight: '800' },
    body: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
    number: { fontFamily: Fonts.mono, fontWeight: '800', fontVariant: ['tabular-nums'] },
  },
} as const;
