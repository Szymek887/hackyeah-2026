import { useSession } from '@/features/auth/session-context';
import { MyRequestsScreen } from '@/features/tasks/my-requests-screen';
import { TasksScreen } from '@/features/tasks/tasks-screen';

export default function TasksRoute() {
  const { role } = useSession();
  // A person who needs help gets a calm overview of their requests; volunteers their task screen.
  return role === 'VOLUNTEER' ? <TasksScreen /> : <MyRequestsScreen />;
}
