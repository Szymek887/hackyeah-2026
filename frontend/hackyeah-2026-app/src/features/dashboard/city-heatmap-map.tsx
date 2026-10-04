import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';

import { HeatmapCellBorder, Radius } from '@/constants/theme';
import { HeatmapCellCard } from '@/features/dashboard/heatmap-cell-card';
import { HeatmapOsmView } from '@/features/dashboard/heatmap-osm-view';
import {
  HEATMAP_FILL_OPACITY,
  HEATMAP_FILL_OPACITY_ACTIVE,
  cellKey,
  heatmapColor,
  type HeatmapCell,
} from '@/features/dashboard/heatmap-scale';
import { getAreaPolygonRings } from '@/features/map/area-geometry';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';
import { useTheme } from '@/hooks/use-theme';

type CityHeatmapMapProps = {
  cells: HeatmapCell[];
};

/** `#RRGGBB` + opacity -> `#RRGGBBAA` (react-native-maps polygons have no separate fill opacity). */
const withOpacity = (hex: string, opacity: number) =>
  hex +
  Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');

/** Same switch as the volunteer map: Google Maps renders blank on Android in Expo Go (SDK 57). */
const USE_OSM_MAP = Platform.OS === 'android';

const DISTRICT_CENTERS = [
  { name: 'Stare Miasto', latitude: 50.0619, longitude: 19.9367 },
  { name: 'Krowodrza', latitude: 50.0715, longitude: 19.923 },
  { name: 'Grzegórzki', latitude: 50.062, longitude: 19.965 },
  { name: 'Podgórze', latitude: 50.0435, longitude: 19.948 },
  { name: 'Dębniki', latitude: 50.045, longitude: 19.922 },
  { name: 'Prądnik Czerwony', latitude: 50.086, longitude: 19.952 },
];

export function CityHeatmapMap({ cells }: CityHeatmapMapProps) {
  const theme = useTheme();
  // Stored by key, so the card closes by itself when a filter removes the hexagon. Not closed by
  // tapping the map: on iOS the map's onPress can also fire for a polygon tap.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = cells.find((cell) => cellKey(cell) === selectedKey);

  return (
    <View style={[styles.mapFrame, { borderColor: theme.border }]}>
      {USE_OSM_MAP ? (
        <HeatmapOsmView
          initialRegion={KRAKOW_INITIAL_REGION}
          cells={cells}
          districts={DISTRICT_CENTERS}
          selectedKey={selectedKey}
          onCellPress={setSelectedKey}
        />
      ) : (
        <MapView style={styles.map} initialRegion={KRAKOW_INITIAL_REGION} showsCompass showsScale>
          {/* District reference markers */}
          {DISTRICT_CENTERS.map((district) => (
            <Marker
              key={district.name}
              coordinate={{ latitude: district.latitude, longitude: district.longitude }}
              title={district.name}
              description="Dzielnica Krakowa"
            />
          ))}

          {/* One hexagon per cell, drawn from the outline the backend computed (`properties.area`) */}
          {cells.map((cell) => {
            const [outer, ...holes] = getAreaPolygonRings(cell.area);
            if (!outer) return null;
            const key = cellKey(cell);
            const opacity =
              key === selectedKey ? HEATMAP_FILL_OPACITY_ACTIVE : HEATMAP_FILL_OPACITY;
            return (
              <Polygon
                key={key}
                coordinates={outer}
                holes={holes}
                tappable
                onPress={() => setSelectedKey(key)}
                fillColor={withOpacity(heatmapColor(cell.count), opacity)}
                strokeColor={HeatmapCellBorder}
                strokeWidth={2}
              />
            );
          })}
        </MapView>
      )}
      {selected && <HeatmapCellCard cell={selected} onClose={() => setSelectedKey(null)} />}
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
  map: {
    ...StyleSheet.absoluteFill,
  },
});
