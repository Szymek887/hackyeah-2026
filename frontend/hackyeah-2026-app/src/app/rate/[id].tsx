import { useLocalSearchParams } from 'expo-router';

import { RateView } from '@/features/handoff/rate-view';

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <RateView requestId={id ?? 'r-1'} />;
}
