import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { USER_LOCATION_CSS, userLocationHtml } from '@/features/map/user-location-icon';
import type { RouteCoordinate } from '@/lib/route-matching';

/**
 * OpenStreetMap (Leaflet) inside a WebView – the Android map.
 *
 * Why not react-native-maps on Android: in Expo Go (SDK 57) the Google map renders black with only
 * the Google logo, tiles never load (expo/expo#49323, open). This view needs no Google services or
 * API key and looks like the web map. It is a drop-in for the parts of MapView the map screen uses:
 * `animateToRegion`, `onRegionChangeComplete`, markers, the route, the request area and "you are here".
 */

/** The imperative part of MapView the map screen uses – both MapView and this view provide it. */
export type MapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

export type OsmMarker = {
  id: string;
  latitude: number;
  longitude: number;
  kind: 'request' | 'cluster';
  /** Request: category colour; cluster: background. */
  fill: string;
  /** Request: priority colour (ring). */
  ring?: string;
  count?: number;
  /** Rectangular label above a request point (close zoom). */
  label?: string;
};

type OsmMapViewProps = {
  ref?: Ref<MapHandle>;
  initialRegion: Region;
  markers: OsmMarker[];
  onMarkerPress: (id: string) => void;
  onRegionChangeComplete: (region: Region) => void;
  userLocation?: RouteCoordinate;
  route?: RouteCoordinate[];
  /** Approximate area of the selected request. */
  area?: { center: RouteCoordinate; radiusMeters: number; fill: string; stroke: string };
  /** Space covered by floating panels, kept free when the map moves to a region. */
  padding: { top: number; right: number; bottom: number; left: number };
  colors: {
    primary: string;
    onPrimary: string;
    surface: string;
    text: string;
    border: string;
    success: string;
    danger: string;
  };
};

type MapData = Omit<
  OsmMapViewProps,
  'ref' | 'initialRegion' | 'onMarkerPress' | 'onRegionChangeComplete'
> & { userHtml: string };

