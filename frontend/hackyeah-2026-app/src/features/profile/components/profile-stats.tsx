import { StyleSheet, View } from 'react-native';

import type { UserProfile } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

export function ProfileStats({ user }: { user: UserProfile }) {
  const stats = [
    { label: 'Zaufanie', value: `${user.trustScore}%` },
    { label: 'Punkty miejskie', value: String(user.cityPoints) },
    { label: 'Oceny', value: String(user.ratingCount) },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Card key={stat.label} style={styles.stat}>
          <ThemedText type="subtitle" themeColor="primary">
            {stat.value}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {stat.label}
          </ThemedText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
