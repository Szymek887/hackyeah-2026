import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const STAR_COLOR = '#F2B544';

type RatingStarsProps = {
  value: number;
  count?: number;
};

/** Read-only star rating, e.g. "★★★★☆ 4.2 (12)". */
export function RatingStars({ value, count }: RatingStarsProps) {
  const rounded = Math.round(value);

  return (
    <View style={styles.row}>
      <ThemedText type="small" style={{ color: STAR_COLOR }}>
        {'★'.repeat(rounded)}
        {'☆'.repeat(5 - rounded)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
