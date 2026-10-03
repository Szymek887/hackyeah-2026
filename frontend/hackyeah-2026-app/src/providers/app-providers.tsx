import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';

import { SessionProvider } from '@/features/auth/session-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AppProviders({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
