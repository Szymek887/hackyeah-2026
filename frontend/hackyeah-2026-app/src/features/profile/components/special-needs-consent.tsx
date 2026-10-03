import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateSpecialNeedsConsent } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ToggleRow } from '@/components/ui/toggle-row';
import { Spacing } from '@/constants/theme';
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
 * (contract §3.6). Turning it off deletes the consent record and the disability information on the
 * server and the disability details kept on this device; turning it on creates the consent again.
 * Saved immediately, like a phone setting.
 */
export function SpecialNeedsConsent() {
  const { user, refreshUser, updateProfileDetails } = useSession();
  // Value being saved; null = show the profile value (also after pull to refresh).
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consent = pending ?? user.specialNeedsConsent;

  const change = async (next: boolean) => {
    setPending(next); // optimistic: the slider moves at once
    setError(null);
    try {
      await updateSpecialNeedsConsent({ consent: next });
      if (!next) {
        // The details on this device are covered by the same consent.
        updateProfileDetails({ disabilities: [], accessibilityNotes: '' });
      }
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      // Back to the profile value: the saved one, or the old one when saving failed.
      setPending(null);
    }
  };

  const grantedAt =
    pending === null && user.specialNeedsConsentGrantedAt
      ? ` Zgoda udzielona ${formatDate(user.specialNeedsConsentGrantedAt)}.`
      : '';

  return (
    <View style={styles.wrapper}>
      <ToggleRow
        label="Zgoda na przechowywanie i udostępnianie informacji o niepełnosprawności"
        description="Wyłączenie usuwa z naszej bazy tę zgodę i informację o Twojej niepełnosprawności. Możesz ją włączyć ponownie w każdej chwili."
        value={consent}
        onValueChange={change}
        disabled={pending !== null}
      />
      <ThemedText type="small" themeColor={consent ? 'primary' : 'textSecondary'}>
        {consent
          ? `Włączone – przechowujemy informację o Twojej niepełnosprawności. Zobaczy ją tylko wolontariusz, którego pomoc zaakceptujesz, i dopiero po akceptacji.${grantedAt}`
          : 'Wyłączone – nie przechowujemy żadnej informacji o Twojej niepełnosprawności i nikt jej nie zobaczy. Twoje prośby nie dostają wyższego priorytetu.'}
      </ThemedText>
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
});
