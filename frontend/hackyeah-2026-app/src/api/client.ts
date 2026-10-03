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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

/** Thin fetch wrapper. All backend calls go through here so auth headers / error handling live in one place. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, query }: RequestOptions = {},
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
      // TODO(auth): add user header / token once backend auth mock is ready.
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, error?.message ?? response.statusText, error?.code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
