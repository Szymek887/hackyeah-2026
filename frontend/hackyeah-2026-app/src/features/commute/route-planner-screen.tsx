import { router } from 'expo-router';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import {
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
import { PlaceSearchModal } from '@/features/commute/components/place-search-modal';
import { KRAKOW_PRESET_PLACES } from '@/features/commute/krakow-places';

const DEFAULT_START_COORDS = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END_COORDS = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { savedRoute, setSavedRoute } = useSavedCommuteRoute();
  const { locate, isLoading: isLocating } = useUserLocation();

  const [start, setStart] = useState<RouteCoordinate>(savedRoute?.start ?? DEFAULT_START_COORDS);
  const [end, setEnd] = useState<RouteCoordinate>(savedRoute?.end ?? DEFAULT_END_COORDS);
  const [startLabel, setStartLabel] = useState<string>(() => {
    const matched = KRAKOW_PRESET_PLACES.find(
      (p) =>
        Math.abs(p.coordinate.latitude - (savedRoute?.start ?? DEFAULT_START_COORDS).latitude) <
        0.002,
    );
    return matched?.name ?? 'AGH / Krowodrza';
  });
  const [endLabel, setEndLabel] = useState<string>(() => {
    const matched = KRAKOW_PRESET_PLACES.find(
      (p) =>
        Math.abs(p.coordinate.latitude - (savedRoute?.end ?? DEFAULT_END_COORDS).latitude) < 0.002,
    );
    return matched?.name ?? 'Kazimierz / Podgórze';
  });

  const [searchTarget, setSearchTarget] = useState<'start' | 'end' | null>(null);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

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
    if (!drivingRoute || route.length === 0) return;
    mapRef.current?.fitToCoordinates(route, {
      animated: true,
      edgePadding: { top: insets.top + 140, right: 36, bottom: 200, left: 36 },
    });
  }, [drivingRoute, insets.top, route]);

  const handleSwapEndpoints = () => {
    const oldStart = start;
    const oldStartLabel = startLabel;
    setStart(end);
    setStartLabel(endLabel);
    setEnd(oldStart);
    setEndLabel(oldStartLabel);
  };

  const handleSelectPlace = (name: string, coordinate: RouteCoordinate) => {
    if (searchTarget === 'start') {
      setStart(coordinate);
      setStartLabel(name);
    } else if (searchTarget === 'end') {
      setEnd(coordinate);
      setEndLabel(name);
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

  const fitFullRoute = () => {
    if (route.length > 0) {
      mapRef.current?.fitToCoordinates(route, {
        animated: true,
        edgePadding: { top: insets.top + 140, right: 36, bottom: 200, left: 36 },
      });
    }
  };

  const handleConfirmRoute = () => {
    setSavedRoute({
      start,
      end,
      coordinates: route,
      distanceMeters: drivingRoute?.distanceMeters ?? 0,
      durationSeconds: drivingRoute?.durationSeconds ?? 0,
      isActive: true,
    });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const zoomToCluster = (coordinate: { latitude: number; longitude: number }) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: Math.max(mapRegion.latitudeDelta / 3, 0.0015),
        longitudeDelta: Math.max(mapRegion.longitudeDelta / 3, 0.0015),
      },
      260,
    );
  };

  return (
    <ThemedView style={styles.root}>
      {/* Top Search & Destination Card */}
      <View style={[styles.topCardContainer, { top: insets.top + Spacing.one }]}>
        <ThemedView type="backgroundElement" style={styles.topCard}>
          <View style={styles.inputsRow}>
            <View style={styles.indicatorsColumn}>
              <View style={[styles.dot, { backgroundColor: theme.success }]} />
              <View style={[styles.connectingLine, { backgroundColor: theme.border }]} />
              <View style={[styles.dot, { backgroundColor: theme.danger }]} />
            </View>

            <View style={styles.fieldsColumn}>
              <Pressable
                onPress={() => setSearchTarget('start')}
                style={({ pressed }) => [
                  styles.addressButton,
                  { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>
                  {startLabel}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Zmień ✎
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setSearchTarget('end')}
                style={({ pressed }) => [
                  styles.addressButton,
                  { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>
                  {endLabel}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Zmień ✎
                </ThemedText>
              </Pressable>
            </View>

            <Pressable
              onPress={handleSwapEndpoints}
              style={({ pressed }) => [
                styles.swapButton,
                { backgroundColor: theme.primarySoft, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="default">⇅</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>

      {/* Interactive Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        showsUserLocation
        showsCompass
        onRegionChangeComplete={(region) => {
          setMapRegion(region);
          setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta));
        }}
        mapPadding={{
          top: insets.top + 130,
          right: 12,
          bottom: isListExpanded ? 320 : 150,
          left: 12,
        }}>
        <Polyline coordinates={route} strokeColor={`${theme.primary}28`} strokeWidth={24} />
        <Polyline coordinates={route} strokeColor={theme.primary} strokeWidth={5} />

        <Marker coordinate={start} pinColor={theme.success} title={`Start: ${startLabel}`} />
        <Marker coordinate={end} pinColor={theme.danger} title={`Cel: ${endLabel}`} />

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
              onPress={() => {
                setSelectedRequestId(request.id);
                setIsListExpanded(true);
              }}>
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

      {/* Floating Action Buttons */}
      <View style={[styles.floatingControls, { top: insets.top + 134 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
          onPress={fitFullRoute}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            🗺️ Cała trasa
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
          onPress={centerOnMyLocation}>
          {isLocating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              📍 GPS
            </ThemedText>
          )}
        </Pressable>
      </View>

      {/* Compact Bottom Summary Sheet */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + Spacing.two }]}>
        <ThemedView type="backgroundElement" style={styles.bottomSheet}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryInfo}>
              {isRouting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText type="small">Przeliczam trasę...</ThemedText>
                </View>
              ) : drivingRoute ? (
                <ThemedText type="smallBold">
                  {formatRouteDistance(drivingRoute.distanceMeters)} · około{' '}
                  {formatRouteDuration(drivingRoute.durationSeconds)}
                </ThemedText>
              ) : (
                <ThemedText type="smallBold">Trasa orientacyjna</ThemedText>
              )}

              <ThemedText type="caption" themeColor="textSecondary">
                Zgłoszeń w korytarzu {ROUTE_BUFFER_METERS} m:{' '}
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                  {matchingRequests.length}
                </ThemedText>
              </ThemedText>
            </View>

            <Pressable
              onPress={() => setIsListExpanded(!isListExpanded)}
              style={({ pressed }) => [
                styles.expandToggle,
                { backgroundColor: theme.primarySoft },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                {isListExpanded ? 'Zwiń listę ▼' : `Pokaż prośby (${matchingRequests.length}) ▲`}
              </ThemedText>
            </Pressable>
          </View>

          {routingError && !isRouting && (
            <ThemedText type="caption" themeColor="warning">
              Nie udało się pobrać trasy drogowej (pokazuję prostą).
            </ThemedText>
          )}

          {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

          {/* Collapsible Requests List */}
          {isListExpanded && (
            <View style={styles.expandedContent}>
              <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                PROŚBY O POMOC NA TWOJEJ DRODZE
              </ThemedText>

              {matchingRequests.length > 0 ? (
                <ScrollView
                  style={styles.requestList}
                  contentContainerStyle={styles.requestListContent}
                  nestedScrollEnabled>
                  {matchingRequests.map((request) => {
                    const isSelected = request.id === selectedRequestId;
                    return (
                      <Pressable
                        key={request.id}
                        onPress={() =>
                          router.push({ pathname: '/request/[id]', params: { id: request.id } })
                        }
                        style={({ pressed }) => [
                          styles.requestRow,
                          {
                            backgroundColor: isSelected
                              ? theme.backgroundSelected
                              : theme.backgroundMuted,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                          pressed && styles.pressed,
                        ]}>
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
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {request.title}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            Priorytet {request.priority} · Strefa ~300 m
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: '700' }}>
                          Pomóż →
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: 8 }}>
                  Brak zgłoszeń w korytarzu tej trasy.
                </ThemedText>
              )}
            </View>
          )}

          {/* Action Button */}
          <Button
            title="Zapisz trasę i pokaż na mapie"
            disabled={isRouting || isPending}
            onPress={handleConfirmRoute}
          />
        </ThemedView>
      </View>

      {/* Search Modal */}
      <PlaceSearchModal
        visible={Boolean(searchTarget)}
        title={searchTarget === 'start' ? 'Wybierz punkt startowy (A)' : 'Wybierz cel podróży (B)'}
        onClose={() => setSearchTarget(null)}
        onSelect={handleSelectPlace}
      />
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
  topCardContainer: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    zIndex: 10,
  },
  topCard: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#D5E5F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  indicatorsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectingLine: {
    width: 2,
    height: 24,
    marginVertical: 2,
  },
  fieldsColumn: {
    flex: 1,
    gap: Spacing.one,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  floatingControls: {
    position: 'absolute',
    right: Spacing.two,
    zIndex: 10,
    gap: Spacing.one,
  },
  fab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  bottomContainer: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: 0,
    zIndex: 10,
  },
  bottomSheet: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#D5E5F6',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  expandToggle: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  expandedContent: {
    gap: Spacing.one,
    maxHeight: 180,
  },
  requestList: {
    maxHeight: 150,
  },
  requestListContent: {
    gap: Spacing.one,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  requestDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  requestText: {
    flex: 1,
    gap: 1,
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
  pressed: {
    opacity: 0.7,
  },
});
