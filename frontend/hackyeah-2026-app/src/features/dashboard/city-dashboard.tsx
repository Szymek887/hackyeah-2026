import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { CategoryColors, Spacing } from '@/constants/theme';
import type { Category } from '@/api/types';
import { useCitySummary, useHeatmapData } from '@/features/dashboard/hooks';
import { useTheme } from '@/hooks/use-theme';

const CATEGORIES: { label: string; value?: Category }[] = [
  { label: 'Wszystkie' },
  { label: 'Leki i żywność', value: 'BASIC_NEEDS' },
  { label: 'Awarie i naprawy', value: 'HOME_SUPPORT' },
  { label: 'Sprzęt', value: 'EQUIPMENT_LOAN' },
  { label: 'Towarzyskie', value: 'SOCIAL' },
];

export function CityDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);

  const { data: summary, isPending: summaryLoading } = useCitySummary();
  const { data: heatmapPoints, isPending: heatmapLoading } = useHeatmapData(selectedCategory);

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
        <Button
          title="Wróć do aplikacji"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/requests')}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Zgłoszone potrzeby
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.primary }}>
            {summary?.totalRequests ?? 0}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.success }}>
            ↑ 14% vs ub. tydzień
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Zrealizowana pomoc
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.success }}>
            {summary?.completedRequests ?? 0}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Wskaźnik: {summary?.satisfactionRate ?? 98}%
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Śr. czas reakcji
          </ThemedText>
          <ThemedText type="title" style={{ color: '#F5A623' }}>
            {summary?.avgResponseMinutes ?? 18} min
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Commute Matching
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.kpiCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Oszczędzone CO₂
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.success }}>
            {summary?.co2SavedKg ?? 0} kg
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Zero extra tras
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
              Zagęszczenie potrzeb w korytarzach miejskich ({heatmapPoints?.length ?? 0} aktywnych
              punktów)
            </ThemedText>
          </View>
        </View>

        {/* Visual Map Grid / Mock Heat Representation */}
        <View
          style={[
            styles.mapContainer,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          <View style={styles.mapCanvas}>
            {/* City Districts Labels */}
            <View style={[styles.districtPin, { top: '20%', left: '25%' }]}>
              <ThemedText type="smallBold" style={styles.districtTag}>
                Krowodrza
              </ThemedText>
            </View>
            <View style={[styles.districtPin, { top: '35%', left: '50%' }]}>
              <ThemedText type="smallBold" style={styles.districtTag}>
                Stare Miasto
              </ThemedText>
            </View>
            <View style={[styles.districtPin, { top: '30%', left: '75%' }]}>
              <ThemedText type="smallBold" style={styles.districtTag}>
                Grzegórzki
              </ThemedText>
            </View>
            <View style={[styles.districtPin, { top: '65%', left: '45%' }]}>
              <ThemedText type="smallBold" style={styles.districtTag}>
                Kazimierz / Podgórze
              </ThemedText>
            </View>

            {/* Heat Points */}
            {(heatmapPoints ?? []).map((pt, i) => {
              // Normalize coordinates relative to Krakow bounding box
              // lat ~ 50.04 to 50.08, lng ~ 19.91 to 19.97
              const minLat = 50.04;
              const maxLat = 50.085;
              const minLng = 19.915;
              const maxLng = 19.97;

              const topPercent = Math.max(
                5,
                Math.min(90, (1 - (pt.lat - minLat) / (maxLat - minLat)) * 100),
              );
              const leftPercent = Math.max(
                5,
                Math.min(90, ((pt.lng - minLng) / (maxLng - minLng)) * 100),
              );
              const dotColor = CategoryColors[pt.category]?.color ?? theme.primary;
              const dotSize = 14 + pt.weight * 16;

              return (
                <View
                  key={`pt-${i}`}
                  style={[
                    styles.heatSpot,
                    {
                      top: `${topPercent}%`,
                      left: `${leftPercent}%`,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: dotColor,
                      opacity: 0.7,
                      transform: [{ translateX: -dotSize / 2 }, { translateY: -dotSize / 2 }],
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Map Legend */}
          <View style={[styles.legendBar, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: CategoryColors.BASIC_NEEDS.color }]}
              />
              <ThemedText type="small">Leki / Pilne</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: CategoryColors.HOME_SUPPORT.color }]}
              />
              <ThemedText type="small">Naprawy</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: CategoryColors.EQUIPMENT_LOAN.color }]}
              />
              <ThemedText type="small">Sprzęt</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CategoryColors.SOCIAL.color }]} />
              <ThemedText type="small">Integracja</ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>

      {/* District Deficit Breakdown */}
      <ThemedView type="backgroundElement" style={styles.sectionCard}>
        <ThemedText type="subtitle">Deficyty według Dzielnic</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Priorytetyzacja wsparcia infrastruktury socjalnej i wolontariatu miejskiego
        </ThemedText>

        <View style={styles.districtList}>
          {summary?.districts.map((d) => {
            const pct = Math.round((d.completed / d.total) * 100);
            return (
              <ThemedView key={d.name} type="background" style={styles.districtItem}>
                <View style={styles.districtHeader}>
                  <ThemedText type="subtitle">{d.name}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {d.completed} / {d.total} zrealizowane ({pct}%)
                  </ThemedText>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? theme.success : theme.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.districtFooter}>
                  <ThemedText type="small" style={{ color: theme.danger }}>
                    ⚠️ {d.critical} pilnych potrzeb (np. leki)
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Główna kategoria: {d.topCategory}
                  </ThemedText>
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
  mapContainer: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  mapCanvas: {
    height: 280,
    position: 'relative',
    backgroundColor: 'rgba(32, 138, 239, 0.04)',
  },
  districtPin: {
    position: 'absolute',
    transform: [{ translateX: -30 }, { translateY: -12 }],
  },
  districtTag: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#ffffff',
    fontSize: 10,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heatSpot: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
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
