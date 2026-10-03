import { apiRequest, ApiError } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockUsers } from '@/api/mocks/data';
import { mockResponse } from '@/api/mocks/delay';
import type { BackendUserProfile, User } from '@/api/types';

export type DemoAccount = Pick<User, 'id' | 'displayName' | 'role' | 'verified'>;

/**
 * Accounts offered on the login screen. Mirrors the backend seeder (ids 1–5).
 * TODO(backend): replace with a real endpoint (e.g. `GET /api/users`) or a real login.
 */
export const demoAccounts: DemoAccount[] = mockUsers.map(({ id, displayName, role, verified }) => ({
  id,
  displayName,
  role,
  verified,
}));

function fromBackendProfile(profile: BackendUserProfile): User {
  // Fields the backend does not return yet are taken from the matching demo profile, if any.
  const demo = mockUsers.find((user) => user.id === String(profile.id));
  return {
    id: String(profile.id),
    displayName: profile.displayName,
    role: profile.role,
    verified: profile.identityVerified,
    hasSpecialNeeds: profile.specialNeeds,
    trustScore: profile.trustScore,
    ratingCount: profile.ratingCount,
    ratingAverage: demo?.ratingAverage ?? 0,
    cityPoints: demo?.cityPoints ?? 0,
    profile: demo?.profile ?? {
      about: '',
      district: '',
      availability: '',
      helpTopics: [],
      accessibilityNotes: '',
    },
  };
}

/** Mock login: the backend identifies users by the `X-User-Id` header, so we just verify the id. */
export async function signInAs(userId: string): Promise<User> {
  if (USE_MOCKS) {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) throw new ApiError(401, 'Nie znaleziono konta o tym identyfikatorze');
    return mockResponse(user, 500);
  }
  const profile = await apiRequest<BackendUserProfile>('/api/users/me', { userId });
  return fromBackendProfile(profile);
}
