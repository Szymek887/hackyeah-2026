/**
 * PoDrodze design tokens. Style: clean & casual – white background, light blue accents,
 * thin borders instead of shadows, no blur / gradients.
 * Use these tokens instead of hard-coded values.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Main text, navy instead of pure black. */
    text: '#12263F',
    textSecondary: '#5A6B80',
    /** Screen background: white. */
    background: '#FFFFFF',
    /** Cards, inputs, nav bars. */
    backgroundElement: '#FFFFFF',
    /** Subtle light blue section background / hover. */
    backgroundMuted: '#F3F8FE',
    /** Selected / highlighted element, light blue. */
    backgroundSelected: '#E3F0FD',
    primary: '#1C7ED6',
    /** Pressed / hovered primary. */
    primaryStrong: '#1667B3',
    primarySoft: '#E3F0FD',
    onPrimary: '#FFFFFF',
    border: '#D5E5F6',
    danger: '#C93B3B',
    dangerSoft: '#FCEBEB',
    warning: '#B86E00',
    warningSoft: '#FFF3DD',
    success: '#2E8B57',
    successSoft: '#E7F5EC',
  },
  dark: {
    text: '#EAF2FB',
    textSecondary: '#9DB0C6',
    background: '#0B1522',
    backgroundElement: '#132132',
    backgroundMuted: '#102031',
    backgroundSelected: '#173353',
    primary: '#5AA9F5',
    primaryStrong: '#80BEF8',
    primarySoft: '#173353',
    onPrimary: '#0B1522',
    border: '#22344A',
    danger: '#F07272',
    dangerSoft: '#3A1D22',
    warning: '#F2B544',
    warningSoft: '#3A2C12',
    success: '#5CC98A',
    successSoft: '#163325',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Category accent colors (pins, badges). `soft` is a background tint for badges. */
export const CategoryColors = {
  BASIC_NEEDS: { color: '#D9534F', soft: '#FCECEB' },
  EQUIPMENT_LOAN: { color: '#D9822B', soft: '#FDF1E4' },
  HOME_SUPPORT: { color: '#1A73D1', soft: '#E6F1FD' },
  SOCIAL: { color: '#7B5CC4', soft: '#F0EBFA' },
} as const;

/** 1 = critical, 3 = low. */
export const PriorityColors = {
  1: { color: '#C93B3B', soft: '#FCEBEB' },
  2: { color: '#B86E00', soft: '#FFF3DD' },
  3: { color: '#2E8B57', soft: '#E7F5EC' },
} as const;

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

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
/** Height of the web top navigation bar. */
export const WebNavHeight = 64;

/** Shared animation timings (ms). Keep motion short and calm. */
export const Motion = {
  fast: 150,
  base: 250,
  stagger: 40,
} as const;
