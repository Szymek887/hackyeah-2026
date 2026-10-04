import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session-context';
import { startScreen } from '@/features/home/start-screen-store';
import { MapScreen } from '@/features/map/map-screen';

export default function MapRoute() {
  const { role, user } = useSession();
  // Requesters have no map tab: right after login they see the big "Potrzebuję pomocy" screen,
  // later (on phones) their home is "Moje prośby".
  if (role !== 'VOLUNTEER') {
    return <Redirect href={startScreen.isAvailable(user.id) ? '/start' : '/tasks'} />;
  }
  return <MapScreen />;
}
