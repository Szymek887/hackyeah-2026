/** City admin moderation: `AdminController` (CITY_ADMIN only, 403 for other roles). */
import { apiRequest } from '@/api/client';
import type { ModerationItem } from '@/api/types';

const BASE = '/api/admin';

/** Requests the AI held back as suspected scams (UNDER_REVIEW), oldest first. */
export const getReviewQueue = () => apiRequest<ModerationItem[]>(`${BASE}/review-queue`);

/** UNDER_REVIEW -> OPEN: published to volunteers. */
export const approveRequest = (id: number) =>
  apiRequest<ModerationItem>(`${BASE}/help-requests/${id}/approve`, { method: 'POST' });

/** UNDER_REVIEW -> CANCELLED: never published. */
export const dismissRequest = (id: number) =>
  apiRequest<ModerationItem>(`${BASE}/help-requests/${id}/dismiss`, { method: 'POST' });
