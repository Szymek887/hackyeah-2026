import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Small marker, e.g. "Sugestia AI". */
  hint?: string;
  /** checkbox for multi-select groups, radio for single-select. */
  mode?: 'radio' | 'checkbox';
};

/** Selectable pill used for categories and other short option lists. */
export function Chip({ label, selected, onPress, hint, mode = 'radio' }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={mode}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.chip,
          {
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected
              ? theme.primarySoft
              : hovered
                ? theme.backgroundMuted
                : theme.backgroundElement,
          },
        ];
      }}>
      <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
        {label}
      </ThemedText>
      {hint && (
        <View style={[styles.hint, { backgroundColor: theme.primary }]}>
          <ThemedText type="caption" themeColor="onPrimary">
            {hint}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  hint: {
    paddingHorizontal: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
  },
});
