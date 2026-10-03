import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/features/map/use-user-location';
import type { RouteCoordinate } from '@/lib/route-matching';

type LocationPermissionModalProps = {
  visible: boolean;
  onLocationGranted: (coordinate: RouteCoordinate) => void;
  onChooseManual: () => void;
  onDismiss: () => void;
};

export function LocationPermissionModal({
  visible,
  onLocationGranted,
  onChooseManual,
  onDismiss,
}: LocationPermissionModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { locate, isLoading, error } = useUserLocation();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRequestGps = async () => {
    setLocalError(null);
    const coords = await locate();
    if (coords) {
      onLocationGranted(coords);
    } else {
      setLocalError(
        'Nie udało się uzyskać pozycji GPS. Możesz zezwolić w ustawieniach lub wybrać adres ręcznie.',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.card,
            {
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
            },
          ]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
            <ThemedText style={styles.iconText}>📍</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            Użyć Twojej lokalizacji?
          </ThemedText>

          <ThemedText themeColor="textSecondary" style={styles.description}>
            Aplikacja PoDrodze wyszukuje prośby o pomoc w Twoim najbliższym otoczeniu. Zezwól na
            dostęp do GPS, aby natychmiast zobaczyć sąsiadów potrzebujących wsparcia w Twojej
            okolicy.
          </ThemedText>

          {(localError || error) && (
            <ThemedView type="background" style={[styles.errorBox, { borderColor: theme.danger }]}>
              <ThemedText type="caption" themeColor="danger">
                {localError || error}
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.actions}>
            <Button
              title={isLoading ? 'Pobieranie pozycji...' : '📍 Włącz lokalizację (GPS)'}
              disabled={isLoading}
              onPress={handleRequestGps}
            />

            <Button
              variant="secondary"
              title="🔍 Wybierz lokalizację z listy"
              onPress={() => {
                onDismiss();
                onChooseManual();
              }}
            />

            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Użyj domyślnej (Kraków Centrum)
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  errorBox: {
    width: '100%',
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  actions: {
    width: '100%',
    gap: Spacing.two,
  },
  ghostButton: {
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
