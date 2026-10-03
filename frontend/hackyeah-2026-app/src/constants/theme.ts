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
    /** "Poproś o pomoc" – the one warm call to action, stands out from the blue UI. */
    accent: '#D9480F',
    accentStrong: '#B83C0B',
    accentSoft: '#FFF0E6',
    onAccent: '#FFFFFF',
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
    accent: '#FF8A4C',
    accentStrong: '#FFA673',
    accentSoft: '#3A2216',
    onAccent: '#0B1522',
    border: '#22344A',
    danger: '#F07272',
    dangerSoft: '#3A1D22',
    warning: '#F2B544',
    warningSoft: '#3A2C12',
    success: '#5CC98A',
    successSoft: '#163325',
  },
} as const;

/**
 * High-contrast variant (accessibility setting, default for seniors): near-black text, darker
 * secondary text, strong borders and deeper brand colors. Text colors meet WCAG AAA (≥ 7:1)
 * on the backgrounds.
 */
export const HighContrastColors = {
  light: {
    text: '#000000',
    textSecondary: '#28323F',
    background: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundMuted: '#EEF2F7',
    backgroundSelected: '#D2E4FA',
    primary: '#0A4A92',
    primaryStrong: '#06366D',
    primarySoft: '#D2E4FA',
    onPrimary: '#FFFFFF',
    // Still clearly orange; white text on it is 5.4:1 (AA, AAA for large text).
    accent: '#B83C0B',
    accentStrong: '#8F2E07',
    accentSoft: '#FFE3D2',
    onAccent: '#FFFFFF',
    border: '#3A4757',
    danger: '#961A1A',
    dangerSoft: '#FBDEDE',
    warning: '#6E3E00',
    warningSoft: '#FFE9BD',
    success: '#165231',
    successSoft: '#D5EFDF',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#D6E1EE',
    background: '#000000',
    backgroundElement: '#0C141E',
    backgroundMuted: '#111D2A',
    backgroundSelected: '#1C3A5E',
    primary: '#93CCFF',
    primaryStrong: '#BCE0FF',
    primarySoft: '#1C3A5E',
    onPrimary: '#000000',
    accent: '#FFB48F',
    accentStrong: '#FFCCB2',
    accentSoft: '#3D2414',
    onAccent: '#000000',
    border: '#93A8C0',
    danger: '#FFA3A3',
    dangerSoft: '#3D1A1E',
    warning: '#FFD27F',
    warningSoft: '#3A2C12',
    success: '#8EE6B4',
    successSoft: '#143324',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = Record<ThemeColor, string>;

/** Category accent colors (pins, badges), keys = backend `HelpCategory`. `soft` is a badge background. */
export const CategoryColors = {
  MEDICINE: { color: '#D9534F', soft: '#FCECEB' },
  GROCERIES: { color: '#2E8B57', soft: '#E7F5EC' },
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

export const MaxContentWidth = 720;
/** Height of the web top navigation bar. */
export const WebNavHeight = 64;

/** Shared animation timings (ms). Keep motion short and calm. */
export const Motion = {
  fast: 150,
  base: 250,
  stagger: 40,
} as const;
