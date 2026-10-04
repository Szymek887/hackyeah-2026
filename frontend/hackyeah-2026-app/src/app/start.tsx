import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/session-context';
import { RequesterStartScreen } from '@/features/home/requester-start-screen';
import { startScreen } from '@/features/home/start-screen-store';

export default function StartRoute() {
  const { user } = useSession();
  // Decided once on entry, so marking it as seen below does not send the person away mid-use.
  const [available] = useState(() => startScreen.isAvailable(user.id));

  useEffect(() => {
    if (available) startScreen.markSeen(user.id);
  }, [available, user.id]);

  if (!available) return <Redirect href="/tasks" />;
  return <RequesterStartScreen />;
}
