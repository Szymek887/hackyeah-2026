import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { LeafletMap } from '@/features/map/leaflet-map';
import { useNearbyRequests } from '@/features/requests/hooks';
import { filterRequestsAlongRoute } from '@/lib/route-matching';
import { RequestCard } from '@/features/requests/components/request-card';
import { KRAKOW_COMMUTE_ROUTE, KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';

export function MapScreen() {
  const { savedRoute } = useSavedCommuteRoute();
  const [onlyAlongRoute, setOnlyAlongRoute] = useState(false);

  const { data: allRequests = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  const activeRouteCoordinates = savedRoute?.isActive
    ? savedRoute.coordinates
    : KRAKOW_COMMUTE_ROUTE;

  const matchingRequests = useMemo(
    () => filterRequestsAlongRoute(allRequests, activeRouteCoordinates, ROUTE_BUFFER_METERS),
    [allRequests, activeRouteCoordinates],
  );

  const displayedRequests = onlyAlongRoute ? matchingRequests : allRequests;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Mapa zgłoszeń</ThemedText>
        <ThemedText themeColor="textSecondary">
          Zgłoszenia w Krakowie są grupowane, żeby mapa pozostała czytelna.
        </ThemedText>
      </View>

      <LeafletMap
        matchingRequests={matchingRequests}
        requests={displayedRequests}
        showRouteBuffer={Boolean(savedRoute?.isActive)}
        routeCoordinates={activeRouteCoordinates}
      />

      <Card highlighted style={styles.stats}>
        <View style={styles.statsHeader}>
          <ThemedText type="smallBold">
            {savedRoute?.isActive ? '🚗 Aktywna trasa' : 'Trasa domyślna (demo)'}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/route-planner')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="caption" style={{ color: Colors.light.primary, fontWeight: '700' }}>
              Zmień trasę →
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          W korytarzu {ROUTE_BUFFER_METERS} m: {matchingRequests.length} z {allRequests.length}{' '}
          zgłoszeń.
        </ThemedText>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setOnlyAlongRoute(false)}
            style={[
              styles.filterChip,
              !onlyAlongRoute && { backgroundColor: Colors.light.primary },
            ]}>
            <ThemedText
              type="caption"
              style={{
                color: !onlyAlongRoute ? Colors.light.onPrimary : Colors.light.textSecondary,
                fontWeight: '700',
              }}>
              Wszystkie ({allRequests.length})
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setOnlyAlongRoute(true)}
            style={[
              styles.filterChip,
              onlyAlongRoute && { backgroundColor: Colors.light.primary },
            ]}>
            <ThemedText
              type="caption"
              style={{
                color: onlyAlongRoute ? Colors.light.onPrimary : Colors.light.textSecondary,
                fontWeight: '700',
              }}>
              Tylko przy trasie ({matchingRequests.length})
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      <View style={styles.list}>
        <ThemedText type="smallBold">
          {onlyAlongRoute ? 'Zgłoszenia przy Twojej trasie' : 'Zgłoszenia w pobliżu'}
        </ThemedText>
        {displayedRequests.slice(0, 8).map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onPress={() => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
          />
        ))}
      </View>

      <Button title="Zaplanuj nową trasę" onPress={() => router.push('/route-planner')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  stats: {
    gap: Spacing.two,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  filterChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    backgroundColor: '#F3F8FE',
  },
  list: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
