import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, Polygon } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryColors, PriorityColors, Spacing } from '@/constants/theme';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import { clusterRequests, zoomFromLongitudeDelta } from '@/features/map/map-clustering';
import { useNearbyRequests } from '@/features/requests/hooks';
import { useTheme } from '@/hooks/use-theme';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';

export function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mapZoom, setMapZoom] = useState(() =>
    zoomFromLongitudeDelta(KRAKOW_INITIAL_REGION.longitudeDelta),
  );
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const {
    data: requests = [],
    isPending,
    error,
  } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });
  const requestClusters = useMemo(() => clusterRequests(requests, mapZoom), [mapZoom, requests]);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const selectedAreaRings = selectedRequest ? getAreaPolygonRings(selectedRequest.maskedArea) : [];
  const [selectedOuterRing, ...selectedHoles] = selectedAreaRings;

  return (
    <ThemedView style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        showsCompass
        showsScale
        onRegionChangeComplete={(region) =>
          setMapZoom(zoomFromLongitudeDelta(region.longitudeDelta))
        }
        mapPadding={{ top: insets.top + 8, right: 12, bottom: 160, left: 12 }}>
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
                onPress={() =>
                  mapRef.current?.animateCamera({
                    center: cluster.coordinate,
                    zoom: Math.min(18, mapZoom + 2),
                  })
                }>
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
              onPress={() => setSelectedRequestId(request.id)}>
              <View
                style={[
                  styles.requestMarker,
                  {
                    backgroundColor: CategoryColors[request.category].color,
                    borderColor: PriorityColors[request.priority].color,
                  },
                ]}
              />
              <Callout>
                <View style={styles.callout}>
                  <ThemedText type="smallBold">{request.title}</ThemedText>
                  <ThemedText type="small">Priorytet {request.priority}</ThemedText>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Krakow: {requests.length} zgłoszenia w pobliżu</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Przybliż, aby rozdzielić grupy. Strefa pojawi się po wybraniu zgłoszenia.
          </ThemedText>
          {isPending && <ActivityIndicator color={theme.primary} />}
          {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
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
