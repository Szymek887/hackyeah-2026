import { API_URL, USE_MOCKS } from '@/api/config';
import { handleMockRequest } from '@/api/mocks/server';
import { ApiError } from '@/api/errors';
import type { ProblemDetail } from '@/api/types';

export { ApiError };

let currentUserId: number | null = null;

/** Called by the session on login / logout. Backend mock auth reads the `X-User-Id` header. */
export function setApiUserId(userId: number | null) {
  currentUserId = userId;
}

export type HttpMethod = 'GET' | 'POST';

export type ApiRequest = {
  method: HttpMethod;
  path: string;
  query: Record<string, string>;
  body?: unknown;
  userId?: number;
};

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Overrides the session user, used by the login call before the session exists. */
  userId?: number;
};

/**
 * The only way to talk to the backend. With EXPO_PUBLIC_USE_MOCKS (default) the same request is
 * answered by src/api/mocks/server.ts, which follows the backend rules and returns the same JSON.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, query, userId = currentUserId ?? undefined }: RequestOptions = {},
): Promise<T> {
  const cleanQuery = Object.fromEntries(
    Object.entries(query ?? {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  if (USE_MOCKS) {
    return handleMockRequest<T>({ method, path, query: cleanQuery, body, userId });
  }

  const search = new URLSearchParams(cleanQuery).toString();
  const response = await fetch(`${API_URL}${path}${search ? `?${search}` : ''}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(userId !== undefined && { 'X-User-Id': String(userId) }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetail | null;
    throw new ApiError(
      response.status,
      problem?.detail ?? problem?.title ?? response.statusText,
      problem?.errors,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
