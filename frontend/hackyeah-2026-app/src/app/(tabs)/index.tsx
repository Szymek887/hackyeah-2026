import { useSession } from '@/features/auth/session-context';
import { MapScreen } from '@/features/map/map-screen';
import { TasksScreen } from '@/features/tasks/tasks-screen';

export default function MapRoute() {
  const { role } = useSession();
  // Requesters' home is "Moje prośby".
  if (role !== 'VOLUNTEER') return <TasksScreen />;
  return <MapScreen />;
}
