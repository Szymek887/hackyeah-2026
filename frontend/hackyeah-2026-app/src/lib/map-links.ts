import type { HelpRequestView } from '@/api/types';
import type { RouteCoordinate } from '@/lib/route-matching';

export function requestMapCoordinate(request: HelpRequestView): RouteCoordinate {
  const [longitude, latitude] =
    request.visibility === 'FULL'
      ? request.location.coordinates
      : request.approximateLocation.coordinates;
  return { latitude, longitude };
}

function coordParam(coordinate: RouteCoordinate) {
  return `${coordinate.latitude},${coordinate.longitude}`;
}

export function googleRouteViaStopUrl(
  start: RouteCoordinate,
  end: RouteCoordinate,
  stop: RouteCoordinate,
) {
  return [
    'https://www.google.com/maps/dir/?api=1',
    `origin=${encodeURIComponent(coordParam(start))}`,
    `destination=${encodeURIComponent(coordParam(end))}`,
    `waypoints=${encodeURIComponent(coordParam(stop))}`,
    'travelmode=driving',
  ].join('&');
}

export function googlePointUrl(point: RouteCoordinate) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordParam(point))}`;
}

export function appleDirectionsToStopUrl(start: RouteCoordinate, stop: RouteCoordinate) {
  return [
    'https://maps.apple.com/?dirflg=d',
    `saddr=${encodeURIComponent(coordParam(start))}`,
    `daddr=${encodeURIComponent(coordParam(stop))}`,
  ].join('&');
}
