import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateSpecialNeedsConsent } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ToggleRow } from '@/components/ui/toggle-row';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';

/**
 * Consent switch for sharing special needs (contract §3.6). Saved immediately, like a phone setting.
 * Only the fact is shared – no details – and only with the volunteer whose help the user accepted.
 */
export function SpecialNeedsConsent() {
  const { user, refreshUser } = useSession();
  // Value being saved; null = show the profile value (also after pull to refresh).
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shared = pending ?? user.shareSpecialNeeds;

  const change = async (next: boolean) => {
    setPending(next); // optimistic: the slider moves at once
    setError(null);
    try {
      await updateSpecialNeedsConsent({ shareWithVolunteer: next });
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      // Back to the profile value: the saved one, or the old one when saving failed.
      setPending(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ToggleRow
        label="Udostępnij wolontariuszowi informację o szczególnych potrzebach"
        description="Zobaczy ją tylko wolontariusz, którego pomoc zaakceptujesz – i dopiero po akceptacji. Bez szczegółów, nigdy na mapie. Możesz to wyłączyć w każdej chwili."
        value={shared}
        onValueChange={change}
        disabled={pending !== null}
      />
      <ThemedText type="small" themeColor={shared ? 'primary' : 'textSecondary'}>
        {shared
          ? 'Włączone – wolontariusz po akceptacji zobaczy, że prosisz o uwzględnienie szczególnych potrzeb.'
          : 'Wyłączone – nikt nie zobaczy tej informacji.'}
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
