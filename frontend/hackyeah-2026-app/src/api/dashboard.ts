/** City dashboard: `AnalyticsController` (public, aggregated data only). */
import { apiRequest } from '@/api/client';
import type { AnalyticsQuery, AnalyticsSummary, HeatmapResponse, RequestStatus } from '@/api/types';

type HeatmapQuery = AnalyticsQuery & {
  /** Default (empty): all statuses except CANCELLED and UNDER_REVIEW. */
  statuses?: readonly RequestStatus[];
  cellSizeMeters?: number;
};

/** Statuses go as one comma-separated `status` value, which Spring binds to the same set. */
export const getHeatmap = ({ statuses, ...query }: HeatmapQuery = {}) =>
  apiRequest<HeatmapResponse>('/api/analytics/heatmap', {
    query: { ...query, status: statuses?.length ? statuses.join(',') : undefined },
  });

export const getAnalyticsSummary = (query: AnalyticsQuery = {}) =>
  apiRequest<AnalyticsSummary>('/api/analytics/summary', { query });
