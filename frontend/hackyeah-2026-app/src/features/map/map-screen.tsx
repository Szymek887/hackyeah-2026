import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, Geojson, Polygon, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import { useNearbyRequests } from '@/features/requests/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  KRAKOW_CENTER_GEOJSON,
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  toLatLng,
} from '@/features/map/krakow-map-data';

export function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    data: requests = [],
    isPending,
    error,
  } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  return (
    <ThemedView style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        showsCompass
        showsScale
        mapPadding={{ top: insets.top + 8, right: 12, bottom: 160, left: 12 }}>
        <Geojson
          geojson={KRAKOW_CENTER_GEOJSON}
          strokeColor={theme.primary}
          fillColor={`${theme.primary}1A`}
          strokeWidth={2}
        />

        <Polyline
          coordinates={KRAKOW_COMMUTE_ROUTE}
          strokeColor={theme.primary}
          strokeWidth={4}
          lineDashPattern={[8, 6]}
        />

        {requests.map((request) => {
          const coordinate = toLatLng(request.area.center.coordinates);
          const categoryColor = CategoryColors[request.category];
          const priorityColor = PriorityColors[request.priority];
          const [outerRing, ...holes] = getAreaPolygonRings(request.area);

          return (
            <Fragment key={request.id}>
              <Polygon
                coordinates={outerRing}
                holes={holes}
                fillColor={`${categoryColor.color}33`}
                strokeColor={categoryColor.color}
                strokeWidth={2}
              />
              <Marker coordinate={coordinate} pinColor={priorityColor.color}>
                <Callout>
                  <View style={styles.callout}>
                    <ThemedText type="smallBold">{request.title}</ThemedText>
                    <ThemedText type="small">Priorytet {request.priority}</ThemedText>
                  </View>
                </Callout>
              </Marker>
            </Fragment>
          );
        })}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Krakow: {requests.length} zgłoszenia w pobliżu</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Obszary pokazują przybliżone strefy, a linia testową trasę wolontariusza.
          </ThemedText>
          {isPending && <ActivityIndicator color={theme.primary} />}
          {error && <ThemedText themeColor="danger">{error.message}</ThemedText>}
        </ThemedView>
        <Button title="Zaplanuj trasę" onPress={() => router.push('/route-planner')} />
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
    gap: Spacing.two,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  callout: {
    gap: Spacing.half,
    maxWidth: 220,
  },
});
