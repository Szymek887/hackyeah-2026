import type { GeoLineString } from '@/api/types';
import type { RouteCoordinate } from '@/lib/route-matching';

const METERS_PER_LATITUDE_DEGREE = 111_320;

export const ROUTE_BUFFER_METERS = 250;
export const MAX_ROUTE_API_POINTS = 100;

type ProjectedCoordinate = {
  x: number;
  y: number;
};

function projectToMeters(
  coordinate: RouteCoordinate,
  referenceLatitude: number,
): ProjectedCoordinate {
  return {
    x:
      coordinate.longitude *
      METERS_PER_LATITUDE_DEGREE *
      Math.cos((referenceLatitude * Math.PI) / 180),
    y: coordinate.latitude * METERS_PER_LATITUDE_DEGREE,
  };
}

export function toRouteLineString(route: RouteCoordinate[]): GeoLineString {
  return {
    type: 'LineString',
    coordinates: route.map(({ longitude, latitude }) => [longitude, latitude]),
  };
}

function perpendicularDistanceMeters(
  point: ProjectedCoordinate,
  start: ProjectedCoordinate,
  end: ProjectedCoordinate,
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared,
    ),
  );

  return Math.hypot(
    point.x - (start.x + segmentX * progress),
    point.y - (start.y + segmentY * progress),
  );
}

function simplifyWithTolerance(route: RouteCoordinate[], toleranceMeters: number) {
  if (route.length <= 2) return route;

  const referenceLatitude =
    route.reduce((sum, coordinate) => sum + coordinate.latitude, 0) / route.length;
  const projected = route.map((coordinate) => projectToMeters(coordinate, referenceLatitude));
  const keep = new Set([0, route.length - 1]);
  const pending: [number, number][] = [[0, route.length - 1]];

  while (pending.length > 0) {
    const [startIndex, endIndex] = pending.pop()!;
    let furthestIndex = -1;
    let furthestDistance = toleranceMeters;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = perpendicularDistanceMeters(
        projected[index],
        projected[startIndex],
        projected[endIndex],
      );
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }

    if (furthestIndex !== -1) {
      keep.add(furthestIndex);
      pending.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
    }
  }

  return [...keep].sort((first, second) => first - second).map((index) => route[index]);
}

/** Preserves road bends while respecting the backend limit for route points. */
export function simplifyRoute(route: RouteCoordinate[], maxPoints = MAX_ROUTE_API_POINTS) {
  if (route.length <= maxPoints) return route;

  let toleranceMeters = 2;
  let simplified = route;
  while (simplified.length > maxPoints && toleranceMeters <= 2048) {
    simplified = simplifyWithTolerance(route, toleranceMeters);
    toleranceMeters *= 2;
  }

  if (simplified.length <= maxPoints) return simplified;

  const lastIndex = simplified.length - 1;
  return Array.from(
    { length: maxPoints },
    (_, index) => simplified[Math.round((index * lastIndex) / (maxPoints - 1))],
  );
}

export function formatRouteDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} godz. ${minutes % 60} min`;
}

export function formatRouteCoordinate({ latitude, longitude }: RouteCoordinate) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
