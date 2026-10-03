import type { GeoPolygon, LngLat } from '@/api/types';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

function toMapCoordinate([longitude, latitude]: LngLat): MapCoordinate {
  return { latitude, longitude };
}

/** Rings of the backend `maskedArea` (300 m cell around the request) as map coordinates. */
export function getAreaPolygonRings(maskedArea: GeoPolygon): MapCoordinate[][] {
  return maskedArea.coordinates
    .filter((ring) => ring.length >= 3)
    .map((ring) => ring.map(toMapCoordinate));
}
