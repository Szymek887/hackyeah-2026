import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Category, User, UserProfileDetails } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { CategoryLabels } from '@/features/requests/labels';

const CATEGORIES = Object.keys(CategoryLabels) as Category[];

type ProfileEditFormProps = {
  user: User;
  onSave: (profile: UserProfileDetails) => void;
  onCancel: () => void;
};

export function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const [draft, setDraft] = useState<UserProfileDetails>(user.profile);
  const isVolunteer = user.role === 'VOLUNTEER';

  const set = <K extends keyof UserProfileDetails>(key: K, value: UserProfileDetails[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleTopic = (topic: Category) =>
    set(
      'helpTopics',
      draft.helpTopics.includes(topic)
        ? draft.helpTopics.filter((t) => t !== topic)
        : [...draft.helpTopics, topic],
    );

  return (
    <Card style={styles.card}>
      <ThemedText type="subtitle">Edytuj profil</ThemedText>

      <Input
        label="O mnie"
        placeholder="Kim jesteś? Co warto o Tobie wiedzieć?"
        multiline
        maxLength={500}
        value={draft.about}
        onChangeText={(text) => set('about', text)}
      />

      <View style={styles.field}>
        <ThemedText type="smallBold">
          {isVolunteer ? 'W czym możesz pomóc' : 'W czym zwykle potrzebujesz pomocy'}
        </ThemedText>
        <View style={styles.chips}>
          {CATEGORIES.map((topic) => (
            <Chip
              key={topic}
              mode="checkbox"
              label={CategoryLabels[topic]}
              selected={draft.helpTopics.includes(topic)}
              onPress={() => toggleTopic(topic)}
            />
          ))}
        </View>
      </View>

      {!isVolunteer && (
        <Input
          label="Wsparcie dostępności"
          placeholder="np. chodzę o kulach, słabo słyszę dzwonek"
          multiline
          maxLength={300}
          value={draft.accessibilityNotes}
          onChangeText={(text) => set('accessibilityNotes', text)}
        />
      )}

      <Input
        label="Dzielnica"
        placeholder="np. Krowodrza"
        value={draft.district}
        onChangeText={(text) => set('district', text)}
      />
      <Input
        label={isVolunteer ? 'Kiedy możesz pomagać' : 'Kiedy jesteś w domu'}
        placeholder="np. pon–pt po 16:00"
        value={draft.availability}
        onChangeText={(text) => set('availability', text)}
      />

      <View style={styles.actions}>
        <Button title="Zapisz zmiany" inline onPress={() => onSave(draft)} />
        <Button title="Anuluj" variant="ghost" inline onPress={onCancel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
