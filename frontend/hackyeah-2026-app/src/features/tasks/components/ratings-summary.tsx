import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';
import { Spacing } from '@/constants/theme';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { useMyReputation } from '@/features/tasks/hooks';

/** Header of the "Oceny" tab: how others rated me (no endpoint lists single ratings yet). */
export function RatingsSummary({ ratedCount }: { ratedCount: number }) {
  const { data: user } = useMyReputation();
  if (!user) return null;

  return (
    <View style={styles.container}>
      <Card highlighted>
        <ThemedText type="smallBold">Jak oceniają Cię inni</ThemedText>
        {user.ratingAverage !== null ? (
          <>
            <ThemedText type="title">{user.ratingAverage.toFixed(1)}</ThemedText>
            <RatingStars value={user.ratingAverage} count={user.ratingCount} />
          </>
        ) : (
          <ThemedText themeColor="textSecondary">
            Nie masz jeszcze ocen. Pojawią się, gdy druga strona oceni wspólne zadanie.
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          Zadania ocenione przez obie strony: {ratedCount}
        </ThemedText>
      </Card>
      <ProfileStats user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});
