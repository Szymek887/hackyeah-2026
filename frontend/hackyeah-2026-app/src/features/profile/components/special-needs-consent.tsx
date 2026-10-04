import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateSpecialNeedsConsent } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import type { DisabilityType } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ToggleRow } from '@/components/ui/toggle-row';
import { Spacing } from '@/constants/theme';
import { Disabilities } from '@/features/accessibility/accessibility-settings';
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

/**
 * Consent to store the requester's disability and share the fact with the accepted volunteer
 * (contract §3.6). The consent is given for declared disabilities: turning it on opens a choice of
 * at least one kind, saved with "Potwierdź zgodę". Turning it off is saved at once and deletes the
 * consent record and the disability information on the server and the notes kept on this device.
 */
export function SpecialNeedsConsent() {
  const { user, refreshUser, updateProfileDetails } = useSession();
  // Value being saved; null = show the profile value (also after pull to refresh).
  const [pending, setPending] = useState<boolean | null>(null);
  // Switch turned on, kinds not chosen yet – nothing is stored until the choice is confirmed.
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<DisabilityType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const consent = pending ?? (user.specialNeedsConsent || choosing);

  const save = async (next: boolean, disabilities?: DisabilityType[]) => {
    setPending(next); // optimistic: the slider stays where the user put it
    setError(null);
    try {
      await updateSpecialNeedsConsent({ consent: next, disabilities });
      if (!next) {
        // The notes on this device are covered by the same consent.
        updateProfileDetails({ disabilities: [], accessibilityNotes: '' });
      }
      setChoosing(false);
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      // Back to the profile value: the saved one, or the old one when saving failed.
      setPending(null);
    }
  };

  const onSwitch = (next: boolean) => {
    setError(null);
    if (next) {
      setChosen([]);
      setChoosing(true);
    } else if (choosing) {
      setChoosing(false); // nothing was stored yet
    } else {
      void save(false);
    }
  };

  const toggleKind = (kind: DisabilityType) =>
    setChosen((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );

  const grantedAt =
    pending === null && user.specialNeedsConsentGrantedAt
      ? ` Zgoda udzielona ${formatDate(user.specialNeedsConsentGrantedAt)}.`
      : '';

  return (
    <View style={styles.wrapper}>
      <ToggleRow
        label="Zgoda na przechowywanie i udostępnianie informacji o niepełnosprawności"
        description="Zgodę wyrażasz dla wybranych niepełnosprawności – co najmniej jednej. Wyłączenie usuwa z naszej bazy tę zgodę i informację o Twojej niepełnosprawności. Możesz ją włączyć ponownie w każdej chwili."
        value={consent}
        onValueChange={onSwitch}
        disabled={pending !== null}
      />

      {choosing && pending === null ? (
        <View style={styles.choice}>
          <ThemedText type="small">
            Wybierz co najmniej jedną niepełnosprawność, której dotyczy zgoda:
          </ThemedText>
          <View style={styles.chips}>
            {Disabilities.map((d) => (
              <Chip
                key={d.value}
                mode="checkbox"
                label={d.label}
                selected={chosen.includes(d.value)}
                onPress={() => toggleKind(d.value)}
              />
            ))}
          </View>
          <View style={styles.actions}>
            <Button
              title="Potwierdź zgodę"
              inline
              disabled={chosen.length === 0}
              onPress={() => void save(true, chosen)}
            />
            <Button title="Anuluj" variant="ghost" inline onPress={() => setChoosing(false)} />
          </View>
        </View>
      ) : (
        <ThemedText type="small" themeColor={consent ? 'primary' : 'textSecondary'}>
          {consent
            ? `Włączone – przechowujemy informację o Twojej niepełnosprawności. Zobaczy ją tylko wolontariusz, którego pomoc zaakceptujesz, i dopiero po akceptacji.${grantedAt}`
            : 'Wyłączone – nie przechowujemy żadnej informacji o Twojej niepełnosprawności i nikt jej nie zobaczy. Twoje prośby nie dostają wyższego priorytetu.'}
        </ThemedText>
      )}
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  choice: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
