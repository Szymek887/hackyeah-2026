import type { LngLat } from '@/api/types';
import type { RouteCoordinate } from '@/lib/route-matching';

const OSRM_URL = 'https://router.project-osrm.org';

type OsrmRouteResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: LngLat[];
    };
  }[];
};

export type DrivingRoute = {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
};

/** Fetches a road-following route. The public OSRM instance is suitable for the demo build. */
export async function getDrivingRoute(
  start: RouteCoordinate,
  end: RouteCoordinate,
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  const points = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const query = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  });
  const response = await fetch(`${OSRM_URL}/route/v1/driving/${points}?${query}`, { signal });

  if (!response.ok) {
    throw new Error(`Routing service responded with ${response.status}`);
  }

  const payload = (await response.json()) as OsrmRouteResponse;
  const route = payload.routes?.[0];

  if (payload.code !== 'Ok' || !route || route.geometry.coordinates.length < 2) {
    throw new Error('No road route found');
  }

  return {
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
