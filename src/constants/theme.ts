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

// v4 game palette (sky, cream, navy outline, yellow/green accents), one step calmer than the
// original mockup. Text tokens keep 4.5:1 on cream and white; text placed directly on sky uses ink.
export const GameColors = {
  sky: '#82B1FA',
  skyLight: '#DDE9FF',
  ink: '#1D1B3A',
  inkMuted: '#4A4863',
  inkSoft: '#C9C7DD',
  cream: '#FFF4D6',
  paper: '#FFFFFF',
  yellow: '#FFD23F',
  yellowLight: '#FFF0B8',
  orange: '#F5A623',
  green: '#5EC34A',
  greenLight: '#D4F2C9',
  greenDark: '#24601D',
  pink: '#FF9FBB',
  /** Error and danger text. Readable on sky, cream and white. */
  coral: '#8E1728',
  /** Badge and NEW highlight background (white text). */
  alert: '#D63645',
  alertLight: '#FFE3E6',
  heart: '#EF5262',
  heartEmpty: '#D9DEEF',
  lavender: '#A98BFF',
  track: '#E4E3EE',
  accent: '#3460D6',
  border: '#1D1B3A',
  line: '#E4E3EE',
  night: '#1D1B3A',
  nightDeep: '#2A2850',
} as const;

export const GameUi = {
  borderWidth: 2,
  radius: { card: 20, button: 14, badge: 999 },
  /** Height of the hard navy drop under cards and buttons. */
  depth: 3,
  contentWidth: 440,
  typography: {
    brand: { fontSize: 23, lineHeight: 31, fontWeight: '800' },
    title: { fontSize: 18, lineHeight: 26, fontWeight: '800' },
    body: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
    number: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  },
  /** Inline error message that stays readable on any background. */
  errorText: {
    fontSize: 14, lineHeight: 21, fontWeight: '600',
    color: '#8E1728', backgroundColor: '#FFE3E6',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden',
  },
} as const;
