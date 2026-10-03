import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import type { Category, HelpRequestListItem, Priority } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import { useSharedLocation } from '@/features/map/location-store';
import { RequestCard } from '@/features/requests/components/request-card';
import { useNearbyRequests } from '@/features/requests/hooks';
import { CategoryLabels, PriorityLabels, timeAgo } from '@/features/requests/labels';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { distanceMeters } from '@/lib/geo';
import type { RouteCoordinate } from '@/lib/route-matching';
import { enterItem } from '@/lib/motion';

type SortMode = 'nearest' | 'farthest';
type CategoryFilter = 'ALL' | Category;
type PriorityFilter = 'ALL' | Priority;

const CATEGORY_FILTERS: CategoryFilter[] = [
  'ALL',
  'MEDICINE',
  'GROCERIES',
  'HOME_SUPPORT',
  'EQUIPMENT_LOAN',
  'SOCIAL',
];
const PRIORITY_FILTERS: PriorityFilter[] = ['ALL', 1, 2, 3];

function requestDistance(request: HelpRequestListItem, center: RouteCoordinate) {
  const [lng, lat] = request.approximateLocation.coordinates;
  return distanceMeters([center.longitude, center.latitude], [lng, lat]);
}

function formatDistance(meters: number) {
  if (meters < 950) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0).replace('.', ',')} km`;
}

export default function RequestsScreen() {
  const theme = useTheme();
  const sharedLocation = useSharedLocation();
  const query = useMemo(
    () => ({
      lat: sharedLocation.coordinate.latitude,
      lng: sharedLocation.coordinate.longitude,
      radiusKm: 5,
    }),
    [sharedLocation.coordinate.latitude, sharedLocation.coordinate.longitude],
  );
  const { data, isPending, error, refetch } = useNearbyRequests(query);
  const refresh = useRefresh(refetch);
  const [openPanel, setOpenPanel] = useState<'filters' | 'sort' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');

  const visibleRequests = useMemo(() => {
    const filtered = (data ?? []).filter((request) => {
      if (categoryFilter !== 'ALL' && request.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && request.priority !== priorityFilter) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const distanceDiff =
        requestDistance(a, sharedLocation.coordinate) -
        requestDistance(b, sharedLocation.coordinate);
      if (Math.abs(distanceDiff) > 1) {
        return sortMode === 'nearest' ? distanceDiff : -distanceDiff;
      }
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [categoryFilter, data, priorityFilter, sharedLocation.coordinate, sortMode]);

  const activeFilterCount = (categoryFilter === 'ALL' ? 0 : 1) + (priorityFilter === 'ALL' ? 0 : 1);

  return (
    <Screen>
      <ThemedText type="title">Zgłoszenia</ThemedText>
      <ThemedText themeColor="textSecondary">
        Otwarte prośby o pomoc w promieniu 5 km od: {sharedLocation.label} ({visibleRequests.length}
        )
      </ThemedText>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpenPanel(openPanel === 'filters' ? null : 'filters')}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor:
                openPanel === 'filters' ? theme.primarySoft : theme.backgroundElement,
              borderColor:
                openPanel === 'filters' || activeFilterCount > 0 ? theme.primary : theme.border,
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpenPanel(openPanel === 'sort' ? null : 'sort')}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: openPanel === 'sort' ? theme.primarySoft : theme.backgroundElement,
              borderColor: openPanel === 'sort' ? theme.primary : theme.border,
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Sortuj: {sortMode === 'nearest' ? 'najbliżej' : 'najdalej'}
          </ThemedText>
        </Pressable>
      </View>

      {openPanel === 'filters' && (
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View style={styles.panelHeader}>
            <ThemedText type="smallBold">Filtry zgłoszeń</ThemedText>
            <Pressable
              onPress={() => {
                setCategoryFilter('ALL');
                setPriorityFilter('ALL');
              }}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Wyczyść
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            Kategoria
          </ThemedText>
          <View style={styles.chipRow}>
            {CATEGORY_FILTERS.map((category) => {
              const selected = categoryFilter === category;
              const label = category === 'ALL' ? 'Wszystkie' : CategoryLabels[category];
              return (
                <FilterChip
                  key={category}
                  label={label}
                  selected={selected}
                  color={category === 'ALL' ? theme.primary : CategoryColors[category].color}
                  backgroundColor={
                    category === 'ALL' ? theme.primarySoft : CategoryColors[category].soft
                  }
                  onPress={() => setCategoryFilter(category)}
                />
              );
            })}
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            Pilność
          </ThemedText>
          <View style={styles.chipRow}>
            {PRIORITY_FILTERS.map((priority) => {
              const selected = priorityFilter === priority;
              const label = priority === 'ALL' ? 'Każda' : PriorityLabels[priority];
              return (
                <FilterChip
                  key={priority}
                  label={label}
                  selected={selected}
                  color={priority === 'ALL' ? theme.primary : PriorityColors[priority].color}
                  backgroundColor={
                    priority === 'ALL' ? theme.primarySoft : PriorityColors[priority].soft
                  }
                  onPress={() => setPriorityFilter(priority)}
                />
              );
            })}
          </View>
        </View>
      )}

      {openPanel === 'sort' && (
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="smallBold">Sortowanie</ThemedText>
          <View style={styles.chipRow}>
            <FilterChip
              label="Najbliżej mnie"
              selected={sortMode === 'nearest'}
              color={theme.primary}
              backgroundColor={theme.primarySoft}
              onPress={() => setSortMode('nearest')}
            />
            <FilterChip
              label="Najdalej ode mnie"
              selected={sortMode === 'farthest'}
              color={theme.primary}
              backgroundColor={theme.primarySoft}
              onPress={() => setSortMode('farthest')}
            />
          </View>
        </View>
      )}

      {isPending && <ActivityIndicator />}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

      <FlatList
        data={visibleRequests}
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
              meta={`${formatDistance(requestDistance(item, sharedLocation.coordinate))} · ${timeAgo(
                item.createdAt,
              )}`}
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
            />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function FilterChip({
  label,
  selected,
  color,
  backgroundColor,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? backgroundColor : theme.backgroundElement,
          borderColor: selected ? color : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="caption"
        style={{ color: selected ? color : theme.textSecondary, fontWeight: '700' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  panel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
