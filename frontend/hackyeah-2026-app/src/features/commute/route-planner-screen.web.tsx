import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedText } from '@/components/themed-text';

export function RoutePlannerScreen() {
  return (
    <ScreenPlaceholder
      title="Moja trasa"
      owner="FE2"
      tasks={['F2.3 planer trasy + filtr korytarza']}>
      <ThemedText themeColor="textSecondary">
        Planer mobilny używa react-native-maps. Webowy wariant dostanie osobną mapę.
      </ThemedText>
    </ScreenPlaceholder>
  );
}
