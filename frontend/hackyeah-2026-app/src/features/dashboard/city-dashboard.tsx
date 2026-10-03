import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Screen } from '@/components/ui/screen';
import { CategoryColors, Spacing } from '@/constants/theme';
import type { Category } from '@/api/types';
import { CityHeatmapMap } from '@/features/dashboard/city-heatmap-map';
import { useCitySummary, useHeatmapData } from '@/features/dashboard/hooks';
import { CategoryLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

const CATEGORY_KEYS = Object.keys(CategoryLabels) as Category[];

const CATEGORIES: { label: string; value?: Category }[] = [
  { label: 'Wszystkie' },
  ...CATEGORY_KEYS.map((value) => ({ label: CategoryLabels[value], value })),
];

/** Category with the most requests in a heatmap cell, used as the dot color. */
const dominantCategory = (byCategory: Record<Category, number>) =>
  CATEGORY_KEYS.reduce((best, key) => (byCategory[key] > byCategory[best] ? key : best));

export function CityDashboard() {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const { data: summary, isPending: summaryLoading } = useCitySummary();
  const { data: heatmap, isPending: heatmapLoading } = useHeatmapData(selectedCategory);
  const cells = heatmap?.features ?? [];
  const maxWeight = Math.max(1, ...cells.map((cell) => cell.properties.weight));
  const points = cells.map((cell) => {
    const [lng, lat] = cell.geometry.coordinates;
    const category = dominantCategory(cell.properties.byCategory);
    const weight = cell.properties.weight / maxWeight;
    return {
      lat,
      lng,
      weight,
      category,
      byCategory: cell.properties.byCategory,
      totalInCell: cell.properties.weight,
      area: cell.properties.area,
    };
  });

  if (summaryLoading || heatmapLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Ładowanie danych analitycznych miasta...
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {/* Top Bar / Navigation */}
      <View style={styles.headerRow}>
        <View>
          <ThemedText type="title">Panel Analityczny Miasta</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Kraków Smart City • Monitor deficytów sąsiedzkich i mobilności
          </ThemedText>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Zgłoszone potrzeby
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.primary }}>
            {summary?.total ?? 0}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Anulowane: {summary?.cancelled ?? 0}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Zrealizowana pomoc
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.success }}>
            {summary?.fulfilled ?? 0}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Skuteczność: {Math.round((summary?.fulfillmentRate ?? 0) * 100)}%
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            W toku
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.warning }}>
            {summary?.inProgress ?? 0}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Oferty i przyjęta pomoc
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Czeka na pomoc
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.danger }}>
            {summary?.open ?? 0}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Pilnych: {summary?.byPriority['1'] ?? 0}
          </ThemedText>
        </ThemedView>
      </View>

      {/* Category filter pills */}
      <ThemedView type="backgroundElement" style={styles.filterSection}>
        <ThemedText type="smallBold">Filtruj wg kategorii zgłoszeń:</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.value;
            return (
              <Pressable
                key={cat.label}
                onPress={() => setSelectedCategory(cat.value)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: active ? '#ffffff' : theme.text,
                  }}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </ThemedView>

      {/* Heatmap visualization container */}
      <ThemedView type="backgroundElement" style={styles.heatmapCard}>
        <View style={styles.heatmapHeader}>
          <View>
            <ThemedText type="subtitle">Mapa Cieplna Zgłoszeń i Deficytów</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Zagęszczenie potrzeb w korytarzach miejskich ({heatmap?.totalRequests ?? 0} zgłoszeń w{' '}
              {cells.length} obszarach)
            </ThemedText>
          </View>
        </View>

        {/* Real Interactive Map with OpenStreetMap tiles & Heatmap overlays */}
        <CityHeatmapMap points={points} />

        {/* Map Legend */}
        <View style={[styles.legendBar, { backgroundColor: theme.backgroundElement }]}>
          {CATEGORY_KEYS.map((key) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CategoryColors[key].color }]} />
              <ThemedText type="small">{CategoryLabels[key]}</ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      {/* Requests by category (backend summary.byCategory) */}
      <ThemedView type="backgroundElement" style={styles.sectionCard}>
        <ThemedText type="subtitle">Zgłoszenia według kategorii</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Gdzie mieszkańcy najczęściej potrzebują wsparcia
        </ThemedText>

        <View style={styles.districtList}>
          {CATEGORY_KEYS.map((key) => {
            const count = summary?.byCategory[key] ?? 0;
            const pct = summary?.total ? Math.round((count / summary.total) * 100) : 0;
            return (
              <ThemedView key={key} type="background" style={styles.districtItem}>
                <View style={styles.districtHeader}>
                  <ThemedText type="subtitle">{CategoryLabels[key]}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {count} ({pct}%)
                  </ThemedText>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${pct}%`, backgroundColor: CategoryColors[key].color },
                    ]}
                  />
                </View>
              </ThemedView>
            );
          })}
        </View>
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: Spacing.two,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    width: '100%',
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  filterSection: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    width: '100%',
  },
  filterPills: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  heatmapCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: Spacing.two,
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  districtList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  districtItem: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  districtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  districtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
