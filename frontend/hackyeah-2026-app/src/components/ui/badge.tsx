import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeProps = {
  label: string;
  /** Text / dot color. Defaults to primary. */
  color?: string;
  /** Background tint. Defaults to primarySoft. */
  backgroundColor?: string;
  dot?: boolean;
};

export function Badge({ label, color, backgroundColor, dot = false }: BadgeProps) {
  const theme = useTheme();
  const textColor = color ?? theme.primary;

  return (
    <View style={[styles.badge, { backgroundColor: backgroundColor ?? theme.primarySoft }]}>
      {dot && <View style={[styles.dot, { backgroundColor: textColor }]} />}
      <ThemedText type="caption" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
