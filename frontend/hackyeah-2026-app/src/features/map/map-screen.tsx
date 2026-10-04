import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

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
import { useNearbyRequests, useOfferHelp } from '@/features/requests/hooks';
import { ActiveTaskNotice } from '@/features/tasks/components/active-task-notice';
import { useActiveVolunteerTask } from '@/features/tasks/hooks';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { CategoryLabels, PriorityLabels, timeAgo } from '@/features/requests/labels';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { distanceMeters } from '@/lib/geo';
import { filterRequestsAlongRoute, type RouteCoordinate } from '@/lib/route-matching';
import { useUserLocation } from '@/features/map/use-user-location';
import { PERSON_SVG, USER_LOCATION_SIZE } from '@/features/map/user-location-icon';
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

export function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { savedRoute } = useSavedCommuteRoute();
  const sharedLocation = useSharedLocation();
  const { locate, isLoading: isLocating, error: locationError } = useUserLocation();
  const offerHelpMutation = useOfferHelp();
  const [offeredIds, setOfferedIds] = useState<number[]>([]);
  const activeTask = useActiveVolunteerTask();

  const [mapCenter, setMapCenter] = useState<RouteCoordinate>(sharedLocation.coordinate);
  const [locationLabel, setLocationLabel] = useState<string>(sharedLocation.label);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(true);
  const [radiusKm, setRadiusKm] = useState<number>(2.5);

  const [mapZoom, setMapZoom] = useState(() =>
    zoomFromLongitudeDelta(KRAKOW_INITIAL_REGION.longitudeDelta),
  );
  const [mapRegion, setMapRegion] = useState<Region>(KRAKOW_INITIAL_REGION);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [onlyAlongRoute, setOnlyAlongRoute] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const {
    data: allRequests = [],
    isPending,
    error,
  } = useNearbyRequests({
    lat: mapCenter.latitude,
    lng: mapCenter.longitude,
    radiusKm,
  });

  const handleLocationGranted = (coords: RouteCoordinate) => {
    setIsPermissionModalOpen(false);
    setMapCenter(coords);
    setLocationLabel('Moja lokalizacja (GPS)');
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

  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const routeRequests = useMemo(
    () =>
      activeRoute
        ? filterRequestsAlongRoute(allRequests, activeRoute.coordinates, ROUTE_BUFFER_METERS)
        : [],
    [activeRoute, allRequests],
  );

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
  const selectedRequest = displayRequests.find((request) => request.id === selectedRequestId);
  const selectedRequestCenter = selectedRequest
    ? toLatLng(selectedRequest.approximateLocation.coordinates)
    : null;

  const handleSelectLocation = (name: string, coordinate: RouteCoordinate) => {
    setMapCenter(coordinate);
    setLocationLabel(name);
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
    const loc = await locate();
    if (loc) {
      setMapCenter(loc);
      setLocationLabel('Moja lokalizacja (GPS)');
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
          <View
            style={[
              styles.activeRouteBadge,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
              Trasa aktywna ({routeRequests.length} po drodze)
            </ThemedText>
            <Pressable onPress={() => setOnlyAlongRoute(!onlyAlongRoute)}>
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
        )}
      </View>

      {/* Main Interactive Map */}
      <MapView
        ref={mapRef}
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
        mapPadding={{
          top: insets.top + (activeRoute ? 110 : 70),
          right: 12,
          bottom: selectedRequest || isSummaryOpen ? 260 : 90,
          left: 12,
        }}>
        <Marker
          coordinate={mapCenter}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={1000}
          tracksViewChanges={false}
          title="Tu jesteś"
          description={locationLabel}
          accessibilityLabel={`Tu jesteś: ${locationLabel}`}>
          <View style={styles.meHalo}>
            <View
              style={[
                styles.meDot,
                { backgroundColor: theme.primary, borderColor: theme.backgroundElement },
              ]}>
              <SvgXml xml={PERSON_SVG} width={20} height={20} />
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
                  style={[styles.requestMarkerHalo, { backgroundColor: theme.backgroundElement }]}>
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

      {/* Floating GPS Button */}
      <View style={[styles.floatingActions, { top: insets.top + (activeRoute ? 120 : 80) }]}>
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
        {locationError && (
          <ThemedView type="backgroundElement" style={styles.errorToast}>
            <ThemedText type="caption" themeColor="warning">
              {locationError}
            </ThemedText>
          </ThemedView>
        )}
      </View>

      {!selectedRequest && !isSummaryOpen && (
        <View style={[styles.leftActions, { top: insets.top + (activeRoute ? 176 : 136) }]}>
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
        <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
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
                  <ThemedText type="smallBold">
                    Najbliżej Ciebie ({displayRequests.length}{' '}
                    {displayRequests.length === 1 ? 'zgłoszenie' : 'zgłoszeń'})
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Promień wyszukiwania i filtry:
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
              {displayRequests.length > 0 && (
                <ScrollView
                  style={styles.nearbyList}
                  contentContainerStyle={styles.nearbyListContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled>
                  {displayRequests.slice(0, 8).map((req) => {
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

              {isPending && <ActivityIndicator color={theme.primary} />}
              {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
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
