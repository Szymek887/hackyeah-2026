import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const theme = useTheme();

  if (status === 'restoring') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Zgłoszenie' }} />
        <Stack.Screen name="route-planner" options={{ title: 'Moja trasa' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Aktywne zadanie' }} />
        <Stack.Screen
          name="scan"
          options={{
            title: 'Skanuj kod QR',
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="rate/[id]" options={{ title: 'Oceń pomoc' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Panel miasta' }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
