import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import type { CreateUserDto } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CheckboxRow } from '@/components/ui/checkbox-row';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import type { DisabilityType } from '@/features/accessibility/accessibility-settings';
import { NeedsPicker } from '@/features/accessibility/components/needs-picker';
import { SpecialNeedNotesEditor } from '@/features/accessibility/components/special-need-notes-editor';
import { useAuth } from '@/features/auth/session-context';

const DISPLAY_NAME_MAX = 60;

/** `POST /api/users` – a new, unverified account. The account type is chosen above the form. */
export function SignUpForm({ role }: { role: CreateUserDto['role'] }) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [consent, setConsent] = useState(false);
  const [disabilities, setDisabilities] = useState<DisabilityType[]>([]);
  const [needsNotes, setNeedsNotes] = useState('');
  const [specialNeedNotes, setSpecialNeedNotes] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRequester = role === 'REQUESTER';
  // Requesters may describe a disability only after consenting to it being stored (contract §3.6).
  const showNeeds = !isRequester || consent;

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
      await signUp(
        { displayName: name, role, specialNeedsConsent: isRequester && consent },
        showNeeds
          ? { disabilities, accessibilityNotes: isRequester ? '' : needsNotes.trim() }
          : { disabilities: [], accessibilityNotes: '' },
        isRequester && consent ? specialNeedNotes : [],
      );
      // Route guard in app/_layout.tsx switches to the app automatically.
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

      {isRequester && (
        <CheckboxRow
          label="Zgadzam się na przechowywanie i udostępnianie informacji o mojej niepełnosprawności (opcjonalnie)"
          description="Zobaczy je tylko wolontariusz, którego pomoc zaakceptujesz. Zgodę możesz wycofać w profilu – wtedy usuniemy te informacje."
          checked={consent}
          onChange={setConsent}
        />
      )}

      {showNeeds && (
        <NeedsPicker
          disabilities={disabilities}
          onDisabilitiesChange={setDisabilities}
          // Volunteers keep a note on the device; requesters list needs stored on the server below.
          notes={isRequester ? undefined : needsNotes}
          onNotesChange={isRequester ? undefined : setNeedsNotes}
        />
      )}

      {isRequester && consent && (
        <SpecialNeedNotesEditor
          notes={specialNeedNotes}
          onChange={setSpecialNeedNotes}
          disabilities={disabilities}
        />
      )}

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
