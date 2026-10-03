import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { filterRequestsAlongRoute } from '@/features/commute/route-matching';
import { KRAKOW_COMMUTE_ROUTE, KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';
import { useNearbyRequests } from '@/features/requests/hooks';

import { LeafletMap } from '../map/leaflet-map';

export function RoutePlannerScreen() {
  const { data: requests = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });
  const matchingRequests = filterRequestsAlongRoute(requests, KRAKOW_COMMUTE_ROUTE, 450);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="subtitle">Moja trasa</ThemedText>
        <ThemedText themeColor="textSecondary">
          Test filtra korytarza na mockach. Docelowo punkty trasy podamy z formularza.
        </ThemedText>
      </View>

      <LeafletMap
        matchingRequests={matchingRequests}
        requests={requests}
        showAreas={false}
        showRouteBuffer
      />

      <Card highlighted>
        <ThemedText type="smallBold">
          W korytarzu 450 m: {matchingRequests.length}/{requests.length}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          To jest frontendowy fallback na mockach, dopóki backend nie wystawi endpointu wzdłuż
          trasy.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
});
