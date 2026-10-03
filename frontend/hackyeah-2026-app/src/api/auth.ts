import { apiRequest } from '@/api/client';
import type {
  CreateUserDto,
  UpdateLanguagesDto,
  UpdateSpecialNeedsConsentDto,
  UserProfile,
} from '@/api/types';

/**
 * Backend auth is a mock: the user is identified by the `X-User-Id` header.
 * Login = check that the id exists via `GET /api/users/me`.
 */
export const getMe = (userId?: number) => apiRequest<UserProfile>('/api/users/me', { userId });

/**
 * `GET /api/users/demo` – public list of accounts for the login screen
 * (requesters, then volunteers, then city admins). Ids come from the database, never hard-code them.
 */
export const getDemoAccounts = () => apiRequest<UserProfile[]>('/api/users/demo');

/** `POST /api/users` (🔵 PROPOSED) – public, creates an unverified account. → 201 UserProfile. */
export const createUser = (dto: CreateUserDto) =>
  apiRequest<UserProfile>('/api/users', { method: 'POST', body: dto });

/** `PUT /api/users/me/languages` – replaces the languages the caller speaks. → 200 UserProfile. */
export const updateMyLanguages = (dto: UpdateLanguagesDto) =>
  apiRequest<UserProfile>('/api/users/me/languages', { method: 'PUT', body: dto });

/**
 * `PUT /api/users/me/special-needs-consent` – gives or withdraws consent to tell the accepted
 * volunteer about the caller's special needs. Takes effect immediately. → 200 UserProfile.
 */
export const updateSpecialNeedsConsent = (dto: UpdateSpecialNeedsConsentDto) =>
  apiRequest<UserProfile>('/api/users/me/special-needs-consent', { method: 'PUT', body: dto });
