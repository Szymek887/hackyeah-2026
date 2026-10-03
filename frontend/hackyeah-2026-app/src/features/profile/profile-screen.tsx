import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { ProfileAbout } from '@/features/profile/components/profile-about';
import { ProfileEditForm } from '@/features/profile/components/profile-edit-form';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { enterScreen, layoutTransition } from '@/lib/motion';

export function ProfileScreen() {
  const { user, updateProfile, signOut } = useSession();
  const [editing, setEditing] = useState(false);
  const isCity = user.role === 'CITY_ADMIN';

  return (
    <Screen scroll>
      <View style={styles.titleRow}>
        <ThemedText type="title">Profil</ThemedText>
        {!isCity && !editing && (
          <Button
            title="Edytuj profil"
            variant="secondary"
            inline
            onPress={() => setEditing(true)}
          />
        )}
      </View>

      <ProfileHeader user={user} />
      {!isCity && <ProfileStats user={user} />}

      {/* Key swap re-runs the fade when switching between view and edit mode. */}
      <Animated.View
        key={editing ? 'edit' : 'view'}
        entering={enterScreen}
        layout={layoutTransition}
        style={styles.section}>
        {editing ? (
          <ProfileEditForm
            user={user}
            onCancel={() => setEditing(false)}
            onSave={(profile) => {
              updateProfile(profile);
              setEditing(false);
            }}
          />
        ) : (
          !isCity && <ProfileAbout user={user} />
        )}
      </Animated.View>

      <View style={styles.actions}>
        {isCity ? (
          <Button title="Otwórz panel miasta" onPress={() => router.push('/dashboard')} />
        ) : (
          <Button title="Moje zadania" variant="secondary" onPress={() => router.push('/tasks')} />
        )}
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
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
});
