import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { completeRequest, getHandoffToken, submitRating } from '@/api/handoff';
import type { RatingDto } from '@/api/types';
import { requestKeys } from '@/features/requests/hooks';

export const handoffKeys = {
  all: ['handoff'] as const,
  qr: (requestId: string) => [...handoffKeys.all, 'qr', requestId] as const,
};

export function useHandoffToken(requestId: string, enabled = true) {
  return useQuery({
    queryKey: handoffKeys.qr(requestId),
    queryFn: () => getHandoffToken(requestId),
    enabled: Boolean(requestId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCompleteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, token }: { requestId: string; token: string }) =>
      completeRequest(requestId, token),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: RatingDto) => submitRating(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.requestId) });
    },
  });
}
