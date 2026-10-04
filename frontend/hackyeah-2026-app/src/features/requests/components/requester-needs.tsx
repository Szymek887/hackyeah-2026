import { StyleSheet, View } from 'react-native';

import type { HelpRequestFull } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Spacing } from '@/constants/theme';
import { DisabilityLabels } from '@/features/accessibility/accessibility-settings';
import { useTheme } from '@/hooks/use-theme';

/**
 * The requester's disabilities and special needs for the volunteer whose help was accepted. The
 * backend sends them only in the FULL view (from ACCEPTED on) and only with the requester's consent,
 * like the exact address.
 */
export function RequesterNeeds({ request }: { request: HelpRequestFull }) {
  const theme = useTheme();
  const { requesterDisabilities: disabilities, requesterSpecialNeedNotes: notes } = request;
  if (request.viewerRole !== 'VOLUNTEER' || (disabilities.length === 0 && notes.length === 0)) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">
        Niepełnosprawność i szczególne potrzeby – zwróć uwagę
      </ThemedText>
      {disabilities.length > 0 && (
        <View style={styles.badges}>
          {disabilities.map((d) => (
            <Badge
              key={d}
              label={DisabilityLabels[d]}
              color={theme.accent}
              backgroundColor={theme.accentSoft}
            />
          ))}
        </View>
      )}
      {notes.map((note) => (
        <ThemedText key={note}>• {note}</ThemedText>
      ))}
      <ThemedText type="caption" themeColor="textSecondary">
        Udostępnione za zgodą tej osoby, tylko na czas pomocy. Nie przekazuj tych informacji dalej.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
