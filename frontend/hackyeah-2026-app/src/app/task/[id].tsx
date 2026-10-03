import { useLocalSearchParams } from 'expo-router';

import { ActiveTaskView } from '@/features/handoff/active-task-view';

export default function ActiveTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ActiveTaskView requestId={Number(id)} />;
}
