import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { completeRequest, getHandoffToken, rateRequest } from '@/api/requests';
import type { HelpRequestView, RatingDto } from '@/api/types';
import { useSession } from '@/features/auth/session-context';
import { requestKeys } from '@/features/requests/hooks';

export const handoffKeys = {
  all: ['handoff'] as const,
  qr: (requestId: number, userId: number) => [...handoffKeys.all, 'qr', requestId, userId] as const,
};

/** Requester only, ACCEPTED only (otherwise the backend answers 403 / 409). */
export function useHandoffToken(requestId: number, enabled = true) {
  const { user } = useSession();
  return useQuery({
    queryKey: handoffKeys.qr(requestId, user.id),
    queryFn: () => getHandoffToken(requestId),
    enabled: Number.isInteger(requestId) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompleteRequest() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: ({ requestId, token }: { requestId: number; token: string }) =>
      completeRequest(requestId, token),
    onSuccess: (view) => {
      queryClient.setQueryData(requestKeys.detail(view.id, user.id), view);
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: handoffKeys.all });
    },
  });
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: ({ requestId, ...dto }: RatingDto & { requestId: number }) =>
      rateRequest(requestId, dto),
    onSuccess: (result, { requestId }) => {
      const markRatedLocally = (view: HelpRequestView): HelpRequestView => ({
        ...view,
        status: 'RATED' as const,
      });

      queryClient.setQueryData<HelpRequestView>(
        requestKeys.detail(requestId, user.id),
        (current) => (current ? markRatedLocally(current) : current),
      );
      queryClient.setQueryData<HelpRequestView[]>(requestKeys.mine(user.id), (current) =>
        current?.map((view) => (view.id === requestId ? markRatedLocally(view) : view)),
      );
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });
}
