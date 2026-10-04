import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getAnalyticsSummary, getHeatmap } from '@/api/dashboard';
import type { Category } from '@/api/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  heatmap: (category?: Category) => [...dashboardKeys.all, 'heatmap', category] as const,
  summary: (category?: Category) => [...dashboardKeys.all, 'summary', category] as const,
};

export function useHeatmapData(category?: Category) {
  return useQuery({
    queryKey: dashboardKeys.heatmap(category),
    queryFn: () => getHeatmap({ category }),
    staleTime: 1000 * 60 * 2,
    // Keep the current numbers on screen while a new filter loads, instead of a blank spinner.
    placeholderData: keepPreviousData,
  });
}

export function useCitySummary(category?: Category) {
  return useQuery({
    queryKey: dashboardKeys.summary(category),
    queryFn: () => getAnalyticsSummary({ category }),
    staleTime: 1000 * 60 * 2,
    // Keep the current numbers on screen while a new filter loads, instead of a blank spinner.
    placeholderData: keepPreviousData,
  });
}
