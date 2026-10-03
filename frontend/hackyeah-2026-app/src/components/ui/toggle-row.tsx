import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const THUMB_COLOR = '#FFFFFF';

/**
 * react-native-web colors the "on" thumb with `activeThumbColor` (teal by default) and ignores
 * `thumbColor` there. The prop is web-only and missing from the RN types, hence the cast.
 */
const webThumbProps = (Platform.OS === 'web' ? { activeThumbColor: THUMB_COLOR } : {}) as object;

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
        // Off track uses textSecondary: ≥ 3:1 against the card in every theme (WCAG 1.4.11);
        // `border` was nearly invisible in dark mode.
        trackColor={{ false: theme.textSecondary, true: theme.primary }}
        ios_backgroundColor={theme.textSecondary}
        // White thumb in both states, as in system settings (theme.onPrimary is dark in dark mode).
        thumbColor={THUMB_COLOR}
        {...webThumbProps}
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
