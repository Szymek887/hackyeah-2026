import 'leaflet/dist/leaflet.css';

import { createElement, useEffect, useRef, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayerGroup, Map as LeafletMapInstance } from 'leaflet';

import type { HeatmapPoint } from '@/api/types';
import { CategoryColors, Radius } from '@/constants/theme';
import { CategoryLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

type CityHeatmapMapProps = {
  points: HeatmapPoint[];
};

const leafletElementStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];

const DISTRICT_CENTERS = [
  { name: 'Stare Miasto', lat: 50.0619, lng: 19.9367 },
  { name: 'Krowodrza', lat: 50.0715, lng: 19.923 },
  { name: 'Grzegórzki', lat: 50.062, lng: 19.965 },
  { name: 'Podgórze', lat: 50.0435, lng: 19.948 },
  { name: 'Dębniki', lat: 50.045, lng: 19.922 },
  { name: 'Prądnik Czerwony', lat: 50.086, lng: 19.952 },
];

export function CityHeatmapMap({ points }: CityHeatmapMapProps) {
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

      // Add district labels for quick spatial orientation in Krakow
      DISTRICT_CENTERS.forEach((district) => {
        const icon = L.divIcon({
          className: 'leaflet-district-badge',
          html: `<div style="background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(4px); border: 1px solid #CBD5E1; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.12); pointer-events: none; transform: translate(-50%, -50%);">${district.name}</div>`,
          iconSize: [0, 0],
        });
        L.marker([district.lat, district.lng], { icon, interactive: false }).addTo(overlays);
      });

      // Render heat diffusion halos and core point markers
      points.forEach((pt) => {
        const catConfig = CategoryColors[pt.category] ?? {
          color: theme.primary,
          soft: theme.primarySoft,
        };
        const catLabel = CategoryLabels[pt.category] ?? pt.category;
        const intensity = Math.round(pt.weight * 100);

        // Outer diffused heat aura
        L.circle([pt.lat, pt.lng], {
          radius: 170 + pt.weight * 260,
          color: 'transparent',
          fillColor: catConfig.color,
          fillOpacity: 0.16 + pt.weight * 0.18,
          interactive: false,
        }).addTo(overlays);

        // Mid intensity ring
        L.circle([pt.lat, pt.lng], {
          radius: 80 + pt.weight * 120,
          color: 'transparent',
          fillColor: catConfig.color,
          fillOpacity: 0.3 + pt.weight * 0.2,
          interactive: false,
        }).addTo(overlays);

        // Core marker with white stroke and popup
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius: 8 + pt.weight * 8,
          color: '#ffffff',
          weight: 2,
          fillColor: catConfig.color,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 150px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: ${catConfig.color}; margin-bottom: 4px;">
              ${catLabel}
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #0F172A; margin-bottom: 2px;">
              Wskaźnik zapotrzebowania: ${intensity}%
            </div>
            <div style="font-size: 11px; color: #64748B;">
              Korytarz zgłoszeń sąsiedzkich
            </div>
          </div>
        `);

        marker.addTo(overlays);
      });

      mapRef.current.invalidateSize();
    }

    initMap();

    return () => {
      disposed = true;
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, [points, theme.primary, theme.primarySoft]);

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
