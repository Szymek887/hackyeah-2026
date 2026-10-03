import { router } from 'expo-router';

import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { RoleSwitch } from '@/features/profile/components/role-switch';
import { useSession } from '@/features/auth/session-context';

export default function ProfileScreen() {
  const { user, role, switchRole } = useSession();

  return (
    <Screen scroll>
      <ThemedText type="title">Profil</ThemedText>
      <ProfileHeader user={user} />
      <ProfileStats user={user} />

      <ThemedText type="smallBold" themeColor="textSecondary">
        TRYB DEMO
      </ThemedText>
      <RoleSwitch role={role} onChange={switchRole} />

      <Button variant="outline" title="Panel miasta" onPress={() => router.push('/dashboard')} />
    </Screen>
  );
}
