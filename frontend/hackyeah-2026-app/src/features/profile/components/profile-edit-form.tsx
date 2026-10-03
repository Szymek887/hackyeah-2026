import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Category, LanguageCode, UserProfile } from '@/api/types';
import type { ProfileDetails } from '@/features/profile/profile-details';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { NeedsPicker } from '@/features/accessibility/components/needs-picker';
import { COMMON_LANGUAGES, languageName } from '@/features/profile/languages';
import { CategoryLabels } from '@/features/requests/labels';

const CATEGORIES = Object.keys(CategoryLabels) as Category[];

type ProfileEditFormProps = {
  user: UserProfile;
  profile: ProfileDetails;
  onSave: (profile: ProfileDetails, languages: LanguageCode[]) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
};

export function ProfileEditForm({
  user,
  profile,
  onSave,
  onCancel,
  saving = false,
  error,
}: ProfileEditFormProps) {
  const [draft, setDraft] = useState<ProfileDetails>(profile);
  const [languages, setLanguages] = useState<LanguageCode[]>(
    user.languages.length > 0 ? user.languages : ['pl'],
  );
  const isVolunteer = user.role === 'VOLUNTEER';
  // Keep codes the user already has even if they are not on the short list.
  const languageOptions = [...new Set([...COMMON_LANGUAGES, ...user.languages])];

  const set = <K extends keyof ProfileDetails>(key: K, value: ProfileDetails[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleTopic = (topic: Category) =>
    set(
      'helpTopics',
      draft.helpTopics.includes(topic)
        ? draft.helpTopics.filter((t) => t !== topic)
        : [...draft.helpTopics, topic],
    );

  const toggleLanguage = (code: LanguageCode) =>
    setLanguages((current) =>
      current.includes(code)
        ? // The backend requires at least one language.
          current.length > 1
          ? current.filter((c) => c !== code)
          : current
        : [...current, code],
    );

  return (
    <Card style={styles.card}>
      <ThemedText type="subtitle" accessibilityRole="header">
        Edytuj profil
      </ThemedText>

      <Input
        label="O mnie"
        placeholder="Kim jesteś? Co warto o Tobie wiedzieć?"
        multiline
        maxLength={500}
        value={draft.about}
        onChangeText={(text) => set('about', text)}
      />

      <View style={styles.field}>
        <ThemedText type="smallBold">Języki, którymi mówisz</ThemedText>
        <View style={styles.chips}>
          {languageOptions.map((code) => (
            <Chip
              key={code}
              mode="checkbox"
              label={languageName(code)}
              selected={languages.includes(code)}
              onPress={() => toggleLanguage(code)}
            />
          ))}
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          Pomaga dobrać osoby, które się dogadają. Wybierz co najmniej jeden.
        </ThemedText>
      </View>

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

      <NeedsPicker
        disabilities={draft.disabilities}
        onDisabilitiesChange={(value) => set('disabilities', value)}
        notes={draft.accessibilityNotes}
        onNotesChange={(text) => set('accessibilityNotes', text)}
      />

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

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Button
          title={saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          inline
          disabled={saving}
          onPress={() => onSave(draft, languages)}
        />
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
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
