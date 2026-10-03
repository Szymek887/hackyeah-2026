import 'leaflet/dist/leaflet.css';

import { router } from 'expo-router';
import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FeatureCollection } from 'geojson';
import type { LayerGroup, Map as LeafletMapInstance, Marker } from 'leaflet';

import type { HelpRequestListItem } from '@/api/types';
import { CategoryColors, PriorityColors, Radius, type ThemePalette } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import { KRAKOW_INITIAL_REGION, toLatLng } from '@/features/map/krakow-map-data';
import { clusterRequests, MAX_MAP_ZOOM, NO_CLUSTER_ZOOM } from '@/features/map/map-clustering';
import { CategoryLabels, PriorityLabels } from '@/features/requests/labels';
import {
  USER_LOCATION_CSS,
  USER_LOCATION_SIZE,
  userLocationHtml,
} from '@/features/map/user-location-icon';
import { useTheme } from '@/hooks/use-theme';
import type { RouteCoordinate } from '@/lib/route-matching';

export type RouteEndpoint = 'start' | 'end';

type LeafletMapProps = {
  centerGeoJson?: FeatureCollection;
  /** Requests drawn as points. */
  requests: HelpRequestListItem[];
  /** Requests along the route – drawn with a thicker ring and announced as "przy Twojej trasie". */
  matchingRequests?: HelpRequestListItem[];
  showAreas?: boolean;
  showRouteBuffer?: boolean;
  /** No route is drawn by default; pass the user's route to show it. */
  routeCoordinates?: RouteCoordinate[];
  editableRoute?: boolean;
  /** Map height in px. */
  height?: number;
  onMapPress?: (coordinate: RouteCoordinate) => void;
  onRouteEndpointChange?: (endpoint: RouteEndpoint, coordinate: RouteCoordinate) => void;
  /** "You are here" – GPS position or the place the user picked; the map moves there. */
  userLocation?: RouteCoordinate;
  /** Name of that place, for the tooltip and screen readers. */
  userLocationLabel?: string;
};

const leafletElementStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

const NO_ROUTE: RouteCoordinate[] = [];
const NO_REQUESTS: HelpRequestListItem[] = [];

function leafletCss(theme: ThemePalette, textScale: number) {
  const px = (size: number) => `${Math.round(size * textScale)}px`;
  return `
  .podrodze-request-popup .leaflet-popup-content-wrapper {
    background: ${theme.backgroundElement};
    border: 1.5px solid ${theme.border};
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(18, 38, 63, 0.18);
    padding: 0;
  }
  .podrodze-request-popup .leaflet-popup-content {
    margin: 0;
    width: ${Math.round(240 * Math.min(textScale, 1.3))}px !important;
    font-family: var(--font-display);
    color: ${theme.text};
  }
  .podrodze-request-popup .leaflet-popup-tip {
    background: ${theme.backgroundElement};
    border: 1px solid ${theme.border};
    box-shadow: none;
  }
  .podrodze-request-popup .leaflet-popup-close-button {
    color: ${theme.textSecondary};
    height: 32px;
    width: 32px;
    font: 22px/30px var(--font-display);
  }
  .podrodze-request-popup .pd-title {
    font-size: ${px(15)};
    line-height: ${px(20)};
    font-weight: 700;
    word-break: break-word;
    padding-right: 20px;
  }
  .podrodze-request-popup .pd-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: ${px(12)};
    line-height: ${px(16)};
    font-weight: 700;
    padding: 3px 8px;
  }
  .podrodze-request-popup .pd-meta {
    font-size: ${px(13)};
    line-height: ${px(18)};
    color: ${theme.textSecondary};
  }
  .podrodze-request-popup .pd-action {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    background: ${theme.primary};
    color: ${theme.onPrimary};
    font: 700 ${px(14)}/${px(18)} var(--font-display);
    min-height: 44px;
    padding: 10px 12px;
  }
  .podrodze-request-popup .pd-action:hover { background: ${theme.primaryStrong}; }
  .podrodze-request-popup .pd-action:focus-visible,
  .podrodze-marker:focus-visible {
    outline: 3px solid ${theme.primary};
    outline-offset: 2px;
  }
  .podrodze-label {
    font: 700 ${px(12)}/${px(16)} var(--font-display);
    color: ${theme.text};
    background: ${theme.backgroundElement};
    border: 2px solid ${theme.border};
    border-radius: 4px;
    padding: 4px 8px;
    width: max-content;
    max-width: ${Math.round(170 * Math.min(textScale, 1.3))}px;
    white-space: normal;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
  .podrodze-label.pd-label-hidden {
    visibility: hidden;
  }
  .podrodze-label .pd-label-meta {
    display: block;
    font-weight: 600;
    font-size: ${px(11)};
    color: ${theme.textSecondary};
  }
  ${USER_LOCATION_CSS}
  .podrodze-tooltip {
    font: 600 ${px(13)}/${px(18)} var(--font-display);
    color: ${theme.text};
    background: ${theme.backgroundElement};
    border: 1.5px solid ${theme.border};
    border-radius: 8px;
    padding: 6px 10px;
    max-width: 260px;
    white-space: normal;
  }
`;
}

