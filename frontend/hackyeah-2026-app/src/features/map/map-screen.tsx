import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import type { Category, HelpRequestListItem, Priority } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import {
  clusterRequests,
  NO_CLUSTER_ZOOM,
  zoomFromLongitudeDelta,
} from '@/features/map/map-clustering';
import { useNearbyRequests, useOfferHelp, useRequestsAlongRoute } from '@/features/requests/hooks';
import { ActiveTaskNotice } from '@/features/tasks/components/active-task-notice';
import { useActiveVolunteerTask } from '@/features/tasks/hooks';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { CategoryLabels, PriorityLabels, timeAgo } from '@/features/requests/labels';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import {
  ROUTE_BUFFER_METERS,
  simplifyRoute,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { distanceMeters } from '@/lib/geo';
import type { RouteCoordinate } from '@/lib/route-matching';
import { useUserLocation } from '@/features/map/use-user-location';
import { USER_LOCATION_SIZE } from '@/features/map/user-location-icon';
import { OsmMapView, type MapHandle, type OsmMarker } from '@/features/map/osm-map-view';
import { useTheme } from '@/hooks/use-theme';
import { KRAKOW_INITIAL_REGION, toLatLng } from '@/features/map/krakow-map-data';
import { PlaceSearchModal } from '@/features/commute/components/place-search-modal';
import { LocationPermissionModal } from '@/features/map/location-permission-modal';
import { setSharedLocation, useSharedLocation } from '@/features/map/location-store';

type CategoryFilter = 'ALL' | Category;
type PriorityFilter = 'ALL' | Priority;

const CATEGORY_FILTERS: CategoryFilter[] = ['ALL', 'MEDICINE', 'GROCERIES', 'HOME_SUPPORT'];
const PRIORITY_FILTERS: PriorityFilter[] = ['ALL', 1, 2, 3];
const MASKED_AREA_RADIUS_METERS = 180;

function requestDistance(request: HelpRequestListItem, center: RouteCoordinate) {
  const [lng, lat] = request.approximateLocation.coordinates;
  return distanceMeters([center.longitude, center.latitude], [lng, lat]);
}

function formatDistance(meters: number) {
  if (meters < 950) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0).replace('.', ',')} km`;
}

function sortByNearest(requests: HelpRequestListItem[], center: RouteCoordinate) {
  return [...requests].sort((a, b) => {
    const distanceDiff = requestDistance(a, center) - requestDistance(b, center);
    if (Math.abs(distanceDiff) > 1) return distanceDiff;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function coordParam(coordinate: RouteCoordinate) {
  return `${coordinate.latitude},${coordinate.longitude}`;
}

function googleRouteViaStopUrl(
  start: RouteCoordinate,
  end: RouteCoordinate,
  stop: RouteCoordinate,
) {
  return [
    'https://www.google.com/maps/dir/?api=1',
    `origin=${encodeURIComponent(coordParam(start))}`,
    `destination=${encodeURIComponent(coordParam(end))}`,
    `waypoints=${encodeURIComponent(coordParam(stop))}`,
    'travelmode=driving',
  ].join('&');
}

function googlePointUrl(point: RouteCoordinate) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordParam(point))}`;
}

function appleDirectionsToStopUrl(start: RouteCoordinate, stop: RouteCoordinate) {
  return [
    'https://maps.apple.com/?dirflg=d',
    `saddr=${encodeURIComponent(coordParam(start))}`,
    `daddr=${encodeURIComponent(coordParam(stop))}`,
  ].join('&');
}

function routePlannerParams(center: RouteCoordinate, label: string) {
  return {
    pathname: '/route-planner' as const,
    params: {
      startLat: String(center.latitude),
      startLng: String(center.longitude),
      startLabel: label,
    },
  };
}

/**
 * Android draws custom marker views as bitmaps. Redrawing them on every frame
 * (`tracksViewChanges`, on by default) with dozens of markers makes the map stutter or stay
 * blank, while switching it off from the start can leave markers empty. So markers are redrawn
 * only for a moment after their look changes (`signature`), then frozen.
 */
