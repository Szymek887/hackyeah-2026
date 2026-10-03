import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToggleRowProps = {
  label: string;
  /** Shown under the label and read by screen readers as the hint. */
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * Label + on/off slider, like the alarm switch in phone settings (native `Switch`).
 * The switch itself is the accessible element ("switch, on/off"), so it is not wrapped in a
 * pressable row – on web that would toggle twice per click.
 */
export function ToggleRow({ label, description, value, onValueChange, disabled }: ToggleRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {description ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: theme.border, true: theme.primary }}
        ios_backgroundColor={theme.border}
        // White thumb on both tracks, as in system settings (theme.onPrimary is dark in dark mode).
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
