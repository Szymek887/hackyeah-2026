import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

const sameItems = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function ProfileScreen() {
  const { user, profileDetails, updateProfileDetails, signOut, refreshUser } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Requesters' disabilities live on the backend (with consent, contract §3.6) and are edited next to
  // the consent checkbox; others keep them locally.
  const isRequester = user.role === 'REQUESTER';
  const shownDetails: ProfileDetails = isRequester
    ? { ...profileDetails, disabilities: user.disabilities }
    : profileDetails;

  const handleSave = async (details: ProfileDetails, languages: LanguageCode[]) => {
    setSaveError(null);
    const languagesChanged = !sameItems(languages, user.languages);
    if (languagesChanged) {
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
    // A requester's disabilities are kept only on the server, not on the device.
    updateProfileDetails(isRequester ? { ...details, disabilities: [] } : details);
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
            profile={shownDetails}
            saving={saving}
            error={saveError}
            onCancel={() => {
              setSaveError(null);
              setEditing(false);
            }}
            onSave={handleSave}
          />
        ) : (
          <ProfileAbout user={user} profile={shownDetails} />
        )}
      </Animated.View>

      <View style={styles.actions}>
        {/* Phones show the start screen only once after login (see start-screen-store). */}
        {user.role === 'REQUESTER' && Platform.OS === 'web' && (
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
