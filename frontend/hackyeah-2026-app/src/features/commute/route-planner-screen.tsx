import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CategoryColors, Spacing } from '@/constants/theme';
import {
  createRouteBuffer,
  formatRouteCoordinate,
  ROUTE_BUFFER_METERS,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  toLatLng,
} from '@/features/map/krakow-map-data';
import type { RouteCoordinate } from '@/lib/route-matching';

type EditedEndpoint = 'start' | 'end';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [editedEndpoint, setEditedEndpoint] = useState<EditedEndpoint>('start');
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

  const updateEndpoint = (endpoint: EditedEndpoint, coordinate: RouteCoordinate) => {
    if (endpoint === 'start') setStart(coordinate);
    else setEnd(coordinate);
  };

  const resetRoute = () => {
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setEditedEndpoint('start');
  };

  return (
    <ThemedView style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        onPress={(event) => updateEndpoint(editedEndpoint, event.nativeEvent.coordinate)}
        mapPadding={{ top: insets.top + 8, right: 12, bottom: 260, left: 12 }}>
        <Polygon
          coordinates={routeBuffer}
          fillColor={`${theme.primary}1F`}
          strokeColor={`${theme.primary}99`}
          strokeWidth={2}
        />
        <Polyline coordinates={route} strokeColor={theme.primary} strokeWidth={5} />
        <Marker
          coordinate={start}
          draggable
          pinColor={theme.success}
          title="Start"
          onDragEnd={(event) => updateEndpoint('start', event.nativeEvent.coordinate)}
        />
        <Marker
          coordinate={end}
          draggable
          pinColor={theme.danger}
          title="Cel"
          onDragEnd={(event) => updateEndpoint('end', event.nativeEvent.coordinate)}
        />
        {matchingRequests.map((request) => (
          <Marker
            key={request.id}
            coordinate={toLatLng(request.approximateLocation.coordinates)}
            pinColor={CategoryColors[request.category].color}
            title={request.title}
          />
        ))}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Ustaw trasę na mapie</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Wybierz punkt, a potem stuknij mapę albo przeciągnij jego pinezkę.
          </ThemedText>
          <SegmentedControl
            value={editedEndpoint}
            onChange={setEditedEndpoint}
            options={[
              { value: 'start', label: 'Start' },
              { value: 'end', label: 'Cel' },
            ]}
          />
          <View style={styles.coordinateRow}>
            <ThemedText type="caption" themeColor="textSecondary">
              A {formatRouteCoordinate(start)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              B {formatRouteCoordinate(end)}
            </ThemedText>
          </View>
          <View style={styles.resultRow}>
            <ThemedText type="smallBold">
              W korytarzu {ROUTE_BUFFER_METERS} m: {matchingRequests.length}
            </ThemedText>
            <Button title="Resetuj" variant="ghost" inline onPress={resetRoute} />
          </View>
          {isPending && <ThemedText type="small">Szukam zgłoszeń przy trasie...</ThemedText>}
          {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  coordinateRow: {
    gap: Spacing.half,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
