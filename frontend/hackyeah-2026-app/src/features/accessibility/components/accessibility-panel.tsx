import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Radius, Spacing } from '@/constants/theme';
import {
  AgeGroups,
  TextSizeLabels,
  type TextSize,
} from '@/features/accessibility/accessibility-settings';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

const TEXT_SIZES = Object.keys(TextSizeLabels) as TextSize[];

type AccessibilityPanelProps = {
  /** Show the detailed switches right away (profile) instead of behind "Więcej ustawień". */
  expanded?: boolean;
};

/**
 * Age group picker + manual display settings. Every change applies to the whole app at once,
 * so the person immediately sees whether the text is readable for them.
 */
export function AccessibilityPanel({ expanded = false }: AccessibilityPanelProps) {
  const theme = useTheme();
  const { settings, setAgeGroup, updateSettings } = useAccessibility();
  const [showDetails, setShowDetails] = useState(expanded);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Twój wiek
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dopasujemy wielkość tekstu, kontrast i przyciski. Zmienisz to w każdej chwili w profilu.
        </ThemedText>
      </View>

      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Grupa wiekowa">
        {AgeGroups.map((group) => {
          const selected = settings.ageGroup === group.value;
          return (
            <Pressable
              key={group.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${group.label}. ${group.description}`}
              onPress={() => setAgeGroup(group.value)}
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
                  {selected && (
                    <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />
                  )}
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

      {!expanded && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          onPress={() => setShowDetails((current) => !current)}
          style={styles.toggle}>
          <ThemedText type="smallBold" themeColor="primary">
            {showDetails ? '▴ Ukryj ustawienia wyglądu' : '▾ Więcej ustawień: tekst, kontrast'}
          </ThemedText>
        </Pressable>
      )}

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.field}>
            <ThemedText type="smallBold">Wielkość tekstu</ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {TEXT_SIZES.map((size) => (
                <Chip
                  key={size}
                  label={TextSizeLabels[size]}
                  selected={settings.textSize === size}
                  onPress={() => updateSettings({ textSize: size })}
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold">Wygląd i obsługa</ThemedText>
            <View style={styles.chips}>
              <Chip
                mode="checkbox"
                label="Wysoki kontrast"
                selected={settings.highContrast}
                onPress={() => updateSettings({ highContrast: !settings.highContrast })}
              />
              <Chip
                mode="checkbox"
                label="Większe przyciski"
                selected={settings.largeTouchTargets}
                onPress={() => updateSettings({ largeTouchTargets: !settings.largeTouchTargets })}
              />
              <Chip
                mode="checkbox"
                label="Bez animacji"
                selected={settings.reduceMotion}
                onPress={() => updateSettings({ reduceMotion: !settings.reduceMotion })}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
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
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
  details: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
