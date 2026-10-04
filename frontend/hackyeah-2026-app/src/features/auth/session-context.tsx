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

import { createUser, getMe, updateMyDisabilities, updateMySpecialNeedNotes } from '@/api/auth';
import { setApiUserId } from '@/api/client';
import type { CreateUserDto, UserProfile, UserRole } from '@/api/types';
import { commuteStore } from '@/features/commute/commute-store';
import { startScreen } from '@/features/home/start-screen-store';
import { emptyProfileDetails, type ProfileDetails } from '@/features/profile/profile-details';
import { webStorage } from '@/lib/web-storage';

type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

type Auth = {
  status: AuthStatus;
  user: UserProfile | null;
  /** Client-only profile description of the logged-in user. */
  profileDetails: ProfileDetails;
  signIn: (userId: number) => Promise<UserProfile>;
  /**
   * Creates a new account (`POST /api/users`) and logs in as it, with optional profile details.
   * With the consent, `details.disabilities` and `specialNeedNotes` are stored on the server.
   */
  signUp: (
    dto: CreateUserDto,
    details?: Partial<ProfileDetails>,
    specialNeedNotes?: string[],
  ) => Promise<UserProfile>;
  /** Re-reads `/users/me`, e.g. after a rating changed trust score or city points. */
  refreshUser: () => Promise<void>;
  signOut: () => void;
  updateProfileDetails: (details: Partial<ProfileDetails>) => void;
};

const AuthContext = createContext<Auth | null>(null);

const STORAGE_KEY = 'podrodze.userId';
const DETAILS_STORAGE_KEY = 'podrodze.profileDetails';

/** Web keeps the session across reloads; native keeps it in memory (no storage dependency yet). */
const storage = {
  get(): number | null {
    if (Platform.OS !== 'web') return null;
    try {
      const value = Number(globalThis.localStorage?.getItem(STORAGE_KEY));
      return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  },
  set(value: number | null) {
    if (Platform.OS !== 'web') return;
    try {
      if (value) globalThis.localStorage?.setItem(STORAGE_KEY, String(value));
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private mode) – session simply won't survive a reload.
    }
  },
};

/** Mock auth matching the backend: the user is identified by id, sent as `X-User-Id`. */
export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [detailsByUser, setDetailsByUser] = useState<Record<number, ProfileDetails>>(
    () => webStorage.read(DETAILS_STORAGE_KEY) ?? {},
  );
  const [status, setStatus] = useState<AuthStatus>(() =>
    storage.get() ? 'restoring' : 'signedOut',
  );

  const applyUser = useCallback((signedIn: UserProfile) => {
    setApiUserId(signedIn.id);
    storage.set(signedIn.id);
    setUser(signedIn);
    setStatus('signedIn');
    return signedIn;
  }, []);

  const signIn = useCallback((userId: number) => getMe(userId).then(applyUser), [applyUser]);
  const signUp = useCallback(
    async (dto: CreateUserDto, details?: Partial<ProfileDetails>, specialNeedNotes?: string[]) => {
      let created = await createUser(dto);
      // Consent was given at sign-up, so the kinds go to the backend (they mark the user as disabled)
      // together with the needs described in the user's own words.
      if (created.specialNeedsConsent && details?.disabilities?.length) {
        created = await updateMyDisabilities({ disabilities: details.disabilities }, created.id);
      }
      if (created.specialNeedsConsent && specialNeedNotes?.length) {
        created = await updateMySpecialNeedNotes({ notes: specialNeedNotes }, created.id);
      }
      const createdId = created.id;
      if (details) {
        // A requester's disabilities and needs live only on the server; volunteers keep theirs here.
        const local =
          created.role === 'REQUESTER'
            ? { ...details, disabilities: [], accessibilityNotes: '' }
            : details;
        setDetailsByUser((current) => ({
          ...current,
          [createdId]: { ...emptyProfileDetails, ...local },
        }));
      }
      return applyUser(created);
    },
    [applyUser],
  );

  const signOut = useCallback(() => {
    setApiUserId(null);
    storage.set(null);
    setUser(null);
    setStatus('signedOut');
    // Cached lists and the commute route belong to the previous user.
    queryClient.clear();
    commuteStore.clearRoute();
    // The next login shows the start screen again.
    startScreen.reset();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (user) setUser(await getMe(user.id));
  }, [user]);

  const userId = user?.id;
  const updateProfileDetails = useCallback(
    (details: Partial<ProfileDetails>) => {
      if (userId === undefined) return;
      setDetailsByUser((current) => ({
        ...current,
        [userId]: { ...(current[userId] ?? emptyProfileDetails), ...details },
      }));
    },
    [userId],
  );

  // Older saved entries may miss newer fields, so always merge with the defaults.
  const profileDetails = useMemo(
    () => ({
      ...emptyProfileDetails,
      ...(userId !== undefined ? detailsByUser[userId] : undefined),
    }),
    [detailsByUser, userId],
  );

  useEffect(() => {
    webStorage.write(DETAILS_STORAGE_KEY, detailsByUser);
  }, [detailsByUser]);

  useEffect(() => {
    const storedId = storage.get();
    if (!storedId) return;
    getMe(storedId).then(applyUser, () => {
      storage.set(null);
      setStatus('signedOut');
    });
  }, [applyUser]);

  const value = useMemo(
    () => ({
      status,
      user,
      profileDetails,
      signIn,
      signUp,
      refreshUser,
      signOut,
      updateProfileDetails,
    }),
    [status, user, profileDetails, signIn, signUp, refreshUser, signOut, updateProfileDetails],
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
  user: UserProfile;
  role: UserRole;
};

/** Logged-in user. Screens behind the login guard can rely on `user` being present. */
export function useSession(): Session {
  const { user, status: _status, ...auth } = useAuth();
  if (!user) throw new Error('useSession used without a logged-in user');
  return { ...auth, user, role: user.role };
}
