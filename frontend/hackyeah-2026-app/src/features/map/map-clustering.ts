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

function clusterCellMeters(zoom: number) {
  return Math.max(60, Math.min(700, 450 * 2 ** (14 - zoom)));
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
