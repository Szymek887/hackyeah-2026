import 'leaflet/dist/leaflet.css';

import { createElement, useEffect, useRef, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FeatureCollection } from 'geojson';
import type { LayerGroup, Map as LeafletMapInstance } from 'leaflet';

import type { HelpRequestPublic } from '@/api/types';
import { CategoryColors, PriorityColors, Radius } from '@/constants/theme';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  KRAKOW_ROUTE_BUFFER,
  toLatLng,
} from '@/features/map/krakow-map-data';

type LeafletMapProps = {
  centerGeoJson?: FeatureCollection;
  matchingRequests: HelpRequestPublic[];
  requests: HelpRequestPublic[];
  showAreas?: boolean;
  showRouteBuffer?: boolean;
};

const leafletElementStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

const routePositions = KRAKOW_COMMUTE_ROUTE.map(
  (coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number],
);

const bufferPositions = KRAKOW_ROUTE_BUFFER.map(
  (coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number],
);

export function LeafletMap({
  centerGeoJson,
  matchingRequests,
  requests,
  showAreas = true,
  showRouteBuffer = false,
}: LeafletMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;

    async function renderMap() {
      const L = await import('leaflet');
      if (disposed || !elementRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(elementRef.current, {
          center: [KRAKOW_INITIAL_REGION.latitude, KRAKOW_INITIAL_REGION.longitude],
          zoom: 14,
          scrollWheelZoom: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(mapRef.current);
      }

      if (overlayRef.current) {
        overlayRef.current.remove();
      }

      const overlays = L.layerGroup().addTo(mapRef.current);
      overlayRef.current = overlays;

      if (centerGeoJson) {
        L.geoJSON(centerGeoJson, {
          style: { color: '#1A73D1', fillColor: '#E6F1FD', fillOpacity: 0.3, weight: 2 },
        }).addTo(overlays);
      }

      if (showRouteBuffer) {
        L.polygon(bufferPositions, {
          color: '#1A73D1',
          fillColor: '#E6F1FD',
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(overlays);
      }

      L.polyline(routePositions, {
        color: '#1A73D1',
        dashArray: showRouteBuffer ? undefined : '8 6',
        weight: 5,
      }).addTo(overlays);

      if (showAreas) {
        requests.forEach((request) => {
          const coordinate = toLatLng(request.area.center.coordinates);
          const categoryColor = CategoryColors[request.category];

          L.circle([coordinate.latitude, coordinate.longitude], {
            color: categoryColor.color,
            fillColor: categoryColor.soft,
            fillOpacity: 0.35,
            radius: request.area.radiusMeters,
            weight: 2,
          })
            .bindPopup(`<strong>${request.title}</strong><br />Priorytet ${request.priority}`)
            .addTo(overlays);
        });
      }

      matchingRequests.forEach((request) => {
        const coordinate = toLatLng(request.area.center.coordinates);
        const priorityColor = PriorityColors[request.priority].color;

        L.circleMarker([coordinate.latitude, coordinate.longitude], {
          color: priorityColor,
          fillColor: priorityColor,
          fillOpacity: 1,
          radius: 8,
          weight: 2,
        })
          .bindPopup(`<strong>${request.title}</strong><br />Zgłoszenie w korytarzu trasy`)
          .addTo(overlays);
      });

      mapRef.current.invalidateSize();
    }

    renderMap();

    return () => {
      disposed = true;
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, [centerGeoJson, matchingRequests, requests, showAreas, showRouteBuffer]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <View style={styles.mapFrame}>
      {createElement('div', { ref: elementRef, style: leafletElementStyle })}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    height: 520,
    overflow: 'hidden',
    borderRadius: Radius.large,
  },
});
