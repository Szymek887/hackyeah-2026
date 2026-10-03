import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** Optional counter shown next to the label. */
  count?: number;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={styles.option}>
            {active && (
              <Animated.View
                entering={enterScreen}
                style={[
                  StyleSheet.absoluteFill,
                  styles.indicator,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}
              />
            )}
            <ThemedText type="smallBold" themeColor={active ? 'primary' : 'textSecondary'}>
              {option.label}
            </ThemedText>
            {option.count !== undefined && (
              <View
                style={[
                  styles.count,
                  { backgroundColor: active ? theme.primarySoft : theme.backgroundSelected },
                ]}>
                <ThemedText type="caption" themeColor={active ? 'primary' : 'textSecondary'}>
                  {option.count}
                </ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.two,
  },
  indicator: {
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
});
