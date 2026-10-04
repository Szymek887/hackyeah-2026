import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

type CheckboxRowProps = {
  label: string;
  /** Shown under the label and read by screen readers as the hint. */
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** Checkbox + label for explicit agreements (e.g. consents), where a switch would read as a setting. */
export function CheckboxRow({ label, description, checked, onChange, disabled }: CheckboxRowProps) {
  const theme = useTheme();
  const { minTouchSize } = useAccessibility();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, { minHeight: minTouchSize, opacity: disabled ? 0.6 : 1 }]}>
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? theme.primary : theme.textSecondary,
            backgroundColor: checked ? theme.primary : 'transparent',
          },
        ]}>
        {checked && (
          <ThemedText type="smallBold" themeColor="onPrimary" style={styles.tick}>
            ✓
          </ThemedText>
        )}
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {description ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  box: {
    width: 26,
    height: 26,
    marginTop: 2,
    borderWidth: 2,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    lineHeight: 18,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
