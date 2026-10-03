/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, HighContrastColors, type ThemePalette } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Light / dark, without the accessibility contrast setting (e.g. navigation chrome base). */
export function useSchemeName(): 'light' | 'dark' {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/** App palette for the current color scheme and contrast setting. */
export function useTheme(): ThemePalette {
  const scheme = useSchemeName();
  const { settings } = useAccessibility();

  return (settings.highContrast ? HighContrastColors : Colors)[scheme];
}
