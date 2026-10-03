import { Stack } from 'expo-router';

import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="request/[id]" options={{ title: 'Zgłoszenie' }} />
        <Stack.Screen name="route-planner" options={{ title: 'Moja trasa' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Aktywne zadanie' }} />
        <Stack.Screen name="scan" options={{ title: 'Skanuj kod QR', presentation: 'modal' }} />
        <Stack.Screen name="rate/[id]" options={{ title: 'Oceń pomoc' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Panel miasta' }} />
      </Stack>
    </AppProviders>
  );
}
