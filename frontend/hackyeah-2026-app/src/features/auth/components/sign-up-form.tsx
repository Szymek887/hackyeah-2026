import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import type { CreateUserDto } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import type { DisabilityType } from '@/features/accessibility/accessibility-settings';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { NeedsPicker } from '@/features/accessibility/components/needs-picker';
import { useAuth } from '@/features/auth/session-context';

const DISPLAY_NAME_MAX = 60;

/** `POST /api/users` – a new, unverified account. The account type is chosen above the form. */
export function SignUpForm({ role }: { role: CreateUserDto['role'] }) {
  const { signUp } = useAuth();
  const { applyDisabilities } = useAccessibility();
  const [displayName, setDisplayName] = useState('');
  const [disabilities, setDisabilities] = useState<DisabilityType[]>([]);
  const [needsNotes, setNeedsNotes] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    const name = displayName.trim();
    if (!name) {
      setNameError('Wpisz imię, np. „Anna K.”.');
      return;
    }
    setNameError(undefined);
    setError(null);
    setPending(true);
    try {
      const notes = needsNotes.trim();
      const specialNeeds = disabilities.length > 0 || notes.length > 0;
      await signUp(
        { displayName: name, role, specialNeeds: role === 'REQUESTER' && specialNeeds },
        { disabilities, accessibilityNotes: notes },
      );
      // E.g. a visual impairment switches on large text and high contrast right away.
      applyDisabilities(disabilities);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.displayName) {
        setNameError('Imię jest za długie albo puste.');
      } else if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setError('Serwer nie obsługuje jeszcze zakładania kont. Wybierz istniejące konto.');
      } else {
        setError(errorMessage(err));
      }
      setPending(false);
    }
  };

  return (
    <View style={styles.form}>
      <Input
        label="Imię i pierwsza litera nazwiska"
        placeholder="np. Anna K."
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX}
        value={displayName}
        onChangeText={(text) => {
          setDisplayName(text);
          setNameError(undefined);
        }}
        onSubmitEditing={handleSubmit}
        error={nameError}
      />

      <NeedsPicker
        disabilities={disabilities}
        onDisabilitiesChange={setDisabilities}
        notes={needsNotes}
        onNotesChange={setNeedsNotes}
      />

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      )}

      <Button
        title={pending ? 'Zakładanie konta…' : 'Załóż konto i zaloguj'}
        size="large"
        disabled={pending}
        onPress={handleSubmit}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        Nowe konto jest niezweryfikowane. Weryfikacja przez mObywatel pojawi się później.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
});