/** Page with Leaflet; RN sends data with `window.__render`, the page answers with postMessage. */
function pageHtml(region: Region) {
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e8e4dc; }
  .pd-label { font: 700 12px/16px sans-serif; background: #fff; border: 2px solid #3a4757;
    border-radius: 4px; padding: 3px 7px; white-space: nowrap; max-width: 180px; overflow: hidden;
    text-overflow: ellipsis; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
  ${USER_LOCATION_CSS}
</style>
</head><body><div id="map"></div>
<script>
  var send = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var map = L.map('map', { zoomControl: false, maxZoom: 19 })
    .setView([${region.latitude}, ${region.longitude}], ${zoomFor(region.longitudeDelta)});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var pad = { top: 0, right: 0, bottom: 0, left: 0 };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var region = function () {
    var b = map.getBounds(), c = map.getCenter();
    return { latitude: c.lat, longitude: c.lng,
      latitudeDelta: b.getNorth() - b.getSouth(), longitudeDelta: b.getEast() - b.getWest() };
  };
  map.on('moveend', function () { send({ type: 'region', region: region() }); });

  window.__render = function (d) {
    pad = d.padding;
    layer.clearLayers();
    var c = d.colors;
    if (d.area) {
      L.circle([d.area.center.latitude, d.area.center.longitude], { radius: d.area.radiusMeters,
        color: d.area.stroke, weight: 3, fillColor: d.area.fill, fillOpacity: 0.18,
        interactive: false }).addTo(layer);
    }
    if (d.route && d.route.length > 1) {
      var pts = d.route.map(function (p) { return [p.latitude, p.longitude]; });
      L.polyline(pts, { color: c.primary, opacity: 0.16, weight: 22, interactive: false }).addTo(layer);
      L.polyline(pts, { color: c.primary, weight: 5, interactive: false }).addTo(layer);
      [[pts[0], 'A', c.success], [pts[pts.length - 1], 'B', c.danger]].forEach(function (e) {
        L.marker(e[0], { interactive: false, icon: L.divIcon({ className: '', iconSize: [30, 30],
          iconAnchor: [15, 15], html: '<div style="width:30px;height:30px;border-radius:15px;background:'
          + e[2] + ';color:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font:700 13px sans-serif">'
          + e[1] + '</div>' }) }).addTo(layer);
      });
    }
    d.markers.forEach(function (m) {
      var html, size, anchor;
      if (m.kind === 'cluster') {
        size = 38; anchor = [19, 19];
        html = '<div style="width:38px;height:38px;border-radius:19px;background:' + m.fill
          + ';color:' + c.onPrimary + ';border:2px solid ' + c.surface
          + ';display:flex;align-items:center;justify-content:center;font:700 14px sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.3)">'
          + m.count + '</div>';
      } else {
        var dot = '<div style="width:18px;height:18px;border-radius:9px;background:' + m.fill
          + ';border:3px solid ' + m.ring + ';box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.35)"></div>';
        if (m.label) {
          size = [190, 52]; anchor = [95, 50];
          html = '<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'
            + '<div class="pd-label">' + esc(m.label) + '</div>' + dot + '</div>';
        } else {
          size = 24; anchor = [12, 12];
          html = '<div style="padding:3px">' + dot + '</div>';
        }
      }
      L.marker([m.latitude, m.longitude], { icon: L.divIcon({ className: '', html: html,
        iconSize: Array.isArray(size) ? size : [size, size], iconAnchor: anchor }) })
        .on('click', function () { send({ type: 'marker', id: m.id }); })
        .addTo(layer);
    });
    if (d.userLocation) {
      L.marker([d.userLocation.latitude, d.userLocation.longitude], { zIndexOffset: 1000,
        interactive: false, icon: L.divIcon({ className: '', html: d.userHtml,
          iconSize: [34, 34], iconAnchor: [17, 17] }) }).addTo(layer);
    }
  };

  window.__fit = function (r, ms) {
    var bounds = [[r.latitude - r.latitudeDelta / 2, r.longitude - r.longitudeDelta / 2],
                  [r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2]];
    var opts = { paddingTopLeft: [pad.left, pad.top], paddingBottomRight: [pad.right, pad.bottom] };
    if (ms > 0) { opts.duration = ms / 1000; map.flyToBounds(bounds, opts); }
    else { map.fitBounds(bounds, opts); }
  };

  send({ type: 'ready', region: region() });
</script>
</body></html>`;
}

/** Leaflet zoom that shows `longitudeDelta` across a phone screen (~400 px). */
function zoomFor(longitudeDelta: number) {
  return Math.max(3, Math.min(18, Math.round(Math.log2((360 * 400) / (256 * longitudeDelta)))));
}

export function OsmMapView({
  ref,
  initialRegion,
  onMarkerPress,
  onRegionChangeComplete,
  ...data
}: OsmMapViewProps) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  /** Latest data / region request, applied once the page has loaded. */
  const pendingRef = useRef<string | null>(null);
  // The page is built once; later changes go through `window.__render`.
  const [html] = useState(() => pageHtml(initialRegion));

  const run = (script: string) => {
    if (readyRef.current) webRef.current?.injectJavaScript(`${script}; true;`);
  };

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration = 300) =>
      run(`window.__fit(${JSON.stringify(region)}, ${duration})`),
  }));

  const payload = JSON.stringify({
    ...data,
    userHtml: userLocationHtml(data.colors.primary, true),
  } satisfies MapData);

  useEffect(() => {
    const script = `window.__render(${payload})`;
    if (readyRef.current) webRef.current?.injectJavaScript(`${script}; true;`);
    else pendingRef.current = script;
  }, [payload]);

  const onMessage = (event: WebViewMessageEvent) => {
    let message: { type: string; id?: string; region?: Region };
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
    if (message.region && (message.type === 'region' || message.type === 'ready')) {
      onRegionChangeComplete(message.region);
    }
    if (message.type === 'marker' && message.id) onMarkerPress(message.id);
  };

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        // A real site as base URL: OpenStreetMap tiles require a Referer.
        source={{ html, baseUrl: 'https://podrodze.szymczak.rocks/' }}
        originWhitelist={['*']}
        onMessage={onMessage}
        style={styles.root}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
