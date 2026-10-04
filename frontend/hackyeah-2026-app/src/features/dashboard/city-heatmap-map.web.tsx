import 'leaflet/dist/leaflet.css';

import { createElement, useEffect, useRef, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayerGroup, Map as LeafletMapInstance } from 'leaflet';

import { Colors, HeatmapCellBorder, Radius } from '@/constants/theme';
import {
  HEATMAP_FILL_OPACITY,
  HEATMAP_FILL_OPACITY_ACTIVE,
  categoryBreakdown,
  heatmapColor,
  requestsLabel,
  type HeatmapCell,
} from '@/features/dashboard/heatmap-scale';
import { useTheme } from '@/hooks/use-theme';

type CityHeatmapMapProps = {
  cells: HeatmapCell[];
};

/**
 * Hover details of a hexagon. Leaflet tooltips are always white, so the light text tokens are
 * used in both themes; category names come from fixed labels, never from user input.
 */
function tooltipHtml(cell: HeatmapCell): string {
  const { text, textSecondary } = Colors.light;
  const rows = categoryBreakdown(cell)
    .map(
      ({ label, color, count }) => `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 4px; background: ${color};"></span>
          <span style="flex: 1;">${label}</span>
          <strong>${count}</strong>
        </div>`,
    )
    .join('');
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: ${text}; min-width: 160px; display: grid; gap: 4px;">
      <strong style="font-size: 13px;">${requestsLabel(cell.count)} w tym obszarze</strong>
      <span style="color: ${textSecondary};">Czeka na pomoc: ${cell.open}</span>
      ${rows}
    </div>`;
}

const leafletElementStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];

export function CityHeatmapMap({ cells }: CityHeatmapMapProps) {
  const theme = useTheme();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      const L = await import('leaflet');
      if (disposed || !elementRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(elementRef.current, {
          center: KRAKOW_CENTER,
          zoom: 13,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(mapRef.current);
      }

      if (overlayRef.current) {
        overlayRef.current.remove();
      }

      const overlays = L.layerGroup().addTo(mapRef.current);
      overlayRef.current = overlays;

      // One hexagon per cell, drawn from the outline the backend computed (`properties.area`).
      // No district labels of our own: the OpenStreetMap tiles already show district names.
      cells.forEach((cell) => {
        const hexagon = L.polygon(
          cell.area.coordinates.map((ring) =>
            ring.map(([lng, lat]) => [lat, lng] as [number, number]),
          ),
          {
            color: HeatmapCellBorder,
            weight: 2,
            fillColor: heatmapColor(cell.count),
            fillOpacity: HEATMAP_FILL_OPACITY,
          },
        );
        hexagon.bindTooltip(tooltipHtml(cell), { sticky: true, direction: 'top' });
        hexagon.on('mouseover', () =>
          hexagon.setStyle({ fillOpacity: HEATMAP_FILL_OPACITY_ACTIVE, weight: 3 }),
        );
        hexagon.on('mouseout', () =>
          hexagon.setStyle({ fillOpacity: HEATMAP_FILL_OPACITY, weight: 2 }),
        );
        hexagon.addTo(overlays);
      });

      mapRef.current.invalidateSize();
    }

    initMap();

    return () => {
      disposed = true;
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, [cells]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <View style={[styles.mapFrame, { borderColor: theme.border }]}>
      {createElement('div', { ref: elementRef, style: leafletElementStyle })}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    height: 440,
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.large,
    borderWidth: 1,
  },
});
