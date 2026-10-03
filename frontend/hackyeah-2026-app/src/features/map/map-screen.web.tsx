import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ROUTE_BUFFER_METERS } from '@/features/commute/route-geometry';
import { LeafletMap } from '@/features/map/leaflet-map';
import { useNearbyRequests } from '@/features/requests/hooks';
import { filterRequestsAlongRoute } from '@/lib/route-matching';
import { CategoryLabels, PriorityLabels } from '@/features/requests/labels';
import { KRAKOW_COMMUTE_ROUTE, KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';

export function MapScreen() {
  const { data = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });
  const matchingRequests = filterRequestsAlongRoute(
    data,
    KRAKOW_COMMUTE_ROUTE,
    ROUTE_BUFFER_METERS,
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Mapa</ThemedText>
        <ThemedText themeColor="textSecondary">
          Zgłoszenia w Krakowie są grupowane, żeby mapa pozostała czytelna.
        </ThemedText>
      </View>

      <LeafletMap matchingRequests={matchingRequests} requests={data} />

      <Card highlighted style={styles.stats}>
        <ThemedText type="smallBold">Pasujące do trasy: {matchingRequests.length}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Kliknij grupę, aby ją przybliżyć, a punkt, aby zobaczyć przybliżoną strefę.
        </ThemedText>
      </Card>

      <View style={styles.list}>
        {matchingRequests.map((request) => (
          <Card key={request.id}>
            <ThemedText type="smallBold">{request.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {CategoryLabels[request.category]}, {PriorityLabels[request.priority].toLowerCase()}
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