function useMarkerRedraw(signature: string) {
  const [tracking, setTracking] = useState(true);
  const [lastSignature, setLastSignature] = useState(signature);
  if (lastSignature !== signature) {
    setLastSignature(signature);
    setTracking(true);
  }
  useEffect(() => {
    if (!tracking) return;
    const timer = setTimeout(() => setTracking(false), MARKER_REDRAW_MS);
    return () => clearTimeout(timer);
  }, [tracking]);
  return tracking;
}

const MARKER_REDRAW_MS = 700;

/**
 * Android uses the OpenStreetMap WebView: in Expo Go (SDK 57) the Google map of react-native-maps
 * renders black with only the Google logo (expo/expo#49323). iOS keeps the native Apple map.
 */
const USE_OSM_MAP = Platform.OS === 'android';

export function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapHandle | null>(null);
  const locationErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { savedRoute } = useSavedCommuteRoute();
  const sharedLocation = useSharedLocation();
  const { locate, isLoading: isLocating, error: locationError } = useUserLocation();
  const offerHelpMutation = useOfferHelp();
  const [offeredIds, setOfferedIds] = useState<number[]>([]);
  const activeTask = useActiveVolunteerTask();

  const [mapCenter, setMapCenter] = useState<RouteCoordinate>(sharedLocation.coordinate);
  const [locationLabel, setLocationLabel] = useState<string>(sharedLocation.label);
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>(
    sharedLocation.label.includes('(GPS)') ? 'gps' : 'manual',
  );
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(true);
  const [showLocationError, setShowLocationError] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(2.5);

  const [mapZoom, setMapZoom] = useState(() =>
    zoomFromLongitudeDelta(KRAKOW_INITIAL_REGION.longitudeDelta),
  );
  const [mapRegion, setMapRegion] = useState<Region>(KRAKOW_INITIAL_REGION);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [onlyAlongRoute, setOnlyAlongRoute] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const activeRoute = savedRoute?.isActive ? savedRoute : null;
  const routeLine = useMemo(
    () =>
      toRouteLineString(
        activeRoute ? simplifyRoute(activeRoute.coordinates) : [mapCenter, mapCenter],
      ),
    [activeRoute, mapCenter],
  );

  const {
    data: allRequests = [],
    isPending,
    error,
  } = useNearbyRequests({
    lat: mapCenter.latitude,
    lng: mapCenter.longitude,
    radiusKm,
  });

  const {
    data: routeRequests = [],
    isPending: isRoutePending,
    error: routeError,
  } = useRequestsAlongRoute(
    {
      route: routeLine,
      bufferMeters: ROUTE_BUFFER_METERS,
    },
    { enabled: Boolean(activeRoute) },
  );

  const handleLocationGranted = (coords: RouteCoordinate) => {
    setIsPermissionModalOpen(false);
    setMapCenter(coords);
    setLocationLabel('Moja lokalizacja (GPS)');
    setLocationSource('gps');
    hideLocationError();
    setSharedLocation({ label: 'Moja lokalizacja (GPS)', coordinate: coords });
    setSelectedRequestId(null);
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
  };

  const displayRequests = useMemo(() => {
    const base = activeRoute && onlyAlongRoute ? routeRequests : allRequests;
    const filtered = base.filter((request) => {
      if (categoryFilter !== 'ALL' && request.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && request.priority !== priorityFilter) return false;
      return true;
    });
    return sortByNearest(filtered, mapCenter);
  }, [
    activeRoute,
    allRequests,
    categoryFilter,
    mapCenter,
    onlyAlongRoute,
    priorityFilter,
    routeRequests,
  ]);

  const requestClusters = useMemo(
    () => clusterRequests(displayRequests, mapZoom),
    [displayRequests, mapZoom],
  );

  const showLabels = mapZoom >= NO_CLUSTER_ZOOM;
  const redrawMarkers = useMarkerRedraw(
    [
      showLabels,
      theme.primary,
      selectedRequestId,
      requestClusters.map((cluster) => cluster.id).join(','),
    ].join('|'),
  );
  const selectedRequest =
    displayRequests.find((request) => request.id === selectedRequestId) ??
    routeRequests.find((request) => request.id === selectedRequestId) ??
    allRequests.find((request) => request.id === selectedRequestId);
  const selectedRequestCenter = selectedRequest
    ? toLatLng(selectedRequest.approximateLocation.coordinates)
    : null;
  const activeRouteUpdatedAt = activeRoute?.updatedAt;

  useEffect(() => {
    if (!activeRouteUpdatedAt) return;
    const timer = setTimeout(() => {
      setOnlyAlongRoute(true);
      setIsSummaryOpen(true);
      setSelectedRequestId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeRouteUpdatedAt]);

  /** The same points as the native markers below, for the OpenStreetMap view (Android). */
  const osmMarkers = useMemo(
    (): OsmMarker[] =>
      requestClusters.map((cluster) =>
        cluster.requests.length > 1
          ? {
              id: `c:${cluster.id}`,
              ...cluster.coordinate,
              kind: 'cluster',
              fill: theme.primaryStrong,
              count: cluster.requests.length,
            }
          : {
              id: `r:${cluster.requests[0].id}`,
              ...cluster.coordinate,
              kind: 'request',
              fill: CategoryColors[cluster.requests[0].category].color,
              ring: PriorityColors[cluster.requests[0].priority].color,
              label: showLabels ? cluster.requests[0].title : undefined,
            },
      ),
    [requestClusters, showLabels, theme.primaryStrong],
  );

  const isBottomPanelVisible = Boolean(selectedRequest || isSummaryOpen);
  const mapPadding = {
    top: insets.top + (activeRoute ? 166 : 70),
    right: 12,
    bottom: isBottomPanelVisible ? 260 : 90,
    left: 12,
  };
  const appleLegalLabelInsets = {
    top: 0,
    right: 0,
    bottom: isBottomPanelVisible ? 1 : -Spacing.two,
    left: Spacing.two,
  };

  const hideLocationError = () => {
    if (locationErrorTimeoutRef.current) {
      clearTimeout(locationErrorTimeoutRef.current);
      locationErrorTimeoutRef.current = null;
    }
    setShowLocationError(false);
  };

  const showLocationErrorTemporarily = () => {
    if (locationErrorTimeoutRef.current) clearTimeout(locationErrorTimeoutRef.current);
    setShowLocationError(true);
    locationErrorTimeoutRef.current = setTimeout(() => {
      setShowLocationError(false);
      locationErrorTimeoutRef.current = null;
    }, 4000);
  };

  const handleSelectLocation = (name: string, coordinate: RouteCoordinate) => {
    setMapCenter(coordinate);
    setLocationLabel(name);
    setLocationSource('manual');
    hideLocationError();
    setSharedLocation({ label: name, coordinate });
    setSelectedRequestId(null);
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      400,
    );
  };

  const centerOnMyLocation = async () => {
    if (locationSource === 'manual') {
      hideLocationError();
      mapRef.current?.animateToRegion(
        {
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        300,
      );
      return;
    }

    const loc = await locate();
    if (loc) {
      setMapCenter(loc);
      setLocationLabel('Moja lokalizacja (GPS)');
      setLocationSource('gps');
      hideLocationError();
      setSharedLocation({ label: 'Moja lokalizacja (GPS)', coordinate: loc });
      mapRef.current?.animateToRegion(
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        300,
      );
    } else {
      showLocationErrorTemporarily();
    }
  };

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

  const openRoutePlanner = () => {
    router.push(routePlannerParams(mapCenter, locationLabel));
  };

  const openSelectedStopInMaps = () => {
    if (!selectedRequestCenter) {
      setOnlyAlongRoute(true);
      setIsSummaryOpen(true);
      return;
    }

    const url =
      Platform.OS === 'ios'
        ? appleDirectionsToStopUrl(activeRoute?.start ?? mapCenter, selectedRequestCenter)
        : activeRoute
          ? googleRouteViaStopUrl(activeRoute.start, activeRoute.end, selectedRequestCenter)
          : googlePointUrl(selectedRequestCenter);

    Linking.openURL(url).catch(() => {
      const message = 'Nie udało się otworzyć map na tym urządzeniu.';
      if (Platform.OS === 'web') alert(message);
      else Alert.alert('Mapy', message);
    });
  };

  const isRouteList = Boolean(activeRoute && onlyAlongRoute);
  const listRequests = isRouteList ? displayRequests : displayRequests.slice(0, 8);
  const listIsPending = isRouteList ? isRoutePending : isPending;
  const listError = isRouteList ? routeError : error;
  const summaryTitle = isRouteList
    ? `Punkty na trasie (${displayRequests.length})`
    : `Najbliżej Ciebie (${displayRequests.length} ${
        displayRequests.length === 1 ? 'zgłoszenie' : 'zgłoszeń'
      })`;
  const summarySubtitle = isRouteList
    ? `Zgłoszenia zgodne z aktywną trasą: ${routeRequests.length}`
    : 'Promień wyszukiwania i filtry:';

  return (
    <ThemedView style={styles.root}>
      {/* Top Location Search & Picker Bar */}
      <View style={[styles.topBarContainer, { top: insets.top + Spacing.one }]}>
        <Pressable
          onPress={() => setIsSearchModalOpen(true)}
          style={({ pressed }) => [
            styles.locationCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.locationTextWrapper}>
            <ThemedText type="caption" themeColor="textSecondary">
              TWOJA LOKALIZACJA
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={1}>
              {locationLabel}
            </ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
            Zmień
          </ThemedText>
        </Pressable>

        {activeRoute && (
          <>
            <View
              style={[
                styles.activeRouteBadge,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Trasa aktywna ({isRoutePending ? '...' : routeRequests.length} po drodze)
              </ThemedText>
              <Pressable
                onPress={() => {
                  setOnlyAlongRoute(!onlyAlongRoute);
                  setIsSummaryOpen(true);
                }}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.primary,
                    textDecorationLine: 'underline',
                    fontWeight: '600',
                  }}>
                  {onlyAlongRoute ? 'Pokaż wszystkie' : 'Tylko na trasie'}
                </ThemedText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="link"
              accessibilityLabel={
                selectedRequest
                  ? 'Otwórz trasę przez wybrany punkt w mapach'
                  : 'Wybierz punkt z trasy'
              }
              onPress={openSelectedStopInMaps}
              style={({ pressed }) => [
                styles.routeMapLink,
                { backgroundColor: theme.primary, borderColor: theme.primaryStrong },
                pressed && styles.pressed,
              ]}>
              <SymbolView
                name={{ ios: 'location.north.line', android: 'navigation' }}
                size={19}
                tintColor={theme.onPrimary}
                weight="bold"
              />
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: theme.onPrimary, fontWeight: '800' }}>
                {selectedRequest ? 'Nawiguj przez wybrany punkt' : 'Wybierz punkt z listy'}
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>

      {/* Main Interactive Map */}
      {USE_OSM_MAP ? (
        <OsmMapView
          ref={mapRef}
          initialRegion={KRAKOW_INITIAL_REGION}
          markers={osmMarkers}
          onMarkerPress={(id) => {
            const [kind, key] = [id.slice(0, 1), id.slice(2)];
            if (kind === 'r') {
              setSelectedRequestId(Number(key));
              return;
            }
            const cluster = requestClusters.find((c) => c.id === key);
            if (cluster) zoomToCluster(cluster.coordinate);
          }}
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
            setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta));
          }}
          userLocation={mapCenter}
          route={activeRoute?.coordinates}
          area={
            selectedRequest && selectedRequestCenter
              ? {
                  center: selectedRequestCenter,
                  radiusMeters: MASKED_AREA_RADIUS_METERS,
                  fill: CategoryColors[selectedRequest.category].color,
                  stroke: PriorityColors[selectedRequest.priority].color,
                }
              : undefined
          }
          padding={mapPadding}
          colors={{
            primary: theme.primary,
            onPrimary: theme.onPrimary,
            surface: theme.backgroundElement,
            text: theme.text,
            border: theme.border,
            success: theme.success,
            danger: theme.danger,
          }}
        />
      ) : (
        <MapView
          ref={(map) => {
            mapRef.current = map;
          }}
          style={styles.map}
          initialRegion={KRAKOW_INITIAL_REGION}
          // Our own "you are here" marker below covers GPS and manually picked places alike.
          showsUserLocation={false}
          showsCompass
          showsScale
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
            setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta));
          }}
          mapPadding={mapPadding}
          legalLabelInsets={appleLegalLabelInsets}
          appleLogoInsets={appleLegalLabelInsets}>
          <Marker
            coordinate={mapCenter}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={1000}
            tracksViewChanges={redrawMarkers}
            title="Tu jesteś"
            description={locationLabel}
            accessibilityLabel={`Tu jesteś: ${locationLabel}`}>
            <View style={styles.meHalo}>
              <View
                style={[
                  styles.meDot,
                  { backgroundColor: theme.primary, borderColor: theme.backgroundElement },
                ]}>
                {/* Person figure from plain views: SVG inside markers renders empty on Android. */}
                <View style={styles.meHead} />
                <View style={styles.meBody} />
              </View>
            </View>
          </Marker>

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

          {selectedRequest && selectedRequestCenter && (
            <Circle
              center={selectedRequestCenter}
              radius={MASKED_AREA_RADIUS_METERS}
              fillColor={`${CategoryColors[selectedRequest.category].color}1F`}
              strokeColor={PriorityColors[selectedRequest.priority].color}
              strokeWidth={3}
            />
          )}

          {requestClusters.map((cluster) => {
            if (cluster.requests.length > 1) {
              return (
                <Marker
                  key={cluster.id}
                  coordinate={cluster.coordinate}
                  tracksViewChanges={redrawMarkers}
                  onPress={() => zoomToCluster(cluster.coordinate)}>
                  <View
                    style={[
                      styles.clusterMarker,
                      {
                        backgroundColor: theme.primaryStrong,
                        borderColor: theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
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
                anchor={showLabels ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
                accessibilityLabel={request.title}
                tracksViewChanges={redrawMarkers}
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
                      styles.requestMarkerHalo,
                      { backgroundColor: theme.backgroundElement },
                    ]}>
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
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Floating GPS Button */}
      <View style={[styles.floatingActions, { top: insets.top + (activeRoute ? 176 : 80) }]}>
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
              Wycentruj
            </ThemedText>
          )}
        </Pressable>
        {locationError && showLocationError && (
          <ThemedView type="backgroundElement" style={styles.errorToast}>
            <ThemedText type="caption" themeColor="warning">
              {locationError}
            </ThemedText>
          </ThemedView>
        )}
      </View>

      {!selectedRequest && !isSummaryOpen && (
        <View style={[styles.leftActions, { bottom: insets.bottom + 0 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Otwórz listę zgłoszeń"
            onPress={() => setIsSummaryOpen(true)}
            style={({ pressed }) => [
              styles.sideAction,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'list.bullet', android: 'list' }}
              size={27}
              tintColor={theme.primary}
              weight="bold"
            />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
              Lista
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zaplanuj trasę"
            onPress={openRoutePlanner}
            style={({ pressed }) => [
              styles.sideAction,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'point.topleft.down.curvedto.point.bottomright.up', android: 'route' }}
              size={27}
              tintColor={theme.primary}
              weight="bold"
            />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
              Trasa
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom Panel */}
      {(selectedRequest || isSummaryOpen) && (
        <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.two }]}>
          {selectedRequest ? (
            <ThemedView type="backgroundElement" style={styles.selectedCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zamknij szczegóły zgłoszenia"
                onPress={() => setSelectedRequestId(null)}
                style={({ pressed }) => [
                  styles.closeIconButton,
                  { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close' }}
                  size={17}
                  tintColor={theme.textSecondary}
                  weight="bold"
                />
              </Pressable>

              <View style={styles.selectedHeader}>
                <View style={styles.badges}>
                  <PriorityBadge priority={selectedRequest.priority} />
                  <CategoryBadge category={selectedRequest.category} />
                </View>
              </View>

              <ThemedText type="defaultBold" numberOfLines={2}>
                {selectedRequest.title}
              </ThemedText>

              <ThemedText type="caption" themeColor="textSecondary">
                Zgłoszono: {timeAgo(selectedRequest.createdAt)} · Strefa przybliżona ~300 m
              </ThemedText>

              {activeRoute && selectedRequestCenter && (
                <Button
                  variant="secondary"
                  title="Otwórz trasę przez ten punkt"
                  onPress={openSelectedStopInMaps}
                />
              )}

              {offeredIds.includes(selectedRequest.id) ? (
                <View
                  style={[
                    styles.offeredBanner,
                    { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Zgłoszono chęć pomocy
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Czekasz na akceptację przez osobę potrzebującą.
                  </ThemedText>
                  <Button
                    variant="secondary"
                    title="Otwórz szczegóły zlecenia"
                    onPress={() =>
                      router.push({ pathname: '/request/[id]', params: { id: selectedRequest.id } })
                    }
                  />
                </View>
              ) : activeTask ? (
                // One active task per volunteer: show it instead of "Chcę pomóc".
                <ActiveTaskNotice task={activeTask} />
              ) : (
                <View style={styles.actionButtonsCol}>
                  <Button
                    title={offerHelpMutation.isPending ? 'Wysyłam zgłoszenie...' : 'Chcę pomóc'}
                    disabled={offerHelpMutation.isPending}
                    onPress={() => {
                      offerHelpMutation.mutate(selectedRequest.id, {
                        onSuccess: () => {
                          setOfferedIds((prev) => [...prev, selectedRequest.id]);
                        },
                      });
                    }}
                  />
                  <Button
                    variant="secondary"
                    title="Zobacz pełne szczegóły"
                    onPress={() =>
                      router.push({ pathname: '/request/[id]', params: { id: selectedRequest.id } })
                    }
                  />
                </View>
              )}

              {offerHelpMutation.error && (
                <ThemedText themeColor="danger">{errorMessage(offerHelpMutation.error)}</ThemedText>
              )}
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.summary}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleWrapper}>
                  <ThemedText type="smallBold">{summaryTitle}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {summarySubtitle}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Zamknij listę zgłoszeń"
                  onPress={() => setIsSummaryOpen(false)}
                  style={({ pressed }) => [
                    styles.summaryCloseButton,
                    { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close' }}
                    size={15}
                    tintColor={theme.textSecondary}
                    weight="bold"
                  />
                  <ThemedText
                    type="caption"
                    themeColor="textSecondary"
                    style={{ fontWeight: '700' }}>
                    Zamknij
                  </ThemedText>
                </Pressable>
              </View>

              {!isRouteList && (
                <View style={styles.summaryControls}>
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
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterList}>
                {CATEGORY_FILTERS.map((category) => {
                  const selected = categoryFilter === category;
                  const label = category === 'ALL' ? 'Wszystkie' : CategoryLabels[category];
                  return (
                    <Pressable
                      key={category}
                      onPress={() => setCategoryFilter(category)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor:
                            selected && category !== 'ALL'
                              ? CategoryColors[category].soft
                              : selected
                                ? theme.primarySoft
                                : theme.background,
                          borderColor:
                            selected && category !== 'ALL'
                              ? CategoryColors[category].color
                              : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="caption"
                        style={{
                          color:
                            selected && category !== 'ALL'
                              ? CategoryColors[category].color
                              : selected
                                ? theme.primary
                                : theme.textSecondary,
                          fontWeight: '700',
                        }}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
                {PRIORITY_FILTERS.map((priority) => {
                  const selected = priorityFilter === priority;
                  const label = priority === 'ALL' ? 'Każda pilność' : PriorityLabels[priority];
                  return (
                    <Pressable
                      key={priority}
                      onPress={() => setPriorityFilter(priority)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor:
                            selected && priority !== 'ALL'
                              ? PriorityColors[priority].soft
                              : selected
                                ? theme.primarySoft
                                : theme.background,
                          borderColor:
                            selected && priority !== 'ALL'
                              ? PriorityColors[priority].color
                              : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="caption"
                        style={{
                          color:
                            selected && priority !== 'ALL'
                              ? PriorityColors[priority].color
                              : selected
                                ? theme.primary
                                : theme.textSecondary,
                          fontWeight: '700',
                        }}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Quick list of nearby items */}
              {listRequests.length > 0 && (
                <ScrollView
                  style={styles.nearbyList}
                  contentContainerStyle={styles.nearbyListContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled>
                  {listRequests.map((req) => {
                    const [lng, lat] = req.approximateLocation.coordinates;
                    return (
                      <Pressable
                        key={req.id}
                        onPress={() => {
                          setSelectedRequestId(req.id);
                          mapRef.current?.animateToRegion(
                            {
                              latitude: lat,
                              longitude: lng,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            },
                            300,
                          );
                        }}
                        style={({ pressed }) => [
                          styles.nearbyItem,
                          { backgroundColor: theme.background, borderColor: theme.border },
                          pressed && styles.pressed,
                        ]}>
                        <View style={styles.nearbyItemText}>
                          <View style={styles.nearbyItemHeader}>
                            <PriorityBadge priority={req.priority} />
                            <CategoryBadge category={req.category} />
                          </View>
                          <ThemedText
                            type="smallBold"
                            numberOfLines={1}
                            style={styles.nearbyItemTitle}>
                            {req.title}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                            {formatDistance(requestDistance(req, mapCenter))} ·{' '}
                            {timeAgo(req.createdAt)}
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="caption"
                          style={{ color: theme.primary, fontWeight: '700' }}>
                          Pokaż
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {!listIsPending && !listError && listRequests.length === 0 && (
                <ThemedView
                  type="backgroundMuted"
                  style={[styles.emptyListState, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">
                    {isRouteList ? 'Brak punktów na tej trasie' : 'Brak zgłoszeń w tym widoku'}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {isRouteList
                      ? 'Możesz pokazać wszystkie zgłoszenia albo zmienić trasę.'
                      : 'Zmień promień lub filtry, żeby poszerzyć wyniki.'}
                  </ThemedText>
                </ThemedView>
              )}

              {listIsPending && <ActivityIndicator color={theme.primary} />}
              {listError && <ThemedText themeColor="danger">{errorMessage(listError)}</ThemedText>}
            </ThemedView>
          )}
        </View>
      )}

      {/* Initial / Onboarding Location Permission Modal */}
      <LocationPermissionModal
        visible={isPermissionModalOpen}
        onLocationGranted={handleLocationGranted}
        onChooseManual={() => {
          setIsPermissionModalOpen(false);
          setIsSearchModalOpen(true);
        }}
        onDismiss={() => setIsPermissionModalOpen(false)}
      />

      {/* Location Picker Search Modal */}
      <PlaceSearchModal
        visible={isSearchModalOpen}
        title="Wybierz swoją lokalizację"
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handleSelectLocation}
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
  topBarContainer: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    zIndex: 10,
    gap: Spacing.one,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTextWrapper: {
    flex: 1,
    gap: 1,
  },
  activeRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  routeMapLink: {
    minHeight: 42,
    paddingVertical: 7,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingActions: {
    position: 'absolute',
    right: Spacing.two,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  leftActions: {
    position: 'absolute',
    left: Spacing.two,
    zIndex: 10,
    gap: Spacing.one,
  },
  sideAction: {
    width: 68,
    minHeight: 64,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
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
    left: Spacing.two,
    right: Spacing.two,
    bottom: 0,
    gap: Spacing.two,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one + 2,
    borderWidth: 1,
    borderColor: '#D5E5F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    padding: Spacing.three,
    paddingRight: Spacing.four,
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
    paddingRight: Spacing.three,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  closeIconButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  meHalo: {
    width: USER_LOCATION_SIZE + 16,
    height: USER_LOCATION_SIZE + 16,
    borderRadius: (USER_LOCATION_SIZE + 16) / 2,
    backgroundColor: 'rgba(28, 126, 214, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: {
    width: USER_LOCATION_SIZE,
    height: USER_LOCATION_SIZE,
    borderRadius: USER_LOCATION_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    overflow: 'hidden',
  },
  meHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  meBody: {
    width: 15,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  requestMarkerHalo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    elevation: 5,
  },
  requestMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 5,
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
  actionButtonsCol: {
    gap: Spacing.one,
  },
  offeredBanner: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    gap: Spacing.one,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  summaryTitleWrapper: {
    flex: 1,
    gap: 2,
  },
  summaryCloseButton: {
    minHeight: 34,
    paddingVertical: 4,
    paddingHorizontal: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  filterList: {
    gap: Spacing.one,
    paddingRight: Spacing.two,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  nearbyList: {
    maxHeight: 188,
  },
  nearbyListContent: {
    gap: Spacing.one,
    paddingVertical: 1,
  },
  emptyListState: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: 3,
  },
  nearbyItem: {
    minHeight: 72,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  nearbyItemHeader: {
    flexDirection: 'row',
    gap: 4,
  },
  nearbyItemText: {
    flex: 1,
    gap: 3,
  },
  nearbyItemTitle: {
    fontSize: 13,
  },
});
