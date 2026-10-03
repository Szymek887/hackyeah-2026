import { API_URL } from '@/api/config';
import type { ApiErrorBody } from '@/api/types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let currentUserId: string | null = null;

/** Called by the session on login / logout. Backend mock auth reads the `X-User-Id` header. */
export function setApiUserId(userId: string | null) {
  currentUserId = userId;
}

export function getApiUserId() {
  return currentUserId;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Overrides the session user, used by the login call before the session exists. */
  userId?: string;
};

/** Thin fetch wrapper. All backend calls go through here so auth headers / error handling live in one place. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, query, userId = currentUserId ?? undefined }: RequestOptions = {},
) {
  const search = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_URL}${path}${search ? `?${search}` : ''}`;

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(userId && { 'X-User-Id': userId }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Backend returns RFC 9457 ProblemDetail (`detail`), older handlers used `message`.
    const error = (await response.json().catch(() => null)) as
      (ApiErrorBody & { detail?: string }) | null;
    throw new ApiError(
      response.status,
      error?.detail ?? error?.message ?? response.statusText,
      error?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
