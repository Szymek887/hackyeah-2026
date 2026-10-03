import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  formatRouteDistance,
  formatRouteDuration,
  ROUTE_BUFFER_METERS,
  simplifyRoute,
  toRouteLineString,
} from '@/features/commute/route-geometry';
import { useDrivingRoute } from '@/features/commute/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { KRAKOW_COMMUTE_ROUTE } from '@/features/map/krakow-map-data';
import { RequestCard } from '@/features/requests/components/request-card';
import { useRequestsAlongRoute } from '@/features/requests/hooks';
import type { RouteCoordinate } from '@/lib/route-matching';
import { PlaceSearchModal } from '@/features/commute/components/place-search-modal';
import { KRAKOW_PRESET_PLACES } from '@/features/commute/krakow-places';

import { LeafletMap } from '../map/leaflet-map';

const DEFAULT_START = KRAKOW_COMMUTE_ROUTE[0];
const DEFAULT_END = KRAKOW_COMMUTE_ROUTE[KRAKOW_COMMUTE_ROUTE.length - 1];

export function RoutePlannerScreen() {
  const theme = useTheme();
  const { savedRoute, setSavedRoute } = useSavedCommuteRoute();

  const [start, setStart] = useState<RouteCoordinate>(savedRoute?.start ?? DEFAULT_START);
  const [end, setEnd] = useState<RouteCoordinate>(savedRoute?.end ?? DEFAULT_END);
  const [startLabel, setStartLabel] = useState<string>(() => {
    const matched = KRAKOW_PRESET_PLACES.find(
      (p) =>
        Math.abs(p.coordinate.latitude - (savedRoute?.start ?? DEFAULT_START).latitude) < 0.002,
    );
    return matched?.name ?? 'AGH / Krowodrza';
  });
  const [endLabel, setEndLabel] = useState<string>(() => {
    const matched = KRAKOW_PRESET_PLACES.find(
      (p) => Math.abs(p.coordinate.latitude - (savedRoute?.end ?? DEFAULT_END).latitude) < 0.002,
    );
    return matched?.name ?? 'Kazimierz / Podgórze';
  });

  const [searchTarget, setSearchTarget] = useState<'start' | 'end' | null>(null);
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

  const resetRoute = () => {
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setStartLabel('AGH / Krowodrza');
    setEndLabel('Kazimierz / Podgórze');
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
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Moja trasa</ThemedText>
        <ThemedText themeColor="textSecondary">
          Wyszukaj punkt startowy i cel podróży w Krakowie, aby zobaczyć prośby po drodze.
        </ThemedText>
      </View>

      <Card style={styles.editor}>
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
              <View style={styles.addressTextWrapper}>
                <ThemedText type="caption" themeColor="textSecondary">
                  START (A)
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {startLabel}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Zmień
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setSearchTarget('end')}
              style={({ pressed }) => [
                styles.addressButton,
                { backgroundColor: theme.backgroundMuted, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <View style={styles.addressTextWrapper}>
                <ThemedText type="caption" themeColor="textSecondary">
                  CEL (B)
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {endLabel}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Zmień
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
        editableRoute={false}
        routeCoordinates={route}
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

      {matchingRequests.length > 0 && (
        <View style={styles.results}>
          <ThemedText type="subtitle">Komu możesz pomóc</ThemedText>
          {matchingRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
            />
          ))}
        </View>
      )}

      {/* Search Modal */}
      <PlaceSearchModal
        visible={Boolean(searchTarget)}
        title={searchTarget === 'start' ? 'Wybierz punkt startowy (A)' : 'Wybierz cel podróży (B)'}
        onClose={() => setSearchTarget(null)}
        onSelect={handleSelectPlace}
      />
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
    height: 36,
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
  addressTextWrapper: {
    flex: 1,
    gap: 1,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  pressed: {
    opacity: 0.7,
  },
});
