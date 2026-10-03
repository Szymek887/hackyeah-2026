/** City dashboard: `AnalyticsController` (public, aggregated data only). */
import { apiRequest } from '@/api/client';
import type { AnalyticsQuery, AnalyticsSummary, HeatmapResponse } from '@/api/types';

export const getHeatmap = (query: AnalyticsQuery & { cellSizeMeters?: number } = {}) =>
  apiRequest<HeatmapResponse>('/api/analytics/heatmap', { query });

export const getAnalyticsSummary = (query: AnalyticsQuery = {}) =>
  apiRequest<AnalyticsSummary>('/api/analytics/summary', { query });
