import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { KRAKOW_COMMUTE_ROUTE } from '@/features/map/krakow-map-data';
import { RequestCard } from '@/features/requests/components/request-card';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import type { RouteCoordinate } from '@/lib/route-matching';

import { LeafletMap, type RouteEndpoint } from '../map/leaflet-map';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const [editedEndpoint, setEditedEndpoint] = useState<RouteEndpoint>('start');
  const [start, setStart] = useState<RouteCoordinate>(DEFAULT_START);
  const [end, setEnd] = useState<RouteCoordinate>(DEFAULT_END);
  const [isRouteConfirmed, setIsRouteConfirmed] = useState(false);
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

  const resetRoute = () => {
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setEditedEndpoint('start');
    setIsRouteConfirmed(false);
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
            { value: 'start', label: 'Ustaw start' },
            { value: 'end', label: 'Ustaw cel' },
          ]}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Kliknij mapę, aby przesunąć wybrany punkt, albo przeciągnij znacznik A/B.
        </ThemedText>
        <View style={styles.coordinates}>
          <ThemedText type="small">A: {formatRouteCoordinate(start)}</ThemedText>
          <ThemedText type="small">B: {formatRouteCoordinate(end)}</ThemedText>
        </View>
        <View style={styles.actions}>
          <Button
            title={isRouteConfirmed ? 'Trasa zatwierdzona' : 'Zatwierdź trasę'}
            disabled={isRouting || isPending || isRouteConfirmed}
            onPress={() => setIsRouteConfirmed(true)}
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
            ? 'To są zgłoszenia, które możesz obsłużyć po drodze.'
            : 'Zatwierdź trasę, żeby przejść do wyboru osoby, której chcesz pomóc.'}
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
