/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, SeniorColors, SeniorPlusColors, type ThemePalette } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Light / dark. Older age groups always get light: dark text on a light background is easier to
 * read with ageing eyes.
 */
export function useSchemeName(): 'light' | 'dark' {
  const scheme = useColorScheme();
  const { settings } = useAccessibility();
  if (settings.palette !== 'standard') return 'light';
  return scheme === 'dark' ? 'dark' : 'light';
}

/** App palette for the current color scheme and age group. */
export function useTheme(): ThemePalette {
  const scheme = useSchemeName();
  const { settings } = useAccessibility();

  if (settings.palette === 'senior') return SeniorColors;
  if (settings.palette === 'seniorPlus') return SeniorPlusColors;
  return Colors[scheme];
}
