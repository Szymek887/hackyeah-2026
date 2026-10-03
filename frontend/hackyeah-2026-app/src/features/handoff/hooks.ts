import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { completeRequest, getHandoffToken, rateRequest } from '@/api/requests';
import type { RatingDto } from '@/api/types';
import { requestKeys } from '@/features/requests/hooks';

export const handoffKeys = {
  all: ['handoff'] as const,
  qr: (requestId: number) => [...handoffKeys.all, 'qr', requestId] as const,
};

/** Requester only, ACCEPTED only (otherwise the backend answers 403 / 409). */
export function useHandoffToken(requestId: number, enabled = true) {
  return useQuery({
    queryKey: handoffKeys.qr(requestId),
    queryFn: () => getHandoffToken(requestId),
    enabled: Number.isInteger(requestId) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompleteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, token }: { requestId: number; token: string }) =>
      completeRequest(requestId, token),
    onSuccess: (view) => {
      queryClient.setQueryData(requestKeys.detail(view.id), view);
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...dto }: RatingDto & { requestId: number }) =>
      rateRequest(requestId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys.all }),
  });
}
