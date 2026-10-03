import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { useSession } from '@/features/auth/session-context';

export default function ProfileScreen() {
  const { user, role, switchRole } = useSession();
  const isVolunteer = role === 'VOLUNTEER';

  return (
    <ScreenPlaceholder
      title="Profil"
      owner="FE1"
      tasks={['F1.4 przełącznik roli', 'profil z gwiazdkami']}>
      <ThemedText>
        {user.displayName} · {isVolunteer ? 'Wolontariusz' : 'Potrzebujący'} · ★{' '}
        {user.ratingAverage}
      </ThemedText>
      <Button
        variant="secondary"
        title={isVolunteer ? 'Przełącz na: Potrzebujący' : 'Przełącz na: Wolontariusz'}
        onPress={() => switchRole(isVolunteer ? 'REQUESTER' : 'VOLUNTEER')}
      />
    </ScreenPlaceholder>
  );
}
