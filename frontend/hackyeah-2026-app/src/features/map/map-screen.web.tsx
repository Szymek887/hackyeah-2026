import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { LeafletMap } from '@/features/map/leaflet-map';
import { useNearbyRequests } from '@/features/requests/hooks';
import { filterRequestsAlongRoute } from '@/lib/route-matching';
import {
  KRAKOW_CENTER_GEOJSON,
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
} from '@/features/map/krakow-map-data';

export function MapScreen() {
  const { data = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });
  const matchingRequests = filterRequestsAlongRoute(data, KRAKOW_COMMUTE_ROUTE, 450);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Mapa</ThemedText>
        <ThemedText themeColor="textSecondary">
          Webowy test Leaflet: Krakow, rozmyte strefy i trasa wolontariusza.
        </ThemedText>
      </View>

      <LeafletMap
        centerGeoJson={KRAKOW_CENTER_GEOJSON}
        matchingRequests={matchingRequests}
        requests={data}
      />

      <Card highlighted style={styles.stats}>
        <ThemedText type="smallBold">Pasujące do trasy: {matchingRequests.length}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Filtr liczy dystans zgłoszenia od polilinii i wybiera prośby w buforze 450 m.
        </ThemedText>
      </Card>

      <View style={styles.list}>
        {matchingRequests.map((request) => (
          <Card key={request.id}>
            <ThemedText type="smallBold">{request.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Priorytet {request.priority} · {request.tags.join(', ')}
            </ThemedText>
          </Card>
        ))}
      </View>

      <Button title="Zaplanuj trasę" onPress={() => router.push('/route-planner')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  stats: {
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
});
