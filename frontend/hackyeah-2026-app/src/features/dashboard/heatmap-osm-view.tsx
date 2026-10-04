import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { Region } from 'react-native-maps';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { HeatmapCellBorder } from '@/constants/theme';
import {
  HEATMAP_FILL_OPACITY,
  HEATMAP_FILL_OPACITY_ACTIVE,
  cellKey,
  heatmapColor,
  type HeatmapCell,
} from '@/features/dashboard/heatmap-scale';

/**
 * The city heatmap on Android: OpenStreetMap (Leaflet) inside a WebView.
 *
 * react-native-maps renders a blank map with only the Google logo on Android in Expo Go (SDK 57,
 * expo/expo#49323), the same reason the volunteer map uses `OsmMapView`. This view draws the same
 * hexagons as the web dashboard and reports taps, so the native card shows the details. District
 * names come from the map tiles.
 */

type HeatmapOsmViewProps = {
  initialRegion: Region;
  cells: HeatmapCell[];
  selectedKey: string | null;
  onCellPress: (key: string) => void;
};

/** What the page draws; sent with `window.__render` whenever it changes. */
type RenderData = {
  hexagons: { key: string; rings: [number, number][][]; fill: string; active: boolean }[];
};

function pageHtml(region: Region) {
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e8e4dc; }
</style>
</head><body><div id="map"></div>
<script>
  var send = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var map = L.map('map', { zoomControl: false, maxZoom: 18 })
    .setView([${region.latitude}, ${region.longitude}], ${zoomFor(region.longitudeDelta)});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  window.__render = function (d) {
    layer.clearLayers();
    d.hexagons.forEach(function (h) {
      L.polygon(h.rings, { color: '${HeatmapCellBorder}', weight: h.active ? 3 : 2,
        fillColor: h.fill,
        fillOpacity: h.active ? ${HEATMAP_FILL_OPACITY_ACTIVE} : ${HEATMAP_FILL_OPACITY} })
        .on('click', function () { send({ type: 'cell', key: h.key }); })
        .addTo(layer);
    });
  };

  send({ type: 'ready' });
</script>
</body></html>`;
}

/** Leaflet zoom that shows `longitudeDelta` across a phone screen (~400 px). */
function zoomFor(longitudeDelta: number) {
  return Math.max(3, Math.min(18, Math.round(Math.log2((360 * 400) / (256 * longitudeDelta)))));
}

export function HeatmapOsmView({
  initialRegion,
  cells,
  selectedKey,
  onCellPress,
}: HeatmapOsmViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  /** Latest data, applied once the page has loaded. */
  const pendingRef = useRef<string | null>(null);
  // The page is built once; later changes go through `window.__render`.
  const [html] = useState(() => pageHtml(initialRegion));

  const payload = JSON.stringify({
    hexagons: cells.map((cell) => ({
      key: cellKey(cell),
      // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
      rings: cell.area.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng])),
      fill: heatmapColor(cell.count),
      active: cellKey(cell) === selectedKey,
    })),
  } satisfies RenderData);

  useEffect(() => {
    const script = `window.__render(${payload})`;
    if (readyRef.current) webRef.current?.injectJavaScript(`${script}; true;`);
    else pendingRef.current = script;
  }, [payload]);

  const onMessage = (event: WebViewMessageEvent) => {
    let message: { type: string; key?: string };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'ready') {
      readyRef.current = true;
      if (pendingRef.current) webRef.current?.injectJavaScript(`${pendingRef.current}; true;`);
      pendingRef.current = null;
    }
    if (message.type === 'cell' && message.key) onCellPress(message.key);
  };

  return (
    <WebView
      ref={webRef}
      // A real site as base URL: OpenStreetMap tiles require a Referer (same as OsmMapView).
      source={{ html, baseUrl: 'https://podrodze.szymczak.rocks/' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      style={styles.map}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
