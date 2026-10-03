import { Link } from 'expo-router';

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

      <ThemedText type="smallBold" style={{ marginTop: 12 }}>
        Szybkie przejścia do modułów FE3:
      </ThemedText>
      <Link href={{ pathname: '/task/[id]', params: { id: 'r-1' } }} asChild>
        <Button title="📋 Aktywne zadanie (Handoff / QR)" />
      </Link>
      <Link href="/dashboard" asChild>
        <Button title="🏙️ Panel Miasta (Heatmapa)" variant="secondary" />
      </Link>
    </ScreenPlaceholder>
  );
}
