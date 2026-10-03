import type { ApproximateArea, LngLat } from '@/api/types';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

const METERS_PER_LATITUDE_DEGREE = 111_320;
const HEXAGON_SIDES = 6;

function toMapCoordinate([longitude, latitude]: LngLat): MapCoordinate {
  return { latitude, longitude };
}

function isRenderableRing(ring: LngLat[]) {
  return ring.length >= 3;
}

function createFallbackHexagon(area: ApproximateArea): MapCoordinate[] {
  const [longitude, latitude] = area.center.coordinates;
  const latitudeRadius = area.radiusMeters / METERS_PER_LATITUDE_DEGREE;
  const longitudeRadius =
    area.radiusMeters / (METERS_PER_LATITUDE_DEGREE * Math.cos((latitude * Math.PI) / 180));

  return Array.from({ length: HEXAGON_SIDES }, (_, index) => {
    const angle = (2 * Math.PI * index) / HEXAGON_SIDES;

    return {
      latitude: latitude + latitudeRadius * Math.sin(angle),
      longitude: longitude + longitudeRadius * Math.cos(angle),
    };
  });
}

/** Uses the masked backend polygon when available and a privacy-preserving hexagon for mocks. */
export function getAreaPolygonRings(area: ApproximateArea): MapCoordinate[][] {
  const polygonRings = area.polygon?.coordinates.filter(isRenderableRing);

  if (polygonRings?.length) {
    return polygonRings.map((ring) => ring.map(toMapCoordinate));
  }

  return [createFallbackHexagon(area)];
}
