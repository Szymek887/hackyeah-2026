import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import {
  clusterRequests,
  NO_CLUSTER_ZOOM,
  zoomFromLongitudeDelta,
} from '@/features/map/map-clustering';
import { useNearbyRequests } from '@/features/requests/hooks';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { timeAgo } from '@/features/requests/labels';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { filterRequestsAlongRoute } from '@/lib/route-matching';
import { useUserLocation } from '@/features/map/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';

export function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { savedRoute } = useSavedCommuteRoute();
  const { locate, isLoading: isLocating, error: locationError } = useUserLocation();

  const [mapZoom, setMapZoom] = useState(() =>
    zoomFromLongitudeDelta(KRAKOW_INITIAL_REGION.longitudeDelta),
  );
  const [mapRegion, setMapRegion] = useState<Region>(KRAKOW_INITIAL_REGION);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [onlyAlongRoute, setOnlyAlongRoute] = useState(false);

  const {
    data: allRequests = [],
    isPending,
    error,
  } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const displayRequests = useMemo(() => {
    if (activeRoute && onlyAlongRoute) {
      return filterRequestsAlongRoute(allRequests, activeRoute.coordinates, ROUTE_BUFFER_METERS);
    }
    return allRequests;
  }, [activeRoute, allRequests, onlyAlongRoute]);

  const requestClusters = useMemo(
    () => clusterRequests(displayRequests, mapZoom),
    [displayRequests, mapZoom],
  );

  // Close up every request is its own point with a rectangular label above it.
  const showLabels = mapZoom >= NO_CLUSTER_ZOOM;
  const selectedRequest = displayRequests.find((request) => request.id === selectedRequestId);
  const selectedAreaRings = selectedRequest ? getAreaPolygonRings(selectedRequest.maskedArea) : [];
  const [selectedOuterRing, ...selectedHoles] = selectedAreaRings;

  const zoomToCluster = (coordinate: { latitude: number; longitude: number }) => {
    setSelectedRequestId(null);
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

  const centerOnMyLocation = async () => {
    const loc = await locate();
    if (loc) {
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

  return (
    <ThemedView style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        showsUserLocation
        showsCompass
        showsScale
        onRegionChangeComplete={(region) => {
          setMapRegion(region);
          setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta));
        }}
        mapPadding={{
          top: insets.top + (activeRoute ? 64 : 12),
          right: 12,
          bottom: selectedRequest ? 260 : 160,
          left: 12,
        }}>
        {activeRoute && activeRoute.coordinates.length >= 2 && (
          <>
            <Polyline
              coordinates={activeRoute.coordinates}
              strokeColor={`${theme.primary}24`}
              strokeWidth={22}
            />
            <Polyline
              coordinates={activeRoute.coordinates}
              strokeColor={theme.primary}
              strokeWidth={5}
            />
            <Marker coordinate={activeRoute.start} pinColor={theme.success} title="Start trasy" />
            <Marker coordinate={activeRoute.end} pinColor={theme.danger} title="Cel trasy" />
          </>
        )}

        {selectedRequest && selectedOuterRing && (
          <Polygon
            coordinates={selectedOuterRing}
            holes={selectedHoles}
            fillColor={`${CategoryColors[selectedRequest.category].color}29`}
            strokeColor={CategoryColors[selectedRequest.category].color}
            strokeWidth={1}
          />
        )}

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
              coordinate={cluster.coordinate}
              // Close up the label sits above the dot, so the dot's bottom marks the spot.
              anchor={showLabels ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
              accessibilityLabel={request.title}
              onPress={() => setSelectedRequestId(request.id)}>
              <View style={styles.markerColumn}>
                {showLabels && (
                  <View
                    style={[
                      styles.markerLabel,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    ]}>
                    <ThemedText type="caption" numberOfLines={2}>
                      {request.title}
                    </ThemedText>
                  </View>
                )}
                <View
                  style={[
                    styles.requestMarker,
                    {
                      backgroundColor: CategoryColors[request.category].color,
                      borderColor: PriorityColors[request.priority].color,
                    },
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Top Bar (Active Commute Route) */}
      {activeRoute ? (
        <View style={[styles.topRouteBar, { top: insets.top + Spacing.one }]}>
          <ThemedView type="backgroundElement" style={styles.topRouteCard}>
            <View style={styles.topRouteRow}>
              <ThemedText type="smallBold">🚗 Aktywna trasa dojazdowa</ThemedText>
              <Pressable
                onPress={() => router.push('/route-planner')}
                style={({ pressed }) => [styles.smallActionBtn, pressed && styles.pressed]}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                  Edytuj
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.routeFilterRow}>
              <Pressable
                onPress={() => setOnlyAlongRoute(false)}
                style={[styles.filterChip, !onlyAlongRoute && { backgroundColor: theme.primary }]}>
                <ThemedText
                  type="caption"
                  style={{
                    color: !onlyAlongRoute ? theme.onPrimary : theme.textSecondary,
                    fontWeight: '600',
                  }}>
                  Wszystkie ({allRequests.length})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setOnlyAlongRoute(true)}
                style={[styles.filterChip, onlyAlongRoute && { backgroundColor: theme.primary }]}>
                <ThemedText
                  type="caption"
                  style={{
                    color: onlyAlongRoute ? theme.onPrimary : theme.textSecondary,
                    fontWeight: '600',
                  }}>
                  Tylko przy trasie (
                  {
                    filterRequestsAlongRoute(
                      allRequests,
                      activeRoute.coordinates,
                      ROUTE_BUFFER_METERS,
                    ).length
                  }
                  )
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      ) : null}

      {/* Floating Right FABs (Locate Me) */}
      <View
        style={[styles.floatingActions, { top: insets.top + (activeRoute ? 96 : Spacing.two) }]}>
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
              📍 Wycentruj
            </ThemedText>
          )}
        </Pressable>
        {locationError && (
          <ThemedView type="backgroundElement" style={styles.errorToast}>
            <ThemedText type="caption" themeColor="warning">
              {locationError}
            </ThemedText>
          </ThemedView>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        {selectedRequest ? (
          <ThemedView type="backgroundElement" style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <View style={styles.badges}>
                <PriorityBadge priority={selectedRequest.priority} />
                <CategoryBadge category={selectedRequest.category} />
              </View>
              <Pressable
                onPress={() => setSelectedRequestId(null)}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  ✕ Zamknij
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="defaultBold" numberOfLines={2}>
              {selectedRequest.title}
            </ThemedText>

            <ThemedText type="caption" themeColor="textSecondary">
              Zgłoszono: {timeAgo(selectedRequest.createdAt)} · Strefa przybliżona ~300 m
            </ThemedText>

            <Button
              title="Zobacz szczegóły i pomóż"
              onPress={() =>
                router.push({ pathname: '/request/[id]', params: { id: selectedRequest.id } })
              }
            />
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.summary}>
            <ThemedText type="smallBold">
              Kraków: {displayRequests.length}{' '}
              {displayRequests.length === 1 ? 'zgłoszenie' : 'zgłoszeń'} w pobliżu
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Wybierz punkt na mapie, aby zobaczyć szczegóły prośby i rozmyty obszar.
            </ThemedText>

            {isPending && <ActivityIndicator color={theme.primary} />}
            {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

            <Button
              title={activeRoute ? 'Zarządzaj trasą' : 'Zaplanuj trasę'}
              onPress={() => router.push('/route-planner')}
            />
          </ThemedView>
        )}
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
  topRouteBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 10,
  },
  topRouteCard: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#D5E5F6',
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  topRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.one,
  },
  routeFilterRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  filterChip: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    backgroundColor: '#F3F8FE',
  },
  floatingActions: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  fab: {
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
  errorToast: {
    maxWidth: 220,
    padding: Spacing.one,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: '#D5E5F6',
  },
  panel: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
    gap: Spacing.two,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  selectedCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#D5E5F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  closeBtn: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.one,
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
  markerColumn: {
    alignItems: 'center',
    gap: 2,
  },
  markerLabel: {
    maxWidth: 160,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
