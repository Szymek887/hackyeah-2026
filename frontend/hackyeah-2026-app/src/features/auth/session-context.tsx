import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { signInAs } from '@/api/auth';
import { setApiUserId } from '@/api/client';
import type { User, UserProfileDetails, UserRole } from '@/api/types';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

type Auth = {
  status: AuthStatus;
  user: User | null;
  signIn: (userId: string) => Promise<User>;
  signOut: () => void;
  /** TODO(backend): profile details are client-only until the backend stores them. */
  updateProfile: (profile: Partial<UserProfileDetails>) => void;
};

const AuthContext = createContext<Auth | null>(null);

const STORAGE_KEY = 'podrodze.userId';

/** Web keeps the session across reloads; native keeps it in memory (no storage dependency yet). */
const storage = {
  get(): string | null {
    if (Platform.OS !== 'web') return null;
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  set(value: string | null) {
    if (Platform.OS !== 'web') return;
    try {
      if (value) globalThis.localStorage?.setItem(STORAGE_KEY, value);
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private mode) – session simply won't survive a reload.
    }
  },
};

/** Mock auth matching the backend: the user is identified by id, sent as `X-User-Id`. */
export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    storage.get() ? 'restoring' : 'signedOut',
  );

  const applyUser = useCallback((signedIn: User) => {
    setApiUserId(signedIn.id);
    storage.set(signedIn.id);
    setUser(signedIn);
    setStatus('signedIn');
    return signedIn;
  }, []);

  const signIn = useCallback((userId: string) => signInAs(userId).then(applyUser), [applyUser]);

  const signOut = useCallback(() => {
    setApiUserId(null);
    storage.set(null);
    setUser(null);
    setStatus('signedOut');
    // Cached lists belong to the previous user.
    queryClient.clear();
  }, [queryClient]);

  const updateProfile = useCallback((profile: Partial<UserProfileDetails>) => {
    setUser((current) =>
      current ? { ...current, profile: { ...current.profile, ...profile } } : current,
    );
  }, []);

  useEffect(() => {
    const storedId = storage.get();
    if (!storedId) return;
    signInAs(storedId).then(applyUser, () => {
      storage.set(null);
      setStatus('signedOut');
    });
  }, [applyUser]);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, updateProfile }),
    [status, user, signIn, signOut, updateProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Auth state, also when nobody is logged in (login screen, route guards). */
export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside SessionProvider');
  return auth;
}

type Session = Omit<Auth, 'user' | 'status'> & {
  user: User;
  role: UserRole;
};

/** Logged-in user. Screens behind the login guard can rely on `user` being present. */
export function useSession(): Session {
  const { user, status: _status, ...auth } = useAuth();
  if (!user) throw new Error('useSession used without a logged-in user');
  return { ...auth, user, role: user.role };
}
