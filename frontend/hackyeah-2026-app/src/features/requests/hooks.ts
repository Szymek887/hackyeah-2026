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
import type { AlongRouteQuery, HelpRequestView, NearbyQuery } from '@/api/types';

export const requestKeys = {
  all: ['requests'] as const,
  nearby: (query: NearbyQuery) => [...requestKeys.all, 'nearby', query] as const,
  alongRoute: (query: AlongRouteQuery) => [...requestKeys.all, 'along-route', query] as const,
  mine: (userId: number) => [...requestKeys.all, 'mine', userId] as const,
  detail: (id: number) => [...requestKeys.all, 'detail', id] as const,
};

export function useNearbyRequests(query: NearbyQuery) {
  return useQuery({
    queryKey: requestKeys.nearby(query),
    queryFn: () => getNearbyRequests(query),
  });
}

export function useRequestsAlongRoute(query: AlongRouteQuery) {
  return useQuery({
    queryKey: requestKeys.alongRoute(query),
    queryFn: () => getRequestsAlongRoute(query),
  });
}

export function useRequest(id: number) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: () => getRequest(id),
    enabled: Number.isInteger(id),
  });
}

/** `/mine` depends on the `X-User-Id`, so the key includes the user. */
export function useMyRequests(userId: number) {
  return useQuery({
    queryKey: requestKeys.mine(userId),
    queryFn: getMyRequests,
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
  return useMutation({
    mutationFn,
    onSuccess: (view) => {
      queryClient.setQueryData(requestKeys.detail(view.id), view);
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
    },
  });
}

export const useOfferHelp = () => useWorkflowAction(offerHelp);
export const useAcceptOffer = () => useWorkflowAction(acceptOffer);
export const useRejectOffer = () => useWorkflowAction(rejectOffer);
export const useCancelRequest = () => useWorkflowAction(cancelRequest);
