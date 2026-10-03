import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';

export default function MapScreen() {
  return (
    <ScreenPlaceholder title="Mapa" owner="FE2" tasks={['F2.1 mapa z rozmytymi strefami']}>
      <Button title="Zaplanuj trasę" onPress={() => router.push('/route-planner')} />
    </ScreenPlaceholder>
  );
}
