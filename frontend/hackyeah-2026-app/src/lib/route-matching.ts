import type { HelpRequestPublic, LngLat } from '@/api/types';
import { distanceMeters } from '@/lib/geo';

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

const METERS_PER_LAT_DEGREE = 111_320;

function projectToMeters([lng, lat]: LngLat, referenceLat: number) {
  const x = lng * METERS_PER_LAT_DEGREE * Math.cos((referenceLat * Math.PI) / 180);
  const y = lat * METERS_PER_LAT_DEGREE;
  return { x, y };
}

function coordinateToLngLat(coordinate: RouteCoordinate): LngLat {
  return [coordinate.longitude, coordinate.latitude];
}

export function distanceToRouteMeters(point: LngLat, route: RouteCoordinate[]) {
  if (route.length === 0) return Number.POSITIVE_INFINITY;
  if (route.length === 1) return distanceMeters(point, coordinateToLngLat(route[0]));

  const referenceLat =
    route.reduce((sum, coordinate) => sum + coordinate.latitude, point[1]) / (route.length + 1);
  const projectedPoint = projectToMeters(point, referenceLat);

  return route.slice(0, -1).reduce((shortest, start, index) => {
    const projectedStart = projectToMeters(coordinateToLngLat(start), referenceLat);
    const projectedEnd = projectToMeters(coordinateToLngLat(route[index + 1]), referenceLat);
    const segmentX = projectedEnd.x - projectedStart.x;
    const segmentY = projectedEnd.y - projectedStart.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const rawProgress =
      segmentLengthSquared === 0
        ? 0
        : ((projectedPoint.x - projectedStart.x) * segmentX +
            (projectedPoint.y - projectedStart.y) * segmentY) /
          segmentLengthSquared;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const closest = {
      x: projectedStart.x + segmentX * progress,
      y: projectedStart.y + segmentY * progress,
    };
    const distance = Math.hypot(projectedPoint.x - closest.x, projectedPoint.y - closest.y);

    return Math.min(shortest, distance);
  }, Number.POSITIVE_INFINITY);
}

export function filterRequestsAlongRoute(
  requests: HelpRequestPublic[],
  route: RouteCoordinate[],
  bufferMeters: number,
) {
  return requests.filter(
    (request) => distanceToRouteMeters(request.area.center.coordinates, route) <= bufferMeters,
  );
}
