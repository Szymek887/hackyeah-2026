import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import type { CreateUserDto } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/session-context';

const DISPLAY_NAME_MAX = 60;

const ROLE_OPTIONS: { value: CreateUserDto['role']; label: string }[] = [
  { value: 'REQUESTER', label: 'Potrzebuję pomocy' },
  { value: 'VOLUNTEER', label: 'Chcę pomagać' },
];

/** `POST /api/users` – a new, unverified account. */
export function SignUpForm() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<CreateUserDto['role']>('REQUESTER');
  const [specialNeeds, setSpecialNeeds] = useState(false);
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
      await signUp({ displayName: name, role, specialNeeds: role === 'REQUESTER' && specialNeeds });
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

      <View style={styles.field}>
        <ThemedText type="smallBold">Jak chcesz korzystać z PoDrodze?</ThemedText>
        <View style={styles.chips}>
          {ROLE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={role === option.value}
              onPress={() => setRole(option.value)}
            />
          ))}
        </View>
      </View>

      {role === 'REQUESTER' && (
        <View style={styles.field}>
          <Chip
            mode="checkbox"
            label="Mam szczególne potrzeby"
            selected={specialNeeds}
            onPress={() => setSpecialNeeds((current) => !current)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Np. niepełnosprawność, choroba albo wiek. Twoje zgłoszenia dostaną wyższy priorytet.
          </ThemedText>
        </View>
      )}

      {error && (
        <ThemedText type="small" themeColor="danger">
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
  field: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
