import type { GeoPoint, LngLat } from '@/api/types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Haversine distance in meters between two [lng, lat] positions. */
export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function point(lat: number, lng: number): GeoPoint {
  return { type: 'Point', coordinates: [lng, lat] };
}

/** Kraków city center, default map position. */
export const DEFAULT_CENTER = { lat: 50.0614, lng: 19.9366 };
