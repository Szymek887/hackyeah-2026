import type { FeatureCollection } from 'geojson';

import type { GeoLineString, LngLat } from '@/api/types';
import type { RouteCoordinate } from '@/lib/route-matching';

export type MapCoordinate = RouteCoordinate;

export const KRAKOW_INITIAL_REGION = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
} as const;

export const KRAKOW_COMMUTE_ROUTE: MapCoordinate[] = [
  { latitude: 50.0541, longitude: 19.9272 },
  { latitude: 50.0585, longitude: 19.9385 },
  { latitude: 50.0647, longitude: 19.945 },
  { latitude: 50.0709, longitude: 19.9561 },
];

export const KRAKOW_COMMUTE_LINE: GeoLineString = {
  type: 'LineString',
  coordinates: KRAKOW_COMMUTE_ROUTE.map(({ longitude, latitude }) => [longitude, latitude]),
};

const oldTownRing: LngLat[] = [
  [19.9284, 50.0649],
  [19.9317, 50.0599],
  [19.9374, 50.0576],
  [19.9449, 50.0592],
  [19.9482, 50.0641],
  [19.9437, 50.0691],
  [19.9361, 50.0704],
  [19.9284, 50.0649],
];

export const KRAKOW_CENTER_GEOJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Centrum Krakowa',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [oldTownRing],
      },
    },
  ],
};

export function toLatLng([longitude, latitude]: LngLat): MapCoordinate {
  return { latitude, longitude };
}
