import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  formatRouteCoordinate,
  formatRouteDistance,
  formatRouteDuration,
  ROUTE_BUFFER_METERS,
  simplifyRoute,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { useDrivingRoute } from '@/features/commute/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { useUserLocation } from '@/features/map/use-user-location';
import { KRAKOW_COMMUTE_ROUTE } from '@/features/map/krakow-map-data';
import { RequestCard } from '@/features/requests/components/request-card';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import type { RouteCoordinate } from '@/lib/route-matching';

import { LeafletMap, type RouteEndpoint } from '../map/leaflet-map';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const theme = useTheme();
  const { savedRoute, setSavedRoute } = useSavedCommuteRoute();
  const { locate, isLoading: isLocating, error: locationError } = useUserLocation();

  const [editedEndpoint, setEditedEndpoint] = useState<RouteEndpoint>('start');
  const [start, setStart] = useState<RouteCoordinate>(savedRoute?.start ?? DEFAULT_START);
  const [end, setEnd] = useState<RouteCoordinate>(savedRoute?.end ?? DEFAULT_END);
  const [isRouteConfirmed, setIsRouteConfirmed] = useState(Boolean(savedRoute?.isActive));
  const directRoute = useMemo(() => [start, end], [end, start]);
  const {
    data: drivingRoute,
    isFetching: isRouting,
    error: routingError,
  } = useDrivingRoute(start, end);
  const route = drivingRoute?.coordinates ?? directRoute;
  const apiRoute = useMemo(() => simplifyRoute(route), [route]);
  const routeLine = useMemo(() => toRouteLineString(apiRoute), [apiRoute]);
  const {
    data: matchingRequests = [],
    isPending,
    error,
  } = useRequestsAlongRoute({
    route: routeLine,
    bufferMeters: ROUTE_BUFFER_METERS,
  });

  const updateEndpoint = (endpoint: RouteEndpoint, coordinate: RouteCoordinate) => {
    setIsRouteConfirmed(false);
    if (endpoint === 'start') setStart(coordinate);
    else setEnd(coordinate);
  };

  const setStartToUserLocation = async () => {
    const loc = await locate();
    if (loc) {
      updateEndpoint('start', loc);
    }
  };

  const resetRoute = () => {
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setEditedEndpoint('start');
    setIsRouteConfirmed(false);
  };

  const handleConfirmRoute = () => {
    setIsRouteConfirmed(true);
    setSavedRoute({
      start,
      end,
      coordinates: route,
      distanceMeters: drivingRoute?.distanceMeters ?? 0,
      durationSeconds: drivingRoute?.durationSeconds ?? 0,
      isActive: true,
    });
    // The map tab reads the same store, so the new route is already drawn there.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Moja trasa</ThemedText>
        <ThemedText themeColor="textSecondary">
          Ustaw początek i cel, aby znaleźć zgłoszenia możliwe do obsłużenia po drodze.
        </ThemedText>
      </View>

      <Card style={styles.editor}>
        <SegmentedControl
          value={editedEndpoint}
          onChange={setEditedEndpoint}
          options={[
            { value: 'start', label: 'Ustaw start (A)' },
            { value: 'end', label: 'Ustaw cel (B)' },
          ]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Kliknij mapę, aby przesunąć wybrany punkt, albo przeciągnij znacznik A/B.
        </ThemedText>

        <View style={styles.coordinates}>
          <View style={styles.endpointRow}>
            <ThemedText type="small">A: {formatRouteCoordinate(start)}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={setStartToUserLocation}
              disabled={isLocating}
              style={({ pressed }) => [styles.myLocationBtn, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {isLocating ? 'Pobieram...' : '🎯 Użyj mojej pozycji jako start'}
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small">B: {formatRouteCoordinate(end)}</ThemedText>
          {locationError && (
            <ThemedText type="caption" themeColor="warning">
              {locationError}
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title="Zapisz trasę i pokaż na mapie"
            disabled={isRouting}
            onPress={handleConfirmRoute}
          />
          <Button title="Przywróć trasę demo" variant="ghost" inline onPress={resetRoute} />
        </View>

        {drivingRoute && (
          <ThemedText type="smallBold">
            {formatRouteDistance(drivingRoute.distanceMeters)} · około{' '}
            {formatRouteDuration(drivingRoute.durationSeconds)}
          </ThemedText>
        )}
        {isRouting && <ThemedText type="small">Wyznaczam trasę po drogach...</ThemedText>}
        {routingError && !isRouting && (
          <ThemedText type="small" themeColor="warning">
            Nie udało się wyznaczyć trasy drogowej. Tymczasowo pokazuję linię prostą.
          </ThemedText>
        )}
      </Card>

      <LeafletMap
        matchingRequests={matchingRequests}
        requests={matchingRequests}
        height={480}
        showAreas={false}
        showRouteBuffer
        editableRoute
        routeCoordinates={route}
        onMapPress={(coordinate) => updateEndpoint(editedEndpoint, coordinate)}
        onRouteEndpointChange={updateEndpoint}
      />

      <Card highlighted>
        <ThemedText type="smallBold">
          W korytarzu {ROUTE_BUFFER_METERS} m: {matchingRequests.length}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {isRouteConfirmed
            ? 'Trasa jest aktywna – te zgłoszenia możesz obsłużyć po drodze.'
            : 'Zapisz trasę – pojawi się na mapie głównej razem ze zgłoszeniami po drodze.'}
        </ThemedText>
        {isPending && <ThemedText type="small">Szukam zgłoszeń przy trasie...</ThemedText>}
        {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
      </Card>

      {isRouteConfirmed && (
        <View style={styles.results}>
          <ThemedText type="subtitle">Komu możesz pomóc</ThemedText>
          {matchingRequests.length > 0 ? (
            matchingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={() =>
                  router.push({ pathname: '/request/[id]', params: { id: request.id } })
                }
              />
            ))
          ) : (
            <Card>
              <ThemedText type="smallBold">Brak zgłoszeń przy tej trasie</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Przesuń start lub cel i spróbuj zatwierdzić trasę jeszcze raz.
              </ThemedText>
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  editor: {
    gap: Spacing.two,
  },
  coordinates: {
    gap: Spacing.one,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  myLocationBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  results: {
    gap: Spacing.two,
  },
});
