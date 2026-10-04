import { StyleSheet, View } from 'react-native';

import type { UserProfile } from '@/api/types';
import type { ProfileDetails } from '@/features/profile/profile-details';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CategoryColors, Spacing } from '@/constants/theme';
import { DisabilityLabels } from '@/features/accessibility/accessibility-settings';
import { SpecialNeedsConsent } from '@/features/profile/components/special-needs-consent';
import { languageName } from '@/features/profile/languages';
import { CategoryLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

/** Read-only view of who the person is and what they need / offer. */
export function ProfileAbout({ user, profile }: { user: UserProfile; profile: ProfileDetails }) {
  const theme = useTheme();
  const isVolunteer = user.role === 'VOLUNTEER';
  const isRequester = user.role === 'REQUESTER';

  return (
    <>
      <Card>
        <ThemedText type="subtitle" accessibilityRole="header">
          O mnie
        </ThemedText>
        <Value text={profile.about} empty="Dodaj kilka słów o sobie – sąsiadom łatwiej zaufać." />
        <View style={styles.field}>
          <ThemedText type="smallBold">Języki</ThemedText>
          <Value
            text={user.languages.map(languageName).join(', ')}
            empty="Nie podano – dodaj w edycji profilu."
          />
        </View>
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

        <View style={styles.field}>
          <ThemedText type="smallBold">Niepełnosprawność i szczególne potrzeby</ThemedText>
          {isRequester ? (
            // Consent first, then disabilities and needs – all saved on the server (contract §3.6).
            <View style={styles.consent}>
              <SpecialNeedsConsent />
            </View>
          ) : (
            <>
              {profile.disabilities.length > 0 && (
                <View style={styles.badges}>
                  {profile.disabilities.map((d) => (
                    <Badge
                      key={d}
                      label={DisabilityLabels[d]}
                      color={theme.accent}
                      backgroundColor={theme.accentSoft}
                    />
                  ))}
                </View>
              )}
              <Value text={profile.accessibilityNotes} empty="Brak szczególnych potrzeb." />
              <ThemedText type="caption" themeColor="textSecondary">
                Te szczegóły widzisz tylko Ty.
              </ThemedText>
            </>
          )}
        </View>
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
  consent: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
});
