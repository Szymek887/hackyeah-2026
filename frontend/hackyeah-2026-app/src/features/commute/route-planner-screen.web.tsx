import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { KRAKOW_COMMUTE_LINE } from '@/features/map/krakow-map-data';
import { useRequestsAlongRoute } from '@/features/requests/hooks';

import { LeafletMap } from '../map/leaflet-map';

export function RoutePlannerScreen() {
  const {
    data: matchingRequests = [],
    isPending,
    error,
  } = useRequestsAlongRoute({
    route: KRAKOW_COMMUTE_LINE,
    bufferMeters: 450,
  });

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
        requests={matchingRequests}
        showAreas={false}
        showRouteBuffer
      />

      <Card highlighted>
        <ThemedText type="smallBold">W korytarzu 450 m: {matchingRequests.length}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Na mockach filtr działa po stronie frontendu, a z backendem używa PostGIS endpointu
          /api/help-requests/along-route.
        </ThemedText>
        {isPending && <ThemedText type="small">Szukam zgłoszeń przy trasie...</ThemedText>}
        {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
});
