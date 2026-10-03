import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRequest, getNearbyRequests, getRequest } from '@/api/requests';
import type { NearbyQuery } from '@/api/types';

export const requestKeys = {
  all: ['requests'] as const,
  nearby: (query: NearbyQuery) => [...requestKeys.all, 'nearby', query] as const,
  detail: (id: string) => [...requestKeys.all, 'detail', id] as const,
};

export function useNearbyRequests(query: NearbyQuery) {
  return useQuery({
    queryKey: requestKeys.nearby(query),
    queryFn: () => getNearbyRequests(query),
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: () => getRequest(id),
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys.all }),
  });
}
