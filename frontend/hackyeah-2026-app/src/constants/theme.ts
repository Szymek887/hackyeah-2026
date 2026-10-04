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
 * Age-based palettes for older users (chosen automatically from the age group, never by hand).
 * Based on research on ageing vision:
 * - the eye lens yellows with age, so blues / greens look faded and light-blue tints disappear,
 *   therefore selected / soft backgrounds are neutral or warm instead of light blue;
 * - dark text on a light background reads better than light on dark, so dark mode is not used;
 * - warm colors (orange, red) stay easy to see, so the main call to action stays orange;
 * - yellow can almost disappear (cataract), so warnings are dark amber, not yellow;
 * - grey "secondary" text is darkened: every text color is ≥ 7:1 on white (WCAG 1.4.6 AAA).
 * Sources: NIA/NLM "Making your website senior friendly", W3C WAI-AGE, Discovery Eye Foundation.
 */

/** 60–74 lat: near-black text, deep royal blue, strong orange, neutral warm tints. */
export const SeniorColors = {
  text: '#111111',
  textSecondary: '#3A3A3A',
  background: '#FFFFFF',
  backgroundElement: '#FFFFFF',
  backgroundMuted: '#F4F1EC',
  backgroundSelected: '#EDEAE4',
  primary: '#0A3D8F',
  primaryStrong: '#072C68',
  primarySoft: '#EDEAE4',
  onPrimary: '#FFFFFF',
  accent: '#B34700',
  accentStrong: '#8A3600',
  accentSoft: '#FFF0E3',
  onAccent: '#FFFFFF',
  border: '#5C5C5C',
  danger: '#A31919',
  dangerSoft: '#FBE0E0',
  warning: '#7A4100',
  warningSoft: '#FBEBCF',
  success: '#1D5C2E',
  successSoft: '#E1EFE3',
} as const;

/** 75+ lat: maximum contrast – pure black text and borders, navy actions, deep orange. */
export const SeniorPlusColors = {
  text: '#000000',
  textSecondary: '#1F1F1F',
  background: '#FFFFFF',
  backgroundElement: '#FFFFFF',
  backgroundMuted: '#F2F2F2',
  backgroundSelected: '#EBEBEB',
  primary: '#00297A',
  primaryStrong: '#001A4D',
  primarySoft: '#EBEBEB',
  onPrimary: '#FFFFFF',
  accent: '#A33A00',
  accentStrong: '#7A2B00',
  accentSoft: '#FFE0C2',
  onAccent: '#FFFFFF',
  border: '#000000',
  danger: '#8B0000',
  dangerSoft: '#FFE0E0',
  warning: '#663300',
  warningSoft: '#FFEBC7',
  success: '#0F4D1F',
  successSoft: '#DDEFE0',
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

/**
 * City heatmap: one blue hue, light -> dark = fewer -> more requests. Used on OpenStreetMap
 * tiles, which stay light in dark mode, so one scale serves both themes. Validated as an
 * ordinal ramp (monotone lightness, lightest step 2:1 against a light surface).
 */
export const HeatmapScaleColors = ['#86B6EF', '#5598E7', '#2A78D6', '#1C5CAB', '#0D366B'] as const;
/** Gap between neighbouring hexagons, in the colour of the light map tiles. */
export const HeatmapCellBorder = '#FFFFFF';

/** 0 = special (medicine), 1 = critical, 3 = low. */
export const PriorityColors = {
  0: { color: '#0E7C86', soft: '#E0F3F4' },
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
