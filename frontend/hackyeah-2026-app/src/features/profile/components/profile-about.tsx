import { StyleSheet, View } from 'react-native';

import type { UserProfile } from '@/api/types';
import type { ProfileDetails } from '@/features/profile/profile-details';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CategoryColors, Spacing } from '@/constants/theme';
import { CategoryLabels } from '@/features/requests/labels';

/** Read-only view of who the person is and what they need / offer. */
export function ProfileAbout({ user, profile }: { user: UserProfile; profile: ProfileDetails }) {
  const isVolunteer = user.role === 'VOLUNTEER';

  return (
    <>
      <Card>
        <ThemedText type="subtitle">O mnie</ThemedText>
        <Value text={profile.about} empty="Dodaj kilka słów o sobie – sąsiadom łatwiej zaufać." />
      </Card>

      <Card>
        <ThemedText type="subtitle">
          {isVolunteer ? 'W czym mogę pomóc' : 'Moje potrzeby'}
        </ThemedText>
        {profile.helpTopics.length > 0 ? (
          <View style={styles.badges}>
            {profile.helpTopics.map((topic) => (
              <Badge
                key={topic}
                label={CategoryLabels[topic]}
                color={CategoryColors[topic].color}
                backgroundColor={CategoryColors[topic].soft}
              />
            ))}
          </View>
        ) : (
          <Value text="" empty="Nie wybrano jeszcze żadnych kategorii." />
        )}

        {!isVolunteer && (
          <View style={styles.field}>
            <ThemedText type="smallBold">Wsparcie dostępności</ThemedText>
            <Value
              text={profile.accessibilityNotes}
              empty={
                user.specialNeeds
                  ? 'Opisz, na co wolontariusz powinien zwrócić uwagę.'
                  : 'Brak szczególnych potrzeb.'
              }
            />
            <ThemedText type="caption" themeColor="textSecondary">
              Widoczne tylko dla wolontariusza, którego pomoc zaakceptujesz.
            </ThemedText>
          </View>
        )}
      </Card>

      <Card>
        <ThemedText type="subtitle">Okolica i dostępność</ThemedText>
        <View style={styles.field}>
          <ThemedText type="smallBold">Dzielnica</ThemedText>
          <Value text={profile.district} empty="Nie podano" />
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">
            {isVolunteer ? 'Kiedy mogę pomagać' : 'Kiedy jestem w domu'}
          </ThemedText>
          <Value text={profile.availability} empty="Nie podano" />
        </View>
      </Card>
    </>
  );
}

function Value({ text, empty }: { text: string; empty: string }) {
  return text ? (
    <ThemedText>{text}</ThemedText>
  ) : (
    <ThemedText themeColor="textSecondary" style={styles.empty}>
      {empty}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  field: {
    gap: Spacing.half,
  },
  empty: {
    fontStyle: 'italic',
  },
});
