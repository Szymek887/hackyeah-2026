import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { RequestCard } from '@/features/requests/components/request-card';
import { useNearbyRequests } from '@/features/requests/hooks';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_CENTER } from '@/lib/geo';
import { enterItem } from '@/lib/motion';

const QUERY = { ...DEFAULT_CENTER, radiusKm: 5 };

export default function RequestsScreen() {
  const theme = useTheme();
  const { data, isPending, error, refetch } = useNearbyRequests(QUERY);
  const refresh = useRefresh(refetch);

  return (
    <Screen>
      <ThemedText type="title">Zgłoszenia</ThemedText>
      <ThemedText themeColor="textSecondary">Otwarte prośby o pomoc w promieniu 5 km</ThemedText>

      {isPending && <ActivityIndicator />}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

      <FlatList
        // `/nearby` already returns only OPEN requests, most urgent first.
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh.refreshing}
            onRefresh={refresh.onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterItem(index)}>
            <RequestCard
              request={item}
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
            />
          </Animated.View>
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
