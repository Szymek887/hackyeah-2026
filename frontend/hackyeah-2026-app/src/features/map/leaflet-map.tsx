import 'leaflet/dist/leaflet.css';

import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FeatureCollection } from 'geojson';
import type { LayerGroup, Map as LeafletMapInstance } from 'leaflet';

import type { HelpRequestListItem } from '@/api/types';
import { CategoryColors, Colors, PriorityColors, Radius } from '@/constants/theme';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import {
  KRAKOW_COMMUTE_ROUTE,
  KRAKOW_INITIAL_REGION,
  toLatLng,
} from '@/features/map/krakow-map-data';
import { clusterRequests } from '@/features/map/map-clustering';
import type { RouteCoordinate } from '@/lib/route-matching';

export type RouteEndpoint = 'start' | 'end';

type LeafletMapProps = {
  centerGeoJson?: FeatureCollection;
  matchingRequests: HelpRequestListItem[];
  requests: HelpRequestListItem[];
  showAreas?: boolean;
  showRouteBuffer?: boolean;
  routeCoordinates?: RouteCoordinate[];
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
  editableRoute = false,
  onMapPress,
  onRouteEndpointChange,
}: LeafletMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const fittedRouteRef = useRef('');
  const [zoom, setZoom] = useState(14);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const markerRequests = showRouteBuffer ? matchingRequests : requests;
  const requestClusters = useMemo(
    () => clusterRequests(markerRequests, zoom),
    [markerRequests, zoom],
  );
  const selectedRequest = markerRequests.find((request) => request.id === selectedRequestId);

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
        mapRef.current.on('zoomend', () => setZoom(mapRef.current?.getZoom() ?? 14));
      }

      if (overlayRef.current) {
        overlayRef.current.remove();
      }

      const overlays = L.layerGroup().addTo(mapRef.current);
      overlayRef.current = overlays;
      const routePositions = routeCoordinates.map(
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
          style: {
            color: Colors.light.primary,
            fillColor: Colors.light.primarySoft,
            fillOpacity: 0.2,
            weight: 1,
          },
        }).addTo(overlays);
      }

      if (showRouteBuffer && routePositions.length >= 2) {
        L.polyline(routePositions, {
          color: Colors.light.primary,
          opacity: 0.14,
          weight: 22,
        }).addTo(overlays);
      }

      if (routePositions.length >= 2) {
        L.polyline(routePositions, {
          color: Colors.light.primary,
          dashArray: showRouteBuffer ? undefined : '8 6',
          weight: 5,
        }).addTo(overlays);
      }

      const routeSignature = `${routePositions.length}:${routePositions[0]?.join(',')}:${routePositions.at(-1)?.join(',')}`;
      if (
        editableRoute &&
        routePositions.length >= 2 &&
        fittedRouteRef.current !== routeSignature
      ) {
        fittedRouteRef.current = routeSignature;
        mapRef.current.fitBounds(routePositions, { padding: [32, 32] });
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
        if (selectedRequest) {
          const categoryColor = CategoryColors[selectedRequest.category];
          const polygonRings = getAreaPolygonRings(selectedRequest.maskedArea).map((ring) =>
            ring.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
          );

          L.polygon(polygonRings, {
            color: categoryColor.color,
            fillColor: categoryColor.soft,
            fillOpacity: 0.22,
            weight: 1,
          }).addTo(overlays);
        }
      }

      requestClusters.forEach((cluster) => {
        if (cluster.requests.length > 1) {
          const marker = L.marker([cluster.coordinate.latitude, cluster.coordinate.longitude], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:30px;height:30px;border-radius:15px;background:${Colors.light.primary};color:${Colors.light.onPrimary};border:2px solid ${Colors.light.backgroundElement};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.24)">${cluster.requests.length}</div>`,
              iconAnchor: [15, 15],
              iconSize: [30, 30],
            }),
          }).addTo(overlays);
          marker.on('click', () => {
            const currentZoom = mapRef.current?.getZoom() ?? 14;
            mapRef.current?.flyTo(
              [cluster.coordinate.latitude, cluster.coordinate.longitude],
              Math.min(18, currentZoom + 2),
            );
          });
          return;
        }

        const request = cluster.requests[0];
        const coordinate = toLatLng(request.approximateLocation.coordinates);
        const categoryColor = CategoryColors[request.category].color;
        const priorityColor = PriorityColors[request.priority].color;

        const marker = L.circleMarker([coordinate.latitude, coordinate.longitude], {
          color: priorityColor,
          fillColor: categoryColor,
          fillOpacity: 1,
          radius: 5,
          weight: 2,
        })
          .bindPopup(`<strong>${request.title}</strong><br />Priorytet ${request.priority}`)
          .addTo(overlays);
        marker.on('click', () => setSelectedRequestId(request.id));
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
    requestClusters,
    routeCoordinates,
    selectedRequest,
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
