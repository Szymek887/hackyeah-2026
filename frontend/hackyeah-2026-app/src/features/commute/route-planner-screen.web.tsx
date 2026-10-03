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
  createRouteBuffer,
  formatRouteCoordinate,
  ROUTE_BUFFER_METERS,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { KRAKOW_COMMUTE_ROUTE } from '@/features/map/krakow-map-data';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import type { RouteCoordinate } from '@/lib/route-matching';

import { LeafletMap, type RouteEndpoint } from '../map/leaflet-map';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const [editedEndpoint, setEditedEndpoint] = useState<RouteEndpoint>('start');
  const [start, setStart] = useState<RouteCoordinate>(DEFAULT_START);
  const [end, setEnd] = useState<RouteCoordinate>(DEFAULT_END);
  const route = useMemo(() => [start, end], [end, start]);
  const routeLine = useMemo(() => toRouteLineString(route), [route]);
  const routeBuffer = useMemo(() => createRouteBuffer(route, ROUTE_BUFFER_METERS), [route]);
  const {
    data: matchingRequests = [],
    isPending,
    error,
  } = useRequestsAlongRoute({
    route: routeLine,
    bufferMeters: ROUTE_BUFFER_METERS,
  });

  const updateEndpoint = (endpoint: RouteEndpoint, coordinate: RouteCoordinate) => {
    if (endpoint === 'start') setStart(coordinate);
    else setEnd(coordinate);
  };

  const resetRoute = () => {
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setEditedEndpoint('start');
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
        <Button title="Przywróć trasę demo" variant="ghost" inline onPress={resetRoute} />
      </Card>

      <LeafletMap
        matchingRequests={matchingRequests}
        requests={matchingRequests}
        showAreas={false}
        showRouteBuffer
        editableRoute
        routeCoordinates={route}
        routeBufferCoordinates={routeBuffer}
        onMapPress={(coordinate) => updateEndpoint(editedEndpoint, coordinate)}
        onRouteEndpointChange={updateEndpoint}
      />

      <Card highlighted>
        <ThemedText type="smallBold">
          W korytarzu {ROUTE_BUFFER_METERS} m: {matchingRequests.length}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Na mockach filtr działa po stronie frontendu, a z backendem używa PostGIS endpointu
          /api/help-requests/along-route.
        </ThemedText>
        {isPending && <ThemedText type="small">Szukam zgłoszeń przy trasie...</ThemedText>}
        {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
      </Card>
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
});
