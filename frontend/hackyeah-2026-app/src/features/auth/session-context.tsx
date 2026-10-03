import { createContext, use, useState, type PropsWithChildren } from 'react';

import { mockRequester, mockVolunteer } from '@/api/mocks/data';
import type { User, UserRole } from '@/api/types';

type Session = {
  user: User;
  role: UserRole;
  switchRole: (role: UserRole) => void;
};

const SessionContext = createContext<Session | null>(null);

/** Mock auth (F1.4): toggles between the requester and volunteer demo profiles. */
export function SessionProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<UserRole>('VOLUNTEER');
  const user = role === 'REQUESTER' ? mockRequester : mockVolunteer;

  return <SessionContext value={{ user, role, switchRole: setRole }}>{children}</SessionContext>;
}

export function useSession() {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
