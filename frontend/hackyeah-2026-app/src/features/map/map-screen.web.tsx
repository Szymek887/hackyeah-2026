import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { formatRouteDistance, ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';
import { LeafletMap } from '@/features/map/leaflet-map';
import { useNearbyRequests } from '@/features/requests/hooks';
import { filterRequestsAlongRoute, type RouteCoordinate } from '@/lib/route-matching';
import { PlaceSearchModal } from '@/features/commute/components/place-search-modal';
import { LocationPermissionModal } from '@/features/map/location-permission-modal';
import { useTheme } from '@/hooks/use-theme';

type Filter = 'all' | 'route';

export function MapScreen() {
  const theme = useTheme();
  const { savedRoute, toggleRouteActive } = useSavedCommuteRoute();
  const [filter, setFilter] = useState<Filter>('all');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(true);
  const [locationLabel, setLocationLabel] = useState('Kraków (Centrum)');
  const [radiusKm, setRadiusKm] = useState<number>(2.5);
  const [mapCenter, setMapCenter] = useState<RouteCoordinate>({
    latitude: KRAKOW_INITIAL_REGION.latitude,
    longitude: KRAKOW_INITIAL_REGION.longitude,
  });

  const { data: allRequests = [], error } = useNearbyRequests({
    lat: mapCenter.latitude,
    lng: mapCenter.longitude,
    radiusKm,
  });

  const handleLocationGranted = (coords: RouteCoordinate) => {
    setIsPermissionModalOpen(false);
    setMapCenter(coords);
    setLocationLabel('Moja lokalizacja (GPS)');
  };

  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const matchingRequests = useMemo(
    () =>
      activeRoute
        ? filterRequestsAlongRoute(allRequests, activeRoute.coordinates, ROUTE_BUFFER_METERS)
        : [],
    [activeRoute, allRequests],
  );

  const displayedRequests = activeRoute && filter === 'route' ? matchingRequests : allRequests;

  const handleSelectLocation = (name: string, coordinate: RouteCoordinate) => {
    setLocationLabel(name);
    setMapCenter(coordinate);
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
          {displayedRequests.length === 1 ? 'zgłoszenie' : 'zgłoszeń'}. Najedź na punkt, aby
          zobaczyć szczegóły.
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
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'Wszystkie w okolicy', count: allRequests.length },
                  { value: 'route', label: 'Tylko przy trasie', count: matchingRequests.length },
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
                setFilter('all');
                toggleRouteActive(false);
              }}
            />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              Możesz też opcjonalnie zaplanować trasę, aby pomagać po drodze do pracy lub uczelni.
            </ThemedText>
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

      <LeafletMap
        requests={displayedRequests}
        matchingRequests={matchingRequests}
        showRouteBuffer={Boolean(activeRoute)}
        routeCoordinates={activeRoute?.coordinates}
        userLocation={mapCenter}
        userLocationLabel={locationLabel}
        height={600}
      />

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
    minWidth: 240,
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
});
