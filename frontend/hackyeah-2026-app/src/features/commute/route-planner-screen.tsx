import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryColors, Spacing } from '@/constants/theme';
import { useNearbyRequests } from '@/features/requests/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  KRAKOW_ROUTE_BUFFER,
  toLatLng,
} from '@/features/map/krakow-map-data';

export function RoutePlannerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: requests = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  return (
    <ThemedView style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={KRAKOW_INITIAL_REGION}
        mapPadding={{ top: insets.top + 8, right: 12, bottom: 128, left: 12 }}>
        <Polygon
          coordinates={KRAKOW_ROUTE_BUFFER}
          fillColor={`${theme.primary}1F`}
          strokeColor={`${theme.primary}99`}
          strokeWidth={2}
        />
        <Polyline coordinates={KRAKOW_COMMUTE_ROUTE} strokeColor={theme.primary} strokeWidth={5} />
        {KRAKOW_COMMUTE_ROUTE.map((coordinate, index) => (
          <Marker
            key={`${coordinate.latitude}-${coordinate.longitude}`}
            coordinate={coordinate}
            title={index === 0 ? 'Start' : index === KRAKOW_COMMUTE_ROUTE.length - 1 ? 'Cel' : ''}
          />
        ))}
        {requests.map((request) => (
          <Marker
            key={request.id}
            coordinate={toLatLng(request.area.center.coordinates)}
            pinColor={CategoryColors[request.category]}
            title={request.title}
          />
        ))}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Test korytarza trasy</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Niebieski obszar to bufor do filtrowania zgłoszeń po drodze.
          </ThemedText>
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
    gap: Spacing.one,
  },
});
