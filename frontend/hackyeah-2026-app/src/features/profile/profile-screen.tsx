import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { updateMyLanguages } from '@/api/auth';
import { errorMessage } from '@/api/errors';
import type { LanguageCode } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { ProfileAbout } from '@/features/profile/components/profile-about';
import { ProfileEditForm } from '@/features/profile/components/profile-edit-form';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import type { ProfileDetails } from '@/features/profile/profile-details';
import { enterScreen, layoutTransition } from '@/lib/motion';

const sameLanguages = (a: LanguageCode[], b: LanguageCode[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function ProfileScreen() {
  const { user, profileDetails, updateProfileDetails, signOut, refreshUser } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (details: ProfileDetails, languages: LanguageCode[]) => {
    setSaveError(null);
    if (!sameLanguages(languages, user.languages)) {
      setSaving(true);
      try {
        await updateMyLanguages({ languages });
        await refreshUser();
      } catch (err) {
        setSaveError(errorMessage(err));
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    updateProfileDetails(details);
    setEditing(false);
  };

  return (
    <Screen scroll onRefresh={refreshUser}>
      <View style={styles.titleRow}>
        <ThemedText type="title" accessibilityRole="header">
          Profil
        </ThemedText>
        {!editing && (
          <Button
            title="Edytuj profil"
            variant="secondary"
            inline
            onPress={() => setEditing(true)}
          />
        )}
      </View>

      <ProfileHeader user={user} />
      <ProfileStats user={user} />

      {/* Key swap re-runs the fade when switching between view and edit mode. */}
      <Animated.View
        key={editing ? 'edit' : 'view'}
        entering={enterScreen}
        layout={layoutTransition}
        style={styles.section}>
        {editing ? (
          <ProfileEditForm
            user={user}
            profile={profileDetails}
            saving={saving}
            error={saveError}
            onCancel={() => {
              setSaveError(null);
              setEditing(false);
            }}
            onSave={handleSave}
          />
        ) : (
          <ProfileAbout user={user} profile={profileDetails} />
        )}
      </Animated.View>

      <View style={styles.actions}>
        {user.role === 'REQUESTER' && (
          <Button
            title="Prosty ekran startowy"
            variant="secondary"
            onPress={() => router.push('/start')}
          />
        )}
        <Button
          title={user.role === 'VOLUNTEER' ? 'Moje zadania' : 'Moje prośby'}
          variant="secondary"
          onPress={() => router.push('/tasks')}
        />
        <Button title="Wyloguj się" variant="danger" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
});
