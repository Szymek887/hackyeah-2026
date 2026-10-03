import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/features/map/use-user-location';
import {
  KRAKOW_PRESET_PLACES,
  searchKrakowPlaces,
  type PlaceSuggestion,
} from '@/features/commute/krakow-places';
import type { RouteCoordinate } from '@/lib/route-matching';

type PlaceSearchModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (name: string, coordinate: RouteCoordinate) => void;
};

export function PlaceSearchModal({ visible, title, onClose, onSelect }: PlaceSearchModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locate, isLoading: isLocating } = useUserLocation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>(() => KRAKOW_PRESET_PLACES.slice(0, 8));
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const places = await searchKrakowPlaces(query);
      if (active) {
        setResults(places);
        setIsSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleUseMyLocation = async () => {
    const coords = await locate();
    if (coords) {
      onSelect('Moja bieżąca lokalizacja', coords);
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Zamknij
            </ThemedText>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.inputContainer}>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <ThemedText type="default">🔍</ThemedText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Wpisz adres, budynek lub np. Cinema City..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              autoFocus
              clearButtonMode="while-editing"
            />
            {isSearching && <ActivityIndicator size="small" color={theme.primary} />}
          </View>
        </View>

        {/* GPS Option */}
        <Pressable
          onPress={handleUseMyLocation}
          disabled={isLocating}
          style={({ pressed }) => [
            styles.gpsOption,
            { backgroundColor: theme.primarySoft, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="default">📍</ThemedText>
          <View style={styles.gpsText}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {isLocating ? 'Pobieram lokalizację GPS...' : 'Użyj mojej bieżącej pozycji'}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Wycentruj trasę od miejsca, w którym jesteś
            </ThemedText>
          </View>
          {isLocating && <ActivityIndicator size="small" color={theme.primary} />}
        </Pressable>

        {/* Results List */}
        <View style={styles.listHeader}>
          <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
            {query.trim() ? 'WYNIKI WYSZUKIWANIA' : 'POPULARNE MIEJSCA W KRAKOWIE'}
          </ThemedText>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item.name, item.coordinate);
                handleClose();
              }}
              style={({ pressed }) => [
                styles.itemRow,
                { borderBottomColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.itemIcon,
                  {
                    backgroundColor:
                      item.type === 'preset' ? theme.primarySoft : theme.backgroundMuted,
                  },
                ]}>
                <ThemedText type="caption">
                  {item.name.toLowerCase().includes('cinema')
                    ? '🎬'
                    : item.name.toLowerCase().includes('agh') ||
                        item.name.toLowerCase().includes('uj') ||
                        item.name.toLowerCase().includes('politechnika')
                      ? '🎓'
                      : item.name.toLowerCase().includes('dworzec') ||
                          item.name.toLowerCase().includes('galeria')
                        ? '🏬'
                        : '🏢'}
                </ThemedText>
              </View>
              <View style={styles.itemText}>
                <ThemedText type="defaultBold">{item.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {item.address}
                </ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
                Wybierz →
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            !isSearching ? (
              <View style={styles.emptyContainer}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nie znaleziono miejsc dla „{query}”. Spróbuj podać nazwę ulicy lub dzielnicy w
                  Krakowie.
                </ThemedText>
              </View>
            ) : null
          }
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  closeButton: {
    padding: Spacing.one,
  },
  inputContainer: {
    paddingVertical: Spacing.one,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  gpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginVertical: Spacing.one,
    gap: Spacing.two,
  },
  gpsText: {
    flex: 1,
    gap: 2,
  },
  listHeader: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  listContent: {
    gap: Spacing.one,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  emptyContainer: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
