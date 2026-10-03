import type { HelpRequestListItem, Priority } from '@/api/types';
import { toLatLng } from '@/features/map/krakow-map-data';
import type { RouteCoordinate } from '@/lib/route-matching';

const METERS_PER_LATITUDE_DEGREE = 111_320;

export type RequestMapCluster = {
  id: string;
  coordinate: RouteCoordinate;
  requests: HelpRequestListItem[];
  priority: Priority;
};

export function zoomFromLongitudeDelta(longitudeDelta: number) {
  return Math.log2(360 / Math.max(longitudeDelta, 0.0001));
}

/** From this zoom on every request is its own point (and gets a label on the web map). */
export const NO_CLUSTER_ZOOM = 17;
/** Highest zoom of the maps (OpenStreetMap tiles go up to 19). */
export const MAX_MAP_ZOOM = 19;

/** Points closer than this are fanned out around their centre so each one can be tapped. */
const OVERLAP_METERS = 15;
const SPREAD_RADIUS_METERS = 22;

function clusterCellMeters(zoom: number) {
  return Math.max(60, Math.min(700, 450 * 2 ** (14 - zoom)));
}

/**
 * Close-up view: one point per request. Requests at (almost) the same spot are placed on a small
 * circle around it – still well inside their ~300 m masked area – instead of hiding each other.
 */
function separateRequests(requests: HelpRequestListItem[], longitudeMeters: number) {
  const stacks = new Map<string, HelpRequestListItem[]>();
  requests.forEach((request) => {
    const { latitude, longitude } = toLatLng(request.approximateLocation.coordinates);
    const key = `${Math.round((longitude * longitudeMeters) / OVERLAP_METERS)}:${Math.round(
      (latitude * METERS_PER_LATITUDE_DEGREE) / OVERLAP_METERS,
    )}`;
    stacks.set(key, [...(stacks.get(key) ?? []), request]);
  });

  return [...stacks.values()].flatMap((stack) =>
    stack.map((request, index): RequestMapCluster => {
      const point = toLatLng(request.approximateLocation.coordinates);
      const angle = (2 * Math.PI * index) / stack.length;
      const radius = stack.length > 1 ? SPREAD_RADIUS_METERS : 0;
      return {
        id: `r${request.id}`,
        coordinate: {
          latitude: point.latitude + (radius * Math.sin(angle)) / METERS_PER_LATITUDE_DEGREE,
          longitude: point.longitude + (radius * Math.cos(angle)) / longitudeMeters,
        },
        requests: [request],
        priority: request.priority,
      };
    }),
  );
}

/** Lightweight grid clustering shared by native maps and Leaflet. */
export function clusterRequests(requests: HelpRequestListItem[], zoom: number) {
  if (requests.length === 0) return [];

  const referenceLatitude =
    requests.reduce((sum, request) => sum + request.approximateLocation.coordinates[1], 0) /
    requests.length;
  const cellMeters = clusterCellMeters(zoom);
  const longitudeMeters =
    METERS_PER_LATITUDE_DEGREE * Math.cos((referenceLatitude * Math.PI) / 180);
  if (zoom >= NO_CLUSTER_ZOOM) return separateRequests(requests, longitudeMeters);
  const groups = new Map<string, HelpRequestListItem[]>();

  requests.forEach((request) => {
    const { latitude, longitude } = toLatLng(request.approximateLocation.coordinates);
    const key = `${Math.floor((longitude * longitudeMeters) / cellMeters)}:${Math.floor(
      (latitude * METERS_PER_LATITUDE_DEGREE) / cellMeters,
    )}`;
    groups.set(key, [...(groups.get(key) ?? []), request]);
  });

  return [...groups.entries()].map(([id, groupedRequests]): RequestMapCluster => {
    const coordinate = groupedRequests.reduce(
      (sum, request) => {
        const point = toLatLng(request.approximateLocation.coordinates);
        return {
          latitude: sum.latitude + point.latitude / groupedRequests.length,
          longitude: sum.longitude + point.longitude / groupedRequests.length,
        };
      },
      { latitude: 0, longitude: 0 },
    );

    return {
      id,
      coordinate,
      requests: groupedRequests,
      priority: Math.min(...groupedRequests.map((request) => request.priority)) as Priority,
    };
  });
}
