import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session-context';
import { MapScreen } from '@/features/map/map-screen';

export default function MapRoute() {
  const { role } = useSession();
  // Requesters have no map tab – they start on the big "Poproś o pomoc" screen.
  if (role !== 'VOLUNTEER') return <Redirect href="/start" />;
  return <MapScreen />;
}
