import type { GeoLineString } from '@/api/types';
import type { RouteCoordinate } from '@/lib/route-matching';

const METERS_PER_LATITUDE_DEGREE = 111_320;

export const ROUTE_BUFFER_METERS = 450;

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

function unprojectFromMeters(
  coordinate: ProjectedCoordinate,
  referenceLatitude: number,
): RouteCoordinate {
  return {
    latitude: coordinate.y / METERS_PER_LATITUDE_DEGREE,
    longitude:
      coordinate.x / (METERS_PER_LATITUDE_DEGREE * Math.cos((referenceLatitude * Math.PI) / 180)),
  };
}

export function toRouteLineString(route: RouteCoordinate[]): GeoLineString {
  return {
    type: 'LineString',
    coordinates: route.map(({ longitude, latitude }) => [longitude, latitude]),
  };
}

/** Creates a visual corridor around a short city route without exposing exact request locations. */
export function createRouteBuffer(
  route: RouteCoordinate[],
  bufferMeters: number,
): RouteCoordinate[] {
  if (route.length < 2) return [];

  const referenceLatitude =
    route.reduce((sum, coordinate) => sum + coordinate.latitude, 0) / route.length;
  const projectedRoute = route.map((coordinate) => projectToMeters(coordinate, referenceLatitude));
  const left: ProjectedCoordinate[] = [];
  const right: ProjectedCoordinate[] = [];

  projectedRoute.forEach((coordinate, index) => {
    const previous = projectedRoute[Math.max(0, index - 1)];
    const next = projectedRoute[Math.min(projectedRoute.length - 1, index + 1)];
    const directionX = next.x - previous.x;
    const directionY = next.y - previous.y;
    const directionLength = Math.hypot(directionX, directionY) || 1;
    const normalX = (-directionY / directionLength) * bufferMeters;
    const normalY = (directionX / directionLength) * bufferMeters;

    left.push({ x: coordinate.x + normalX, y: coordinate.y + normalY });
    right.push({ x: coordinate.x - normalX, y: coordinate.y - normalY });
  });

  return [...left, ...right.reverse()].map((coordinate) =>
    unprojectFromMeters(coordinate, referenceLatitude),
  );
}

export function formatRouteCoordinate({ latitude, longitude }: RouteCoordinate) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
