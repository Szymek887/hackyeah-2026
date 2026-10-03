import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { PriorityColors, Spacing } from '@/constants/theme';
import { useNearbyRequests } from '@/features/requests/hooks';
import { DEFAULT_CENTER } from '@/lib/geo';

const QUERY = { ...DEFAULT_CENTER, radiusKm: 5 };

export default function RequestsScreen() {
  const { data, isPending, error } = useNearbyRequests(QUERY);

  return (
    <ScreenPlaceholder title="Zgłoszenia" owner="FE1" tasks={['F2.4 karty zgłoszeń']}>
      {isPending && <ActivityIndicator />}
      {error && <ThemedText themeColor="danger">{error.message}</ThemedText>}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/request/[id]', params: { id: item.id } }} asChild>
            <Pressable>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedView
                  style={[styles.priority, { backgroundColor: PriorityColors[item.priority] }]}
                />
                <ThemedText type="smallBold" style={styles.title}>
                  {item.title}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}
      />
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  priority: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.one,
  },
  title: {
    flex: 1,
  },
});
