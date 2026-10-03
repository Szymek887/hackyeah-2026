import 'leaflet/dist/leaflet.css';

import { createElement, useEffect, useRef, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FeatureCollection } from 'geojson';
import type { LayerGroup, Map as LeafletMapInstance } from 'leaflet';

import type { HelpRequestListItem } from '@/api/types';
import { CategoryColors, PriorityColors, Radius } from '@/constants/theme';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  KRAKOW_ROUTE_BUFFER,
  toLatLng,
} from '@/features/map/krakow-map-data';
import type { RouteCoordinate } from '@/lib/route-matching';

export type RouteEndpoint = 'start' | 'end';

type LeafletMapProps = {
  centerGeoJson?: FeatureCollection;
  matchingRequests: HelpRequestListItem[];
  requests: HelpRequestListItem[];
  showAreas?: boolean;
  showRouteBuffer?: boolean;
  routeCoordinates?: RouteCoordinate[];
  routeBufferCoordinates?: RouteCoordinate[];
  editableRoute?: boolean;
  onMapPress?: (coordinate: RouteCoordinate) => void;
  onRouteEndpointChange?: (endpoint: RouteEndpoint, coordinate: RouteCoordinate) => void;
};

const leafletElementStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

export function LeafletMap({
  centerGeoJson,
  matchingRequests,
  requests,
  showAreas = true,
  showRouteBuffer = false,
  routeCoordinates = KRAKOW_COMMUTE_ROUTE,
  routeBufferCoordinates = KRAKOW_ROUTE_BUFFER,
  editableRoute = false,
  onMapPress,
  onRouteEndpointChange,
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
      const routePositions = routeCoordinates.map(
        (coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number],
      );
      const bufferPositions = routeBufferCoordinates.map(
        (coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number],
      );

      mapRef.current.off('click');
      if (onMapPress) {
        mapRef.current.on('click', ({ latlng }) => {
          onMapPress({ latitude: latlng.lat, longitude: latlng.lng });
        });
      }

      if (centerGeoJson) {
        L.geoJSON(centerGeoJson, {
          style: { color: '#1A73D1', fillColor: '#E6F1FD', fillOpacity: 0.3, weight: 2 },
        }).addTo(overlays);
      }

      if (showRouteBuffer && bufferPositions.length >= 3) {
        L.polygon(bufferPositions, {
          color: '#1A73D1',
          fillColor: '#E6F1FD',
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(overlays);
      }

      if (routePositions.length >= 2) {
        L.polyline(routePositions, {
          color: '#1A73D1',
          dashArray: showRouteBuffer ? undefined : '8 6',
          weight: 5,
        }).addTo(overlays);
      }

      if (editableRoute && routeCoordinates.length >= 2) {
        const endpointEntries: [RouteEndpoint, RouteCoordinate, string, string][] = [
          ['start', routeCoordinates[0], 'A', PriorityColors[3].color],
          ['end', routeCoordinates[routeCoordinates.length - 1], 'B', PriorityColors[1].color],
        ];

        endpointEntries.forEach(([endpoint, coordinate, label, color]) => {
          const marker = L.marker([coordinate.latitude, coordinate.longitude], {
            draggable: true,
            icon: L.divIcon({
              className: '',
              html: `<div style="width:32px;height:32px;border-radius:16px;background:${color};color:white;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
              iconAnchor: [16, 16],
              iconSize: [32, 32],
            }),
          }).addTo(overlays);

          marker.on('dragend', () => {
            const position = marker.getLatLng();
            onRouteEndpointChange?.(endpoint, {
              latitude: position.lat,
              longitude: position.lng,
            });
          });
        });
      }

      if (showAreas) {
        requests.forEach((request) => {
          const categoryColor = CategoryColors[request.category];
          const polygonRings = getAreaPolygonRings(request.maskedArea).map((ring) =>
            ring.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
          );

          L.polygon(polygonRings, {
            color: categoryColor.color,
            fillColor: categoryColor.soft,
            fillOpacity: 0.35,
            weight: 2,
          })
            .bindPopup(`<strong>${request.title}</strong><br />Priorytet ${request.priority}`)
            .addTo(overlays);
        });
      }

      matchingRequests.forEach((request) => {
        const coordinate = toLatLng(request.approximateLocation.coordinates);
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
  }, [
    centerGeoJson,
    editableRoute,
    matchingRequests,
    onMapPress,
    onRouteEndpointChange,
    requests,
    routeBufferCoordinates,
    routeCoordinates,
    showAreas,
    showRouteBuffer,
  ]);

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
