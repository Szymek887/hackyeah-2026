import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import type { Category, HelpRequestListItem, Priority } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { formatRouteDistance, ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { LeafletMap } from '@/features/map/leaflet-map';
import { useNearbyRequests } from '@/features/requests/hooks';
import { CategoryLabels, PriorityLabels, timeAgo } from '@/features/requests/labels';
import { distanceMeters } from '@/lib/geo';
import { filterRequestsAlongRoute, type RouteCoordinate } from '@/lib/route-matching';
import { PlaceSearchModal } from '@/features/commute/components/place-search-modal';
import { LocationPermissionModal } from '@/features/map/location-permission-modal';
import { setSharedLocation, useSharedLocation } from '@/features/map/location-store';
import { useTheme } from '@/hooks/use-theme';

type ScopeFilter = 'nearest' | 'route' | 'urgent';
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

function sortByNearest(requests: HelpRequestListItem[], center: RouteCoordinate) {
  return [...requests].sort((a, b) => {
    const distanceDiff = requestDistance(a, center) - requestDistance(b, center);
    if (Math.abs(distanceDiff) > 1) return distanceDiff;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function MapScreen() {
  const theme = useTheme();
  const { savedRoute, toggleRouteActive } = useSavedCommuteRoute();
  const sharedLocation = useSharedLocation();
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('nearest');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(true);
  const [locationLabel, setLocationLabel] = useState(sharedLocation.label);
  const [radiusKm, setRadiusKm] = useState<number>(2.5);
  const [mapCenter, setMapCenter] = useState<RouteCoordinate>(sharedLocation.coordinate);

  const { data: allRequests = [], error } = useNearbyRequests({
    lat: mapCenter.latitude,
    lng: mapCenter.longitude,
    radiusKm,
  });

  const handleLocationGranted = (coords: RouteCoordinate) => {
    setIsPermissionModalOpen(false);
    setMapCenter(coords);
    setLocationLabel('Moja lokalizacja (GPS)');
    setSharedLocation({ label: 'Moja lokalizacja (GPS)', coordinate: coords });
  };

  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const matchingRequests = useMemo(
    () =>
      activeRoute
        ? filterRequestsAlongRoute(allRequests, activeRoute.coordinates, ROUTE_BUFFER_METERS)
        : [],
    [activeRoute, allRequests],
  );

  const urgentRequests = useMemo(
    () => allRequests.filter((request) => request.priority === 1),
    [allRequests],
  );

  const baseRequests = useMemo(() => {
    if (scopeFilter === 'route' && activeRoute) return matchingRequests;
    if (scopeFilter === 'urgent') return urgentRequests;
    return allRequests;
  }, [activeRoute, allRequests, matchingRequests, scopeFilter, urgentRequests]);

  const displayedRequests = useMemo(() => {
    const filtered = baseRequests.filter((request) => {
      if (categoryFilter !== 'ALL' && request.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && request.priority !== priorityFilter) return false;
      return true;
    });
    return sortByNearest(filtered, mapCenter);
  }, [baseRequests, categoryFilter, mapCenter, priorityFilter]);

  const handleSelectLocation = (name: string, coordinate: RouteCoordinate) => {
    setLocationLabel(name);
    setMapCenter(coordinate);
    setSharedLocation({ label: name, coordinate });
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" accessibilityRole="header">
            Mapa zgłoszeń w Twojej okolicy
          </ThemedText>
          <View style={styles.headerRightActions}>
            <View style={styles.radiusChips}>
              {[1.5, 2.5, 5.0].map((r) => {
                const isSelected = radiusKm === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRadiusKm(r)}
                    style={({ pressed }) => [
                      styles.radiusChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.background,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="caption"
                      style={{
                        color: isSelected ? theme.onPrimary : theme.text,
                        fontWeight: '700',
                      }}>
                      {r} km
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setIsSearchModalOpen(true)}
              style={({ pressed }) => [
                styles.locationBtn,
                { backgroundColor: theme.primarySoft, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {locationLabel} (Zmień)
              </ThemedText>
            </Pressable>
          </View>
        </View>
        <ThemedText themeColor="textSecondary">
          W promieniu {radiusKm} km znaleziono {displayedRequests.length}{' '}
          {displayedRequests.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}. Lista jest domyślnie ułożona
          od najbliższych zgłoszeń względem wybranej lokalizacji.
        </ThemedText>
      </View>

      <View style={styles.toolbar}>
        {activeRoute ? (
          <>
            <ThemedText type="smallBold" style={styles.routeLabel}>
              Trasa dojazdowa
              {activeRoute.distanceMeters > 0
                ? ` · ${formatRouteDistance(activeRoute.distanceMeters)}`
                : ''}
            </ThemedText>
            <View style={styles.filter}>
              <SegmentedControl
                value={scopeFilter}
                onChange={setScopeFilter}
                options={[
                  { value: 'nearest', label: 'Najbliżej mnie', count: allRequests.length },
                  { value: 'route', label: 'Przy trasie', count: matchingRequests.length },
                  { value: 'urgent', label: 'Pilne', count: urgentRequests.length },
                ]}
              />
            </View>
            <Button
              title="Zmień trasę"
              variant="secondary"
              inline
              onPress={() => router.push('/route-planner')}
            />
            <Button
              title="Ukryj trasę"
              variant="ghost"
              inline
              onPress={() => {
                setScopeFilter('nearest');
                toggleRouteActive(false);
              }}
            />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              Możesz też opcjonalnie zaplanować trasę, aby pomagać po drodze do pracy lub uczelni.
            </ThemedText>
            <View style={styles.filter}>
              <SegmentedControl
                value={scopeFilter}
                onChange={setScopeFilter}
                options={[
                  { value: 'nearest', label: 'Najbliżej mnie', count: allRequests.length },
                  { value: 'urgent', label: 'Pilne', count: urgentRequests.length },
                ]}
              />
            </View>
            <Button
              title={savedRoute ? 'Pokaż zapisaną trasę' : 'Zaplanuj trasę (po drodze)'}
              variant="secondary"
              inline
              onPress={() => (savedRoute ? toggleRouteActive(true) : router.push('/route-planner'))}
            />
          </>
        )}
      </View>

      {error && (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {errorMessage(error)}
        </ThemedText>
      )}

      <View style={styles.filterRows}>
        <View style={styles.chipRow}>
          {CATEGORY_FILTERS.map((category) => {
            const selected = categoryFilter === category;
            const label = category === 'ALL' ? 'Wszystkie kategorie' : CategoryLabels[category];
            return (
              <Pressable
                key={category}
                onPress={() => setCategoryFilter(category)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: selected
                      ? category === 'ALL'
                        ? theme.primarySoft
                        : CategoryColors[category].soft
                      : theme.backgroundElement,
                    borderColor:
                      selected && category !== 'ALL'
                        ? CategoryColors[category].color
                        : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="caption"
                  style={{
                    color:
                      selected && category !== 'ALL'
                        ? CategoryColors[category].color
                        : selected
                          ? theme.primary
                          : theme.textSecondary,
                    fontWeight: '700',
                  }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chipRow}>
          {PRIORITY_FILTERS.map((priority) => {
            const selected = priorityFilter === priority;
            const label = priority === 'ALL' ? 'Każda pilność' : PriorityLabels[priority];
            return (
              <Pressable
                key={priority}
                onPress={() => setPriorityFilter(priority)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor:
                      selected && priority !== 'ALL'
                        ? PriorityColors[priority].soft
                        : selected
                          ? theme.primarySoft
                          : theme.backgroundElement,
                    borderColor:
                      selected && priority !== 'ALL'
                        ? PriorityColors[priority].color
                        : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="caption"
                  style={{
                    color:
                      selected && priority !== 'ALL'
                        ? PriorityColors[priority].color
                        : selected
                          ? theme.primary
                          : theme.textSecondary,
                    fontWeight: '700',
                  }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapWithList}>
        <View style={styles.mapPane}>
          <LeafletMap
            requests={displayedRequests}
            matchingRequests={matchingRequests}
            showRouteBuffer={Boolean(activeRoute)}
            routeCoordinates={activeRoute?.coordinates}
            fitRouteOnChange={false}
            userLocation={mapCenter}
            userLocationLabel={locationLabel}
            height={620}
          />
        </View>
        <View
          style={[
            styles.sidePanel,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View style={styles.sidePanelHeader}>
            <ThemedText type="smallBold">Zgłoszenia najbliżej Ciebie</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {locationLabel}
            </ThemedText>
          </View>
          {displayedRequests.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Brak zgłoszeń dla wybranych filtrów.
            </ThemedText>
          ) : (
            <View style={styles.requestList}>
              {displayedRequests.slice(0, 8).map((request, index) => {
                const distance = requestDistance(request, mapCenter);
                return (
                  <Pressable
                    key={request.id}
                    onPress={() =>
                      router.push({ pathname: '/request/[id]', params: { id: request.id } })
                    }
                    style={({ pressed }) => [
                      styles.requestRow,
                      { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.requestRank}>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {index + 1}
                      </ThemedText>
                    </View>
                    <View style={styles.requestInfo}>
                      <View style={styles.requestMetaRow}>
                        <View
                          style={[
                            styles.requestDot,
                            {
                              backgroundColor: CategoryColors[request.category].color,
                              borderColor: PriorityColors[request.priority].color,
                            },
                          ]}
                        />
                        <ThemedText type="caption" themeColor="textSecondary">
                          {formatDistance(distance)} · {PriorityLabels[request.priority]} ·{' '}
                          {timeAgo(request.createdAt)}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {request.title}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {CategoryLabels[request.category]}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <LocationPermissionModal
        visible={isPermissionModalOpen}
        onLocationGranted={handleLocationGranted}
        onChooseManual={() => {
          setIsPermissionModalOpen(false);
          setIsSearchModalOpen(true);
        }}
        onDismiss={() => setIsPermissionModalOpen(false)}
      />

      <PlaceSearchModal
        visible={isSearchModalOpen}
        title="Wybierz swoją lokalizację"
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleSelectLocation}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  locationBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
  },
  routeLabel: {
    flexGrow: 1,
  },
  filter: {
    minWidth: 360,
  },
  pressed: {
    opacity: 0.7,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 4,
  },
  radiusChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterRows: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  mapWithList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  mapPane: {
    flex: 1,
    minWidth: 420,
  },
  sidePanel: {
    width: 360,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  sidePanelHeader: {
    gap: 2,
  },
  requestList: {
    gap: Spacing.one,
  },
  requestRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  requestRank: {
    width: 22,
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
    gap: 3,
  },
  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  requestDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
