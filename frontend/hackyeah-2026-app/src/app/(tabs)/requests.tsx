import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { RequestCard } from '@/features/requests/components/request-card';
import { useNearbyRequests } from '@/features/requests/hooks';
import { DEFAULT_CENTER } from '@/lib/geo';

const QUERY = { ...DEFAULT_CENTER, radiusKm: 5 };

export default function RequestsScreen() {
  const { data, isPending, error } = useNearbyRequests(QUERY);

  return (
    <Screen>
      <ThemedText type="title">Zgłoszenia</ThemedText>
      <ThemedText themeColor="textSecondary">Prośby o pomoc w promieniu 5 km</ThemedText>

      {isPending && <ActivityIndicator />}
      {error && <ThemedText themeColor="danger">{error.message}</ThemedText>}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
