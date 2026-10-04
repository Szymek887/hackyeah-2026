import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';

import { HeatmapCellBorder, Radius } from '@/constants/theme';
import {
  HEATMAP_FILL_OPACITY,
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

  return (
    <View style={[styles.mapFrame, { borderColor: theme.border }]}>
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
          return (
            <Polygon
              key={`${outer[0].latitude}:${outer[0].longitude}`}
              coordinates={outer}
              holes={holes}
              fillColor={withOpacity(heatmapColor(cell.count), HEATMAP_FILL_OPACITY)}
              strokeColor={HeatmapCellBorder}
              strokeWidth={2}
            />
          );
        })}
      </MapView>
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
