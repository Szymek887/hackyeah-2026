import { useQuery } from '@tanstack/react-query';

import { getDrivingRoute } from '@/api/routing';
import type { RouteCoordinate } from '@/lib/route-matching';

export function useDrivingRoute(start: RouteCoordinate, end: RouteCoordinate) {
  return useQuery({
    queryKey: ['driving-route', start.latitude, start.longitude, end.latitude, end.longitude],
    queryFn: ({ signal }) => getDrivingRoute(start, end, signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
