import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DisabilityType } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radius, Spacing } from '@/constants/theme';
import { Disabilities } from '@/features/accessibility/accessibility-settings';
import { useTheme } from '@/hooks/use-theme';

/** Same limits as the backend's `SpecialNeedNotes`. */
const MAX_NOTES = 10;
const MAX_NOTE_LENGTH = 200;

type SpecialNeedNotesEditorProps = {
  notes: string[];
  onChange: (notes: string[]) => void;
  /** Chosen disabilities – their hints suggest what to write. */
  disabilities?: DisabilityType[];
  disabled?: boolean;
};

/**
 * Special needs in the person's own words, extending the disabilities ("Nie słyszę pukania – proszę
 * dzwonić na telefon"). One short note per need, so the volunteer can read them at a glance.
 */
export function SpecialNeedNotesEditor({
  notes,
  onChange,
  disabilities = [],
  disabled,
}: SpecialNeedNotesEditorProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();
  const canAdd = !disabled && trimmed.length > 0 && notes.length < MAX_NOTES;

  const add = () => {
    if (!canAdd) return;
    if (!notes.includes(trimmed)) onChange([...notes, trimmed]);
    setDraft('');
  };

  const hint = Disabilities.filter((d) => disabilities.includes(d.value))
    .map((d) => d.hint)
    .join('; ');

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Szczególne potrzeby</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Napisz, na co wolontariusz powinien zwrócić uwagę – każdą potrzebę osobno.
      </ThemedText>

      {notes.map((note) => (
        <View
          key={note}
          style={[
            styles.note,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText style={styles.noteText}>{note}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Usuń: ${note}`}
            disabled={disabled}
            onPress={() => onChange(notes.filter((n) => n !== note))}
            hitSlop={8}
            style={styles.remove}>
            <ThemedText type="smallBold" themeColor="danger">
              Usuń
            </ThemedText>
          </Pressable>
        </View>
      ))}

      {notes.length < MAX_NOTES && (
        <View style={styles.addRow}>
          <View style={styles.input}>
            <Input
              placeholder={hint ? `Np. ${hint}` : 'np. nie słyszę pukania – proszę zadzwonić'}
              maxLength={MAX_NOTE_LENGTH}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              editable={!disabled}
              accessibilityLabel="Nowa szczególna potrzeba"
            />
          </View>
          <Button title="Dodaj" variant="secondary" inline disabled={!canAdd} onPress={add} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
  },
  remove: {
    paddingHorizontal: Spacing.one,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
  },
});
