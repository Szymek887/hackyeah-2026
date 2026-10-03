import { useLocalSearchParams } from 'expo-router';

import { RequestDetailsScreen } from '@/features/requests/request-details-screen';

export default function RequestDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequestDetailsScreen id={Number(id)} />;
}
