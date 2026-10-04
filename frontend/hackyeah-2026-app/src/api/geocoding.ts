import { Platform } from 'react-native';

import type { RouteCoordinate } from '@/lib/route-matching';

/** Public OpenStreetMap geocoder (no key), fine for the demo's low traffic. */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

type NominatimReverseResponse = {
  error?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    square?: string;
    path?: string;
    house_number?: string;
    suburb?: string;
    city_district?: string;
  };
};

export type ReverseGeocodedAddress = {
  /** Street name, may be empty when the point is not on a named street. */
  street: string;
  /** House number, empty when OpenStreetMap does not know it for this point. */
  buildingNumber: string;
  district: string;
};

/** Coordinates → nearest street address (for "Użyj mojej lokalizacji" in the request form). */
export async function reverseGeocode(
  { latitude, longitude }: RouteCoordinate,
  signal?: AbortSignal,
): Promise<ReverseGeocodedAddress> {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'pl',
  });
  const response = await fetch(`${NOMINATIM_URL}/reverse?${query}`, {
    signal,
    // Nominatim asks apps to identify themselves; browsers send their own User-Agent.
    headers: Platform.OS === 'web' ? undefined : { 'User-Agent': 'PoDrodze/1.0 (HackYeah 2026)' },
  });
  if (!response.ok) {
    throw new Error(`Geocoding service responded with ${response.status}`);
  }

  const payload = (await response.json()) as NominatimReverseResponse;
  const address = payload.address;
  if (payload.error || !address) {
    throw new Error('No address found for this place');
  }

  return {
    street:
      address.road ?? address.pedestrian ?? address.square ?? address.footway ?? address.path ?? '',
    buildingNumber: address.house_number ?? '',
    district: address.suburb ?? address.city_district ?? '',
  };
}
