import { router } from 'expo-router';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import {
  formatRouteCoordinate,
  formatRouteDistance,
  formatRouteDuration,
  ROUTE_BUFFER_METERS,
  simplifyRoute,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { useDrivingRoute } from '@/features/commute/hooks';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import { useUserLocation } from '@/features/map/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  toLatLng,
} from '@/features/map/krakow-map-data';
import { clusterRequests, zoomFromLongitudeDelta } from '@/features/map/map-clustering';
import type { RouteCoordinate } from '@/lib/route-matching';

type EditedEndpoint = 'start' | 'end';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { savedRoute, setSavedRoute } = useSavedCommuteRoute();
  const { locate, isLoading: isLocating, error: locationError } = useUserLocation();

  const [editedEndpoint, setEditedEndpoint] = useState<EditedEndpoint>('start');
  const [start, setStart] = useState<RouteCoordinate>(savedRoute?.start ?? DEFAULT_START);
  const [end, setEnd] = useState<RouteCoordinate>(savedRoute?.end ?? DEFAULT_END);
  const [isRouteConfirmed, setIsRouteConfirmed] = useState(Boolean(savedRoute?.isActive));
  const [mapZoom, setMapZoom] = useState(() =>
    zoomFromLongitudeDelta(KRAKOW_INITIAL_REGION.longitudeDelta),
  );
  const [mapRegion, setMapRegion] = useState<Region>(KRAKOW_INITIAL_REGION);
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
  const requestClusters = useMemo(
    () => clusterRequests(matchingRequests, mapZoom),
    [mapZoom, matchingRequests],
  );

  useEffect(() => {
    if (!drivingRoute) return;
    mapRef.current?.fitToCoordinates(route, {
      animated: true,
      edgePadding: { top: 56, right: 48, bottom: 320, left: 48 },
    });
  }, [drivingRoute, route]);

  const updateEndpoint = (endpoint: EditedEndpoint, coordinate: RouteCoordinate) => {
    setIsRouteConfirmed(false);
    if (endpoint === 'start') setStart(coordinate);
    else setEnd(coordinate);
  };

  const setStartToUserLocation = async () => {
    const loc = await locate();
    if (loc) {
      updateEndpoint('start', loc);
      mapRef.current?.animateToRegion(
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        300,
      );
    }
  };

  const centerOnMyLocation = async () => {
    const loc = await locate();
    if (loc) {
      mapRef.current?.animateToRegion(
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300,
      );
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

  const zoomToCluster = (coordinate: { latitude: number; longitude: number }) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: Math.max(mapRegion.latitudeDelta / 3, 0.004),
        longitudeDelta: Math.max(mapRegion.longitudeDelta / 3, 0.004),
      },
      260,
    );
  };

  return (
    <ThemedView style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        showsUserLocation
        onPress={(event) => updateEndpoint(editedEndpoint, event.nativeEvent.coordinate)}
        onRegionChangeComplete={(region) => {
          setMapRegion(region);
          setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta));
        }}
        mapPadding={{ top: insets.top + 8, right: 12, bottom: 280, left: 12 }}>
        <Polyline coordinates={route} strokeColor={`${theme.primary}24`} strokeWidth={22} />
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
        {requestClusters.map((cluster) => {
          if (cluster.requests.length > 1) {
            return (
              <Marker
                key={cluster.id}
                coordinate={cluster.coordinate}
                onPress={() => zoomToCluster(cluster.coordinate)}>
                <View
                  style={[
                    styles.clusterMarker,
                    { backgroundColor: theme.primary, borderColor: theme.backgroundElement },
                  ]}>
                  <ThemedText type="caption" style={{ color: theme.onPrimary }}>
                    {cluster.requests.length}
                  </ThemedText>
                </View>
              </Marker>
            );
          }

          const request = cluster.requests[0];
          return (
            <Marker
              key={request.id}
              coordinate={toLatLng(request.approximateLocation.coordinates)}
              onPress={() => {}}>
              <View
                style={[
                  styles.requestMarker,
                  {
                    backgroundColor: CategoryColors[request.category].color,
                    borderColor: PriorityColors[request.priority].color,
                  },
                ]}
              />
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.floatingControls, { top: insets.top + Spacing.two }]}>
        <Pressable
          style={({ pressed }) => [
            styles.locateFab,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
          onPress={centerOnMyLocation}>
          {isLocating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              📍 Wycentruj
            </ThemedText>
          )}
        </Pressable>
      </View>

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
              { value: 'start', label: 'Start (A)' },
              { value: 'end', label: 'Cel (B)' },
            ]}
          />

          <View style={styles.coordinateRow}>
            <View style={styles.endpointInfo}>
              <ThemedText type="caption" themeColor="textSecondary">
                A: {formatRouteCoordinate(start)}
              </ThemedText>
              <Pressable
                onPress={setStartToUserLocation}
                disabled={isLocating}
                style={({ pressed }) => [styles.myLocationBtn, pressed && styles.pressed]}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
                  {isLocating ? 'Pobieram...' : '🎯 Użyj mojej pozycji jako Start'}
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              B: {formatRouteCoordinate(end)}
            </ThemedText>
            {locationError && (
              <ThemedText type="caption" themeColor="warning">
                {locationError}
              </ThemedText>
            )}
          </View>

          <View style={styles.resultRow}>
            <ThemedText type="smallBold">
              W korytarzu {ROUTE_BUFFER_METERS} m: {matchingRequests.length}
            </ThemedText>
            <Button title="Resetuj" variant="ghost" inline onPress={resetRoute} />
          </View>

          <Button
            title="Zapisz trasę i pokaż na mapie"
            disabled={isRouting}
            onPress={handleConfirmRoute}
          />

          {drivingRoute && (
            <ThemedText type="small" themeColor="textSecondary">
              Trasa drogami: {formatRouteDistance(drivingRoute.distanceMeters)} · około{' '}
              {formatRouteDuration(drivingRoute.durationSeconds)}
            </ThemedText>
          )}

          {isRouting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="small">Wyznaczam trasę po drogach...</ThemedText>
            </View>
          )}
          {routingError && !isRouting && (
            <ThemedText type="small" themeColor="warning">
              Nie udało się wyznaczyć trasy drogowej. Tymczasowo pokazuję linię prostą.
            </ThemedText>
          )}
          {isPending && <ThemedText type="small">Szukam zgłoszeń przy trasie...</ThemedText>}
          {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

          {isRouteConfirmed && (
            <View style={styles.results}>
              <ThemedText type="smallBold">Komu możesz pomóc na trasie</ThemedText>
              {matchingRequests.length > 0 ? (
                <ScrollView
                  style={styles.requestList}
                  contentContainerStyle={styles.requestListContent}>
                  {matchingRequests.map((request) => (
                    <Pressable
                      key={request.id}
                      onPress={() =>
                        router.push({ pathname: '/request/[id]', params: { id: request.id } })
                      }
                      style={({ pressed }) => [styles.requestRow, pressed && styles.pressed]}>
                      <View
                        style={[
                          styles.requestDot,
                          {
                            backgroundColor: CategoryColors[request.category].color,
                            borderColor: PriorityColors[request.priority].color,
                          },
                        ]}
                      />
                      <View style={styles.requestText}>
                        <ThemedText type="smallBold">{request.title}</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          Priorytet {request.priority}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.primary, fontWeight: '600' }}>
                        Zobacz →
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Brak zgłoszeń przy tej trasie. Przesuń start albo cel i spróbuj ponownie.
                </ThemedText>
              )}
            </View>
          )}
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
  floatingControls: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 10,
  },
  locateFab: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  endpointInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  myLocationBtn: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.one,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  results: {
    gap: Spacing.two,
  },
  requestList: {
    maxHeight: 180,
  },
  requestListContent: {
    gap: Spacing.two,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  requestDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  requestText: {
    flex: 1,
    gap: Spacing.half,
  },
  clusterMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
});
