import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import {
  updateMyDisabilities,
  updateMySpecialNeedNotes,
  updateSpecialNeedsConsent,
} from '@/api/auth';
import { errorMessage } from '@/api/errors';
import type { DisabilityType } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { CheckboxRow } from '@/components/ui/checkbox-row';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { Disabilities } from '@/features/accessibility/accessibility-settings';
import { SpecialNeedNotesEditor } from '@/features/accessibility/components/special-need-notes-editor';
import { useSession } from '@/features/auth/session-context';

// Genitive month names, so the date reads "1 października 2026" (Intl is incomplete on Hermes/Android).
const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

function formatDate(iso: string) {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const REVOKE_TITLE = 'Wycofać zgodę?';
const REVOKE_MESSAGE =
  'Usuniemy z naszej bazy wszystkie podane informacje o Twojej niepełnosprawności i szczególnych potrzebach, a Twoje prośby nie będą już miały wyższego priorytetu.';

/** Revoking deletes health data, so it is confirmed first. */
function confirmRevoke(): Promise<boolean> {
  if (Platform.OS === 'web')
    return Promise.resolve(window.confirm(`${REVOKE_TITLE}\n\n${REVOKE_MESSAGE}`));
  return new Promise((resolve) =>
    Alert.alert(REVOKE_TITLE, REVOKE_MESSAGE, [
      { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Wycofaj i usuń', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/**
 * Requester's disabilities (contract §3.6), in two steps:
 * 1. the consent checkbox – nothing about a disability is stored without it,
 * 2. the kinds of disability – only these mark the person as disabled (higher priority),
 * 3. optionally special needs in their own words, extending the disabilities.
 * Disabilities and needs are shown to the volunteer whose help they accept, from acceptance on.
 * Unchecking revokes the consent: the server deletes the consent record, disabilities and needs.
 * Everything is saved immediately, like a phone setting.
 */
export function SpecialNeedsConsent() {
  const { user, refreshUser, updateProfileDetails } = useSession();
  // Values being saved; null = show the profile value (also after pull to refresh).
  const [pendingConsent, setPendingConsent] = useState<boolean | null>(null);
  const [pendingDisabilities, setPendingDisabilities] = useState<DisabilityType[] | null>(null);
  const [pendingNotes, setPendingNotes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consent = pendingConsent ?? user.specialNeedsConsent;
  const disabilities = pendingDisabilities ?? user.disabilities;
  const notes = pendingNotes ?? user.specialNeedNotes;
  const busy = pendingConsent !== null || pendingDisabilities !== null || pendingNotes !== null;

  const changeConsent = async (next: boolean) => {
    const hasData = user.disabilities.length > 0 || user.specialNeedNotes.length > 0;
    if (!next && hasData && !(await confirmRevoke())) return;
    setPendingConsent(next); // optimistic: the checkbox changes at once
    setError(null);
    try {
      await updateSpecialNeedsConsent({ consent: next });
      if (!next) {
        // Older app versions kept notes on this device; they are covered by the same consent.
        updateProfileDetails({ disabilities: [], accessibilityNotes: '' });
      }
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      // Back to the profile value: the saved one, or the old one when saving failed.
      setPendingConsent(null);
    }
  };

  const toggleDisability = async (value: DisabilityType) => {
    const next = disabilities.includes(value)
      ? disabilities.filter((d) => d !== value)
      : [...disabilities, value];
    setPendingDisabilities(next);
    setError(null);
    try {
      await updateMyDisabilities({ disabilities: next });
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPendingDisabilities(null);
    }
  };

  const changeNotes = async (next: string[]) => {
    setPendingNotes(next);
    setError(null);
    try {
      await updateMySpecialNeedNotes({ notes: next });
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPendingNotes(null);
    }
  };

  const grantedAt =
    !busy && user.specialNeedsConsentGrantedAt
      ? ` Zgoda udzielona ${formatDate(user.specialNeedsConsentGrantedAt)}.`
      : '';

  return (
    <View style={styles.wrapper}>
      <CheckboxRow
        label="Zgadzam się na przechowywanie i udostępnianie informacji o mojej niepełnosprawności"
        description="Zobaczy je tylko wolontariusz, którego pomoc zaakceptujesz, i dopiero po akceptacji. Odznaczenie wycofuje zgodę i usuwa te informacje."
        checked={consent}
        onChange={changeConsent}
        disabled={busy}
      />

      {consent && (
        <View style={styles.field}>
          <ThemedText type="smallBold">Rodzaj niepełnosprawności</ThemedText>
          <View style={styles.chips}>
            {Disabilities.map((d) => (
              <Chip
                key={d.value}
                mode="checkbox"
                label={d.label}
                selected={disabilities.includes(d.value)}
                onPress={() => !busy && toggleDisability(d.value)}
              />
            ))}
          </View>
        </View>
      )}

      {consent && (
        <SpecialNeedNotesEditor
          notes={notes}
          onChange={changeNotes}
          disabilities={disabilities}
          disabled={busy}
        />
      )}

      <ThemedText
        type="small"
        themeColor={consent && disabilities.length > 0 ? 'primary' : 'textSecondary'}>
        {!consent
          ? 'Brak zgody – nie przechowujemy żadnej informacji o Twojej niepełnosprawności. Twoje prośby nie dostają wyższego priorytetu.'
          : disabilities.length === 0
            ? `Wybierz co najmniej jeden rodzaj. Dopóki nic nie wybierzesz, nie jesteś oznaczony jako osoba z niepełnosprawnością.${grantedAt}`
            : `Jesteś oznaczony jako osoba z niepełnosprawnością – Twoje prośby mają wyższy priorytet.${grantedAt}`}
      </ThemedText>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
