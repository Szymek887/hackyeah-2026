import { StyleSheet, View } from 'react-native';

import type { UserProfile } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';
import { Radius, Spacing } from '@/constants/theme';
import { RoleLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function ProfileHeader({ user }: { user: UserProfile }) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
        <ThemedText type="subtitle" themeColor="primary">
          {initials(user.displayName)}
        </ThemedText>
      </View>

      <View style={styles.info}>
        <ThemedText type="subtitle">{user.displayName}</ThemedText>
        {user.role !== 'CITY_ADMIN' && user.ratingAverage !== null && (
          <RatingStars value={user.ratingAverage} count={user.ratingCount} />
        )}
        <View style={styles.badges}>
          <Badge label={RoleLabels[user.role]} />
          {user.identityVerified ? (
            <Badge
              dot
              label="Zweryfikowany"
              color={theme.success}
              backgroundColor={theme.successSoft}
            />
          ) : (
            <Badge
              label="Niezweryfikowany"
              color={theme.textSecondary}
              backgroundColor={theme.backgroundMuted}
            />
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
