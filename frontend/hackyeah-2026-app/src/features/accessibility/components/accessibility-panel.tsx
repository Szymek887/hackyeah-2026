import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { AgeGroups } from '@/features/accessibility/accessibility-settings';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

/**
 * Age group picker. The choice alone sets text size, contrast and button size for the whole app
 * and applies at once, so the person immediately sees whether the text is readable for them.
 */
export function AccessibilityPanel({ onChange }: { onChange?: () => void }) {
  const theme = useTheme();
  const { settings, setAgeGroup } = useAccessibility();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Grupa wiekowa">
      {AgeGroups.map((group) => {
        const selected = settings.ageGroup === group.value;
        return (
          <Pressable
            key={group.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${group.label}. ${group.description}`}
            onPress={() => {
              setAgeGroup(group.value);
              onChange?.();
            }}
            style={(state) => {
              const { hovered, focused } = state as typeof state & {
                hovered?: boolean;
                focused?: boolean;
              };
              return [
                styles.tile,
                {
                  borderColor: selected || focused ? theme.primary : theme.border,
                  backgroundColor: selected
                    ? theme.primarySoft
                    : hovered
                      ? theme.backgroundMuted
                      : theme.backgroundElement,
                  borderWidth: selected || focused ? 2.5 : 1.5,
                },
              ];
            }}>
            <View style={styles.tileHeader}>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? theme.primary : theme.textSecondary },
                ]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <ThemedText type="defaultBold" themeColor={selected ? 'primary' : 'text'}>
                {group.label}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {group.description}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 180,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
