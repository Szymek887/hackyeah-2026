import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZES = {
  small: { box: 28, radius: Radius.small, letter: 'smallBold', word: 'defaultBold' },
  large: { box: 48, radius: Radius.medium, letter: 'subtitle', word: 'title' },
} as const;

/** Wordmark "PoDrodze": the square is the "P", followed by "oDrodze". */
export function BrandLogo({ size = 'small' }: { size?: keyof typeof SIZES }) {
  const theme = useTheme();
  const s = SIZES[size];

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="PoDrodze">
      <View
        style={[
          styles.box,
          { width: s.box, height: s.box, borderRadius: s.radius, backgroundColor: theme.primary },
        ]}>
        <ThemedText type={s.letter} themeColor="onPrimary">
          P
        </ThemedText>
      </View>
      <ThemedText type={s.word}>oDrodze</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
