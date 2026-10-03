import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import type { ThemePalette } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { SessionProvider } from '@/features/auth/session-context';
import { NotificationsProvider } from '@/features/notifications/notifications-context';
import { useSchemeName, useTheme } from '@/hooks/use-theme';

/** Stack headers and navigation chrome use the app palette (incl. the high-contrast variant). */
function navigationTheme(scheme: 'light' | 'dark', colors: ThemePalette): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.backgroundElement,
      text: colors.text,
      border: colors.border,
    },
  };
}

export function AppProviders({ children }: PropsWithChildren) {
  const scheme = useSchemeName();
  const theme = useTheme();
  const { settings } = useAccessibility();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* "Bez animacji" setting wins; otherwise follow the OS reduce-motion switch. */}
      <ReducedMotionConfig
        mode={settings.reduceMotion ? ReduceMotion.Always : ReduceMotion.System}
      />
      <SessionProvider>
        <ThemeProvider value={navigationTheme(scheme, theme)}>
          <NotificationsProvider>{children}</NotificationsProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
