import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { useRequest } from '@/features/requests/hooks';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending } = useRequest(id);

  return (
    <ScreenPlaceholder
      title="Szczegóły zgłoszenia"
      owner="FE1"
      tasks={['F2.4 szczegóły + „Chcę pomóc”']}>
      {isPending ? <ActivityIndicator /> : <ThemedText>{data?.description}</ThemedText>}
    </ScreenPlaceholder>
  );
}