type LabeledMarker = { marker: Marker; priority: number };

/**
 * Hides labels that would overlap one already shown. More urgent requests (lower priority number)
 * keep their label; the hidden ones appear when the point is hovered or focused.
 */
function declutterLabels(labels: LabeledMarker[]) {
  const shown: DOMRect[] = [];
  [...labels]
    .sort((a, b) => a.priority - b.priority)
    .forEach(({ marker }) => {
      const element = marker.getTooltip()?.getElement();
      if (!element) return;
      element.classList.remove('pd-label-hidden');
      const rect = element.getBoundingClientRect();
      const overlaps = shown.some(
        (other) =>
          rect.left < other.right + 4 &&
          rect.right + 4 > other.left &&
          rect.top < other.bottom + 4 &&
          rect.bottom + 4 > other.top,
      );
      if (overlaps) element.classList.add('pd-label-hidden');
      else shown.push(rect);
    });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Short, plain description used for hover tooltips and screen readers. */
function requestLabel(request: HelpRequestListItem, alongRoute: boolean) {
  return [
    request.title,
    CategoryLabels[request.category],
    `priorytet: ${PriorityLabels[request.priority].toLowerCase()}`,
    alongRoute ? 'przy Twojej trasie' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Popup as a DOM node, so the button can navigate in-app (no full page reload). */
function requestPopup(request: HelpRequestListItem, alongRoute: boolean) {
  const categoryColor = CategoryColors[request.category];
  const priorityColor = PriorityColors[request.priority];
  const element = document.createElement('div');
  element.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:12px;';
  element.innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <span class="pd-badge" style="background:${priorityColor.soft};color:${priorityColor.color};">
        ${escapeHtml(PriorityLabels[request.priority])}
      </span>
      <span class="pd-badge" style="background:${categoryColor.soft};color:${categoryColor.color};">
        ${escapeHtml(CategoryLabels[request.category])}
      </span>
    </div>
    <div class="pd-title">${escapeHtml(request.title)}</div>
    ${alongRoute ? '<div class="pd-meta">Przy Twojej trasie</div>' : ''}
    <div class="pd-meta">Dokładny adres zobaczysz po akceptacji Twojej pomocy.</div>
    <button type="button" class="pd-action">Zobacz szczegóły i pomóż</button>
  `;
  element.querySelector('button')?.addEventListener('click', () => {
    router.push({ pathname: '/request/[id]', params: { id: request.id } });
  });
  return element;
}

export function LeafletMap({
  centerGeoJson,
  requests,
  matchingRequests = NO_REQUESTS,
  showAreas = true,
  showRouteBuffer = false,
  routeCoordinates = NO_ROUTE,
  editableRoute = false,
  height = 520,
  onMapPress,
  onRouteEndpointChange,
  userLocation,
  userLocationLabel = 'Twoja lokalizacja',
}: LeafletMapProps) {
  const theme = useTheme();
  const { textScale, settings } = useAccessibility();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const areaRef = useRef<LayerGroup | null>(null);
  const meRef = useRef<LayerGroup | null>(null);
  const shownLocationRef = useRef('');
  const fittedRouteRef = useRef('');
  /** Request whose popup is open; reopened after the markers are redrawn (zoom, new data). */
  const openRequestIdRef = useRef<number | null>(null);
  const redrawingRef = useRef(false);
  const labelsRef = useRef<LabeledMarker[]>([]);
  // Latest callbacks without redrawing the map on every parent render.
  const onMapPressRef = useRef(onMapPress);
  const onEndpointChangeRef = useRef(onRouteEndpointChange);
  useEffect(() => {
    onMapPressRef.current = onMapPress;
    onEndpointChangeRef.current = onRouteEndpointChange;
  });

  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(14);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const requestClusters = useMemo(() => clusterRequests(requests, zoom), [requests, zoom]);
  const matchingIds = useMemo(
    () => new Set(matchingRequests.map((request) => request.id)),
    [matchingRequests],
  );
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const hasMapPress = Boolean(onMapPress);
  const showLabels = zoom >= NO_CLUSTER_ZOOM;
  const markerSize = settings.largeTouchTargets ? 26 : 18;

  // Base map + click handler.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await import('leaflet');
      if (disposed || !elementRef.current || mapRef.current) return;
      const map = L.map(elementRef.current, {
        center: [KRAKOW_INITIAL_REGION.latitude, KRAKOW_INITIAL_REGION.longitude],
        zoom: 14,
        scrollWheelZoom: true,
        keyboard: true,
        maxZoom: MAX_MAP_ZOOM,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: MAX_MAP_ZOOM,
      }).addTo(map);
      map.on('zoomend', () => setZoom(map.getZoom()));
      map.on('moveend', () => declutterLabels(labelsRef.current));
      map.on('click', ({ latlng }) =>
        onMapPressRef.current?.({ latitude: latlng.lat, longitude: latlng.lng }),
      );
      mapRef.current = map;
      setZoom(map.getZoom());
      setMapReady(true);
    })();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (elementRef.current) elementRef.current.style.cursor = hasMapPress ? 'crosshair' : '';
  }, [hasMapPress]);

  // Route, endpoints and request markers.
  useEffect(() => {
    let disposed = false;

    async function draw() {
      const L = await import('leaflet');
      const map = mapRef.current;
      if (disposed || !map) return;

      redrawingRef.current = true;
      overlayRef.current?.remove();
      redrawingRef.current = false;

      const overlays = L.layerGroup().addTo(map);
      overlayRef.current = overlays;
      const routePositions = routeCoordinates.map(
        (coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number],
      );

      if (centerGeoJson) {
        L.geoJSON(centerGeoJson, {
          style: {
            color: theme.primary,
            fillColor: theme.primarySoft,
            fillOpacity: 0.2,
            weight: 1,
          },
        }).addTo(overlays);
      }

      if (routePositions.length >= 2) {
        if (showRouteBuffer) {
          L.polyline(routePositions, {
            color: theme.primary,
            opacity: 0.16,
            weight: 24,
            interactive: false,
          }).addTo(overlays);
        }
        L.polyline(routePositions, {
          color: theme.primary,
          weight: settings.palette !== 'standard' ? 7 : 5,
          interactive: false,
        }).addTo(overlays);

        // Bring a new or changed route into view.
        const signature = `${routePositions.length}:${routePositions[0].join(',')}:${routePositions.at(-1)?.join(',')}`;
        if (fittedRouteRef.current !== signature) {
          fittedRouteRef.current = signature;
          map.fitBounds(routePositions, { padding: [40, 40] });
        }

        const endpoints: [RouteEndpoint, RouteCoordinate, string, string, string][] = [
          ['start', routeCoordinates[0], 'A', theme.success, 'Start trasy'],
          ['end', routeCoordinates[routeCoordinates.length - 1], 'B', theme.danger, 'Cel trasy'],
        ];
        endpoints.forEach(([endpoint, coordinate, label, color, title]) => {
          const marker = L.marker([coordinate.latitude, coordinate.longitude], {
            bubblingMouseEvents: false,
            draggable: editableRoute,
            keyboard: false,
            title: editableRoute ? `${title} – przeciągnij, aby zmienić` : title,
            icon: L.divIcon({
              className: '',
              html: `<div style="width:32px;height:32px;border-radius:16px;background:${color};color:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</div>`,
              iconAnchor: [16, 16],
              iconSize: [32, 32],
            }),
          }).addTo(overlays);
          marker.on('dragend', () => {
            const position = marker.getLatLng();
            onEndpointChangeRef.current?.(endpoint, {
              latitude: position.lat,
              longitude: position.lng,
            });
          });
        });
      } else {
        fittedRouteRef.current = '';
      }

      const markersById = new Map<number, Marker>();
      const labels: LabeledMarker[] = [];

      requestClusters.forEach((cluster) => {
        if (cluster.requests.length > 1) {
          const count = cluster.requests.length;
          const size = markerSize + 16;
          const marker = L.marker([cluster.coordinate.latitude, cluster.coordinate.longitude], {
            bubblingMouseEvents: false,
            title: `${count} zgłoszeń w okolicy – kliknij, aby przybliżyć`,
            icon: L.divIcon({
              className: 'podrodze-marker',
              html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${theme.primary};color:${theme.onPrimary};border:2px solid ${theme.backgroundElement};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(13 * textScale)}px;box-shadow:0 1px 4px rgba(0,0,0,.3)">${count}</div>`,
              iconAnchor: [size / 2, size / 2],
              iconSize: [size, size],
            }),
          }).addTo(overlays);
          marker.on('click', () => {
            // Zoom exactly to the grouped points; close up they split into separate ones.
            const points = cluster.requests.map((r) => {
              const { latitude, longitude } = toLatLng(r.approximateLocation.coordinates);
              return [latitude, longitude] as [number, number];
            });
            map.flyToBounds(points, {
              padding: [80, 80],
              maxZoom: MAX_MAP_ZOOM,
              animate: !settings.reduceMotion,
            });
          });
          return;
        }

        const request = cluster.requests[0];
        const alongRoute = matchingIds.has(request.id);
        const coordinate = cluster.coordinate;
        const fill = CategoryColors[request.category].color;
        const ring = PriorityColors[request.priority].color;
        const size = alongRoute ? markerSize + 6 : markerSize;
        const label = requestLabel(request, alongRoute);

        // A real marker (not a canvas circle): focusable with Tab and opens with Enter. The name
        // goes to aria-label rather than `title`, so hovering shows only the styled tooltip.
        const marker = L.marker([coordinate.latitude, coordinate.longitude], {
          bubblingMouseEvents: false,
          riseOnHover: true,
          icon: L.divIcon({
            className: 'podrodze-marker',
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:${alongRoute ? 4 : 3}px solid ${ring};box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.35)"></div>`,
            iconAnchor: [size / 2, size / 2],
            iconSize: [size, size],
          }),
        })
          .bindTooltip(
            showLabels
              ? `${escapeHtml(request.title)}<span class="pd-label-meta">${escapeHtml(
                  `${CategoryLabels[request.category]} · ${PriorityLabels[request.priority]}`,
                )}</span>`
              : escapeHtml(label),
            {
              // Close up: a permanent rectangular label above the point, clickable like the point.
              className: showLabels ? 'podrodze-label' : 'podrodze-tooltip',
              direction: 'top',
              offset: [0, -size / 2],
              permanent: showLabels,
              interactive: showLabels,
            },
          )
          .bindPopup(() => requestPopup(request, alongRoute), {
            className: 'podrodze-request-popup',
            closeButton: true,
            maxWidth: 320,
            autoPanPadding: [16, 16],
          })
          .addTo(overlays);

        marker.getElement()?.setAttribute('aria-label', label);
        marker.on('click', () => setSelectedRequestId(request.id));
        marker.on('popupopen', () => {
          openRequestIdRef.current = request.id;
          if (!showLabels) marker.closeTooltip();
          // Move keyboard focus into the popup so Enter reaches the action button.
          marker.getPopup()?.getElement()?.querySelector<HTMLButtonElement>('.pd-action')?.focus();
        });
        marker.on('popupclose', () => {
          if (redrawingRef.current) return;
          openRequestIdRef.current = null;
          setSelectedRequestId(null);
        });
        if (showLabels) {
          labels.push({ marker, priority: request.priority });
          const reveal = () => {
            const element = marker.getTooltip()?.getElement();
            element?.classList.remove('pd-label-hidden');
            if (element) element.style.zIndex = '1000';
          };
          const restore = () => {
            const element = marker.getTooltip()?.getElement();
            if (element) element.style.zIndex = '';
            declutterLabels(labelsRef.current);
          };
          marker.on('mouseover', reveal);
          marker.on('mouseout', restore);
          marker.getElement()?.addEventListener('focus', reveal);
          marker.getElement()?.addEventListener('blur', restore);
        }
        markersById.set(request.id, marker);
      });

      labelsRef.current = labels;
      declutterLabels(labels);

      const reopen = openRequestIdRef.current;
      if (reopen !== null) markersById.get(reopen)?.openPopup();

      map.invalidateSize();
    }

    draw();

    return () => {
      disposed = true;
    };
  }, [
    centerGeoJson,
    editableRoute,
    mapReady,
    markerSize,
    matchingIds,
    requestClusters,
    routeCoordinates,
    settings.palette,
    settings.reduceMotion,
    showLabels,
    showRouteBuffer,
    textScale,
    theme,
  ]);

  // "You are here" marker, above the request points; the map pans when the location changes.
  const meLatitude = userLocation?.latitude;
  const meLongitude = userLocation?.longitude;
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await import('leaflet');
      const map = mapRef.current;
      meRef.current?.remove();
      meRef.current = null;
      if (disposed || !map || meLatitude === undefined || meLongitude === undefined) return;

      const layer = L.layerGroup().addTo(map);
      const half = USER_LOCATION_SIZE / 2;
      const marker = L.marker([meLatitude, meLongitude], {
        zIndexOffset: 1000,
        keyboard: true,
        icon: L.divIcon({
          className: 'podrodze-marker',
          html: userLocationHtml(theme.primary, !settings.reduceMotion),
          iconAnchor: [half, half],
          iconSize: [USER_LOCATION_SIZE, USER_LOCATION_SIZE],
        }),
      })
        .bindTooltip(`Tu jesteś: ${escapeHtml(userLocationLabel)}`, {
          className: 'podrodze-tooltip',
          direction: 'top',
          offset: [0, -half],
        })
        .addTo(layer);
      marker.getElement()?.setAttribute('aria-label', `Tu jesteś: ${userLocationLabel}`);
      meRef.current = layer;

      const key = `${meLatitude},${meLongitude}`;
      if (shownLocationRef.current !== key) {
        shownLocationRef.current = key;
        map.setView([meLatitude, meLongitude], Math.max(map.getZoom(), 15), {
          animate: !settings.reduceMotion,
        });
      }
    })();
    return () => {
      disposed = true;
    };
  }, [mapReady, meLatitude, meLongitude, settings.reduceMotion, theme.primary, userLocationLabel]);

  // Masked ~300 m area of the selected request (never the exact address).
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = await import('leaflet');
      const map = mapRef.current;
      areaRef.current?.remove();
      areaRef.current = null;
      if (disposed || !map || !showAreas || !selectedRequest) return;
      const categoryColor = CategoryColors[selectedRequest.category];
      const rings = getAreaPolygonRings(selectedRequest.maskedArea).map((ring) =>
        ring.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]),
      );
      const layer = L.layerGroup().addTo(map);
      L.polygon(rings, {
        color: categoryColor.color,
        fillColor: categoryColor.soft,
        fillOpacity: 0.3,
        weight: 2,
        interactive: false,
      }).addTo(layer);
      areaRef.current = layer;
    })();
    return () => {
      disposed = true;
    };
  }, [mapReady, selectedRequest, showAreas]);

  useEffect(
    () => () => {
      overlayRef.current?.remove();
      areaRef.current?.remove();
      meRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <View style={[styles.mapFrame, { height, borderColor: theme.border }]}>
      {createElement('style', {
        dangerouslySetInnerHTML: { __html: leafletCss(theme, textScale) },
      })}
      {createElement('div', {
        ref: elementRef,
        style: leafletElementStyle,
        role: 'region',
        'aria-label':
          'Mapa zgłoszeń. Klawiszem Tab przejdziesz między punktami, Enter otworzy szczegóły.',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: {
    overflow: 'hidden',
    borderRadius: Radius.large,
    borderWidth: 1,
  },
});
