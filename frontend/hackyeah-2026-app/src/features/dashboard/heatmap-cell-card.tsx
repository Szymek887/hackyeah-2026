import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import {
  categoryBreakdown,
  requestsLabel,
  type HeatmapCell,
} from '@/features/dashboard/heatmap-scale';

type HeatmapCellCardProps = {
  cell: HeatmapCell;
  onClose: () => void;
};

/** Details of a tapped hexagon (native; web shows the same in a hover tooltip). */
export function HeatmapCellCard({ cell, onClose }: HeatmapCellCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.title}>
          <ThemedText type="smallBold">{requestsLabel(cell.count)} w tym obszarze</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Czeka na pomoc: {cell.open}
          </ThemedText>
        </View>
        <Button title="Zamknij" variant="ghost" inline onPress={onClose} />
      </View>
      {categoryBreakdown(cell).map(({ category, label, color, count }) => (
        <View key={category} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <ThemedText type="small" style={styles.label}>
            {label}
          </ThemedText>
          <ThemedText type="smallBold">{count}</ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    flex: 1,
  },
});
