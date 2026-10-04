import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { approveRequest, dismissRequest, getReviewQueue } from '@/api/admin';
import { getAnalyticsSummary, getHeatmap } from '@/api/dashboard';
import type { Category } from '@/api/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  heatmap: (category?: Category) => [...dashboardKeys.all, 'heatmap', category] as const,
  summary: (category?: Category) => [...dashboardKeys.all, 'summary', category] as const,
  reviewQueue: () => [...dashboardKeys.all, 'review-queue'] as const,
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

/** Requests the AI held back. Polled, so a request created during the demo shows up by itself. */
export function useReviewQueue() {
  return useQuery({
    queryKey: dashboardKeys.reviewQueue(),
    queryFn: getReviewQueue,
    refetchInterval: 1000 * 20,
  });
}

export type ModerationDecision = 'approve' | 'dismiss';

/** Approve or dismiss; refreshes the queue and the numbers (an approved request becomes OPEN). */
export function useModerationDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: ModerationDecision }) =>
      decision === 'approve' ? approveRequest(id) : dismissRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}
