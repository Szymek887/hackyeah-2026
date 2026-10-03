import { useQuery } from '@tanstack/react-query';

import { getAnalyticsSummary, getHeatmap } from '@/api/dashboard';
import type { Category } from '@/api/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  heatmap: (category?: Category) => [...dashboardKeys.all, 'heatmap', category] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

export function useHeatmapData(category?: Category) {
  return useQuery({
    queryKey: dashboardKeys.heatmap(category),
    queryFn: () => getHeatmap({ category }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCitySummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => getAnalyticsSummary(),
    staleTime: 1000 * 60 * 2,
  });
}
