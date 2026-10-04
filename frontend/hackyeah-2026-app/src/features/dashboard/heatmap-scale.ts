import type { Category, GeoPolygon } from '@/api/types';
import { HeatmapScaleColors } from '@/constants/theme';

/** One hexagon of the city heatmap, as drawn by `CityHeatmapMap`. */
export type HeatmapCell = {
  /** Requests in the hexagon (never below the backend k-anonymity threshold of 3). */
  count: number;
  byCategory: Record<Category, number>;
  area: GeoPolygon;
};

/**
 * Fixed count bins, so a colour means the same number of requests whatever filter is on.
 * The first bin starts at 3 because smaller hexagons are never returned.
 */
export const HEATMAP_BINS = [
  { min: 3, label: '3–4', color: HeatmapScaleColors[0] },
  { min: 5, label: '5–7', color: HeatmapScaleColors[1] },
  { min: 8, label: '8–11', color: HeatmapScaleColors[2] },
  { min: 12, label: '12–19', color: HeatmapScaleColors[3] },
  { min: 20, label: '20+', color: HeatmapScaleColors[4] },
] as const;

export function heatmapColor(count: number): string {
  return HEATMAP_BINS.findLast((bin) => count >= bin.min)?.color ?? HEATMAP_BINS[0].color;
}

/** Hexagons are see-through so streets and district names stay readable underneath. */
export const HEATMAP_FILL_OPACITY = 0.6;
export const HEATMAP_FILL_OPACITY_ACTIVE = 0.85;

/** "1 zgłoszenie", "3 zgłoszenia", "5 zgłoszeń", "22 zgłoszenia" (Polish plural forms). */
export function requestsLabel(count: number): string {
  if (count === 1) return '1 zgłoszenie';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
  return `${count} ${few ? 'zgłoszenia' : 'zgłoszeń'}`;
}
