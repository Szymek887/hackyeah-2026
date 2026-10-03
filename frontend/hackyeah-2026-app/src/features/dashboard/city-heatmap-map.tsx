import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import type { Category, GeoPolygon } from '@/api/types';
import { CategoryColors, Radius } from '@/constants/theme';
import { KRAKOW_INITIAL_REGION } from '@/features/map/krakow-map-data';
import { CategoryLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

export type HeatmapPointItem = {
  lat: number;
  lng: number;
  weight: number;
  category: Category;
  byCategory?: Record<Category, number>;
  totalInCell?: number;
  area?: GeoPolygon;
};

type CityHeatmapMapProps = {
  points: HeatmapPointItem[];
};

const DISTRICT_CENTERS = [
  { name: 'Stare Miasto', latitude: 50.0619, longitude: 19.9367 },
  { name: 'Krowodrza', latitude: 50.0715, longitude: 19.923 },
  { name: 'Grzegórzki', latitude: 50.062, longitude: 19.965 },
  { name: 'Podgórze', latitude: 50.0435, longitude: 19.948 },
  { name: 'Dębniki', latitude: 50.045, longitude: 19.922 },
  { name: 'Prądnik Czerwony', latitude: 50.086, longitude: 19.952 },
];

export function CityHeatmapMap({ points }: CityHeatmapMapProps) {
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

        {/* Heat diffusion circles and point markers */}
        {points.map((pt, idx) => {
          const catConfig = CategoryColors[pt.category] ?? {
            color: theme.primary,
            soft: theme.primarySoft,
          };
          const catLabel = CategoryLabels[pt.category] ?? pt.category;
          const intensity = Math.round(pt.weight * 100);

          return (
            <Fragment key={`pt-${idx}`}>
              <Circle
                center={{ latitude: pt.lat, longitude: pt.lng }}
                radius={200 + pt.weight * 260}
                fillColor={`${catConfig.color}2B`}
                strokeColor="transparent"
              />
              <Circle
                center={{ latitude: pt.lat, longitude: pt.lng }}
                radius={90 + pt.weight * 120}
                fillColor={`${catConfig.color}52`}
                strokeColor="transparent"
              />
              <Marker
                coordinate={{ latitude: pt.lat, longitude: pt.lng }}
                pinColor={catConfig.color}
                title={catLabel}
                description={`Zapotrzebowanie: ${intensity}%`}
              />
            </Fragment>
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
