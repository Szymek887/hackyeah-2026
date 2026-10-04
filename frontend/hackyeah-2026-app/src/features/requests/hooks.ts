import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptOffer,
  cancelRequest,
  createRequest,
  getMyRequests,
  getNearbyRequests,
  getRequest,
  getRequestsAlongRoute,
  offerHelp,
  rejectOffer,
} from '@/api/requests';
import type { AlongRouteQuery, HelpRequestView, NearbyQuery, RequestStatus } from '@/api/types';
import { useSession } from '@/features/auth/session-context';

export const requestKeys = {
  all: ['requests'] as const,
  nearby: (query: NearbyQuery) => [...requestKeys.all, 'nearby', query] as const,
  alongRoute: (query: AlongRouteQuery) => [...requestKeys.all, 'along-route', query] as const,
  mine: (userId: number) => [...requestKeys.all, 'mine', userId] as const,
  detail: (id: number, userId: number) => [...requestKeys.all, 'detail', id, userId] as const,
};

export function useNearbyRequests(
  query: NearbyQuery,
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  return useQuery({
    queryKey: requestKeys.nearby(query),
    queryFn: () => getNearbyRequests(query),
    ...options,
  });
}

export function useRequestsAlongRoute(
  query: AlongRouteQuery,
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  return useQuery({
    queryKey: requestKeys.alongRoute(query),
    queryFn: () => getRequestsAlongRoute(query),
    ...options,
  });
}

/**
 * While a request waits for the other side (offer, acceptance, QR scan) we poll, so e.g. the
 * requester showing the QR code sees "completed" a moment after the volunteer scans it.
 * TODO(backend): replace with push / SSE when available.
 */
const LIVE_POLL_MS = 4000;
const WAITING_STATUSES: RequestStatus[] = ['OPEN', 'OFFERED', 'ACCEPTED'];
const isWaiting = (view: HelpRequestView) => WAITING_STATUSES.includes(view.status);

export function useRequest(id: number) {
  const { user } = useSession();
  return useQuery({
    queryKey: requestKeys.detail(id, user.id),
    queryFn: () => getRequest(id),
    enabled: Number.isInteger(id),
    refetchInterval: (query) =>
      query.state.data && isWaiting(query.state.data) ? LIVE_POLL_MS : false,
  });
}

/** `/mine` depends on the `X-User-Id`, so the key includes the user. */
export function useMyRequests(userId: number) {
  return useQuery({
    queryKey: requestKeys.mine(userId),
    queryFn: getMyRequests,
    refetchInterval: (query) => (query.state.data?.some(isWaiting) ? LIVE_POLL_MS : false),
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys.all }),
  });
}

/**
 * Workflow actions return the request as the caller sees it afterwards: put it in the cache right
 * away (no flicker), then refresh lists whose content depends on the status.
 */
function useWorkflowAction(mutationFn: (id: number) => Promise<HelpRequestView>) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn,
    onSuccess: (view) => {
      queryClient.setQueryData(requestKeys.detail(view.id, user.id), view);
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
    },
  });
}

export const useOfferHelp = () => useWorkflowAction(offerHelp);
export const useAcceptOffer = () => useWorkflowAction(acceptOffer);
export const useRejectOffer = () => useWorkflowAction(rejectOffer);
export const useCancelRequest = () => useWorkflowAction(cancelRequest);
