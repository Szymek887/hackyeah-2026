import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { Disabilities, type DisabilityType } from '@/features/accessibility/accessibility-settings';

type NeedsPickerProps = {
  disabilities: DisabilityType[];
  onDisabilitiesChange: (disabilities: DisabilityType[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
};

/**
 * Optional self-description of a disability and extra needs ("dzwonić dłużej", "4. piętro bez
 * windy"). Shown only to the volunteer whose help the person accepted.
 */
export function NeedsPicker({
  disabilities,
  onDisabilitiesChange,
  notes,
  onNotesChange,
}: NeedsPickerProps) {
  const toggle = (value: DisabilityType) =>
    onDisabilitiesChange(
      disabilities.includes(value)
        ? disabilities.filter((d) => d !== value)
        : [...disabilities, value],
    );

  const hint = Disabilities.filter((d) => disabilities.includes(d.value))
    .map((d) => d.hint)
    .join('; ');

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Niepełnosprawność i szczególne potrzeby (opcjonalnie)
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Zaznacz, jeśli coś utrudnia Ci codzienne sprawy. Twoje prośby dostaną wyższy priorytet, a
          aplikacja dopasuje wygląd.
        </ThemedText>
      </View>

      <View style={styles.chips}>
        {Disabilities.map((d) => (
          <Chip
            key={d.value}
            mode="checkbox"
            label={d.label}
            selected={disabilities.includes(d.value)}
            onPress={() => toggle(d.value)}
          />
        ))}
      </View>

      <Input
        label="Dodatkowe potrzeby"
        placeholder={
          hint ? `Np. ${hint}` : 'np. proszę dzwonić dłużej, mieszkam na 4. piętrze bez windy'
        }
        multiline
        maxLength={300}
        value={notes}
        onChangeText={onNotesChange}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        Widoczne tylko dla wolontariusza, którego pomoc zaakceptujesz.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
