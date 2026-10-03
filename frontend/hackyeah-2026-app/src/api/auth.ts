import { apiRequest } from '@/api/client';
import type { UserProfile, UserRole } from '@/api/types';

/**
 * Backend auth is a mock: the user is identified by the `X-User-Id` header.
 * Login = check that the id exists via `GET /api/users/me`.
 */
export const getMe = (userId?: number) => apiRequest<UserProfile>('/api/users/me', { userId });

export type DemoAccount = { id: number; displayName: string; role: UserRole };

/**
 * Accounts from the backend seeder (config/DatabaseSeeder.java), in seeding order = database ids.
 * TODO(backend): no endpoint lists users yet; keep in sync with the seeder.
 */
export const demoAccounts: DemoAccount[] = [
  { id: 1, displayName: 'Anna K.', role: 'REQUESTER' },
  { id: 2, displayName: 'Marek S.', role: 'REQUESTER' },
  { id: 4, displayName: 'Zofia M.', role: 'REQUESTER' },
  { id: 9, displayName: 'Kuba W.', role: 'VOLUNTEER' },
  { id: 10, displayName: 'Ola D.', role: 'VOLUNTEER' },
  { id: 13, displayName: 'Miasto Kraków', role: 'CITY_ADMIN' },
];
