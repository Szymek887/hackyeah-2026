import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { filterRequestsAlongRoute } from '@/lib/route-matching';

type Filter = 'all' | 'route';

/**
 * Web map: only the map itself. Request details appear on hover (tooltip) and on click (popup);
 * no list below the map. The route is shown only once the user has set and confirmed their own.
 */
export function MapScreen() {
  const { savedRoute, toggleRouteActive } = useSavedCommuteRoute();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: allRequests = [], error } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const matchingRequests = useMemo(
    () =>
      activeRoute
        ? filterRequestsAlongRoute(allRequests, activeRoute.coordinates, ROUTE_BUFFER_METERS)
        : [],
    [activeRoute, allRequests],
  );

  const displayedRequests = activeRoute && filter === 'route' ? matchingRequests : allRequests;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Mapa zgłoszeń
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Najedź na punkt, aby zobaczyć, czego dotyczy. Kliknij, aby otworzyć szczegóły.
        </ThemedText>
      </View>

      <View style={styles.toolbar}>
        {activeRoute ? (
          <>
            <ThemedText type="smallBold" style={styles.routeLabel}>
              Twoja trasa
              {activeRoute.distanceMeters > 0
                ? ` · ${formatRouteDistance(activeRoute.distanceMeters)}`
                : ''}
            </ThemedText>
            <View style={styles.filter}>
              <SegmentedControl
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'Wszystkie', count: allRequests.length },
                  { value: 'route', label: 'Przy trasie', count: matchingRequests.length },
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
              Wyznacz trasę do pracy lub na uczelnię, aby zobaczyć prośby po drodze.
            </ThemedText>
            <Button
              title={savedRoute ? 'Pokaż moją trasę' : 'Wyznacz trasę'}
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
        height={600}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
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
});
