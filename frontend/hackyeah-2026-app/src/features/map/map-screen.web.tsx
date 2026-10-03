import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedText } from '@/components/themed-text';
import { useNearbyRequests } from '@/features/requests/hooks';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';

export function MapScreen() {
  const { data = [] } = useNearbyRequests({
    lat: KRAKOW_INITIAL_REGION.latitude,
    lng: KRAKOW_INITIAL_REGION.longitude,
    radiusKm: 5,
  });

  return (
    <ScreenPlaceholder title="Mapa" owner="FE2" tasks={['F2.1 mapa z rozmytymi strefami']}>
      <ThemedText themeColor="textSecondary">
        Mobile map test jest dostępny w Expo Go. Webowy panel miasta dostanie osobną bibliotekę map.
      </ThemedText>
      <ThemedText type="smallBold">Mocki Krakowa: {data.length}</ThemedText>
      <Button title="Zaplanuj trasę" onPress={() => router.push('/route-planner')} />
    </ScreenPlaceholder>
  );
}
