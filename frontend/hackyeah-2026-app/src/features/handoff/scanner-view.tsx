import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useCompleteRequest } from '@/features/handoff/hooks';
import { useTheme } from '@/hooks/use-theme';

type ScannerViewProps = {
  requestId?: string;
};

export function ScannerView({ requestId = 'r-1' }: ScannerViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  // Camera fires several events per second; a ref blocks duplicates before React re-renders.
  const verifyingRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(Platform.OS === 'web');

  const completeMutation = useCompleteRequest();

  const handleVerify = async (token: string) => {
    if (!token.trim() || verifyingRef.current) return;
    verifyingRef.current = true;
    setScanned(true);

    try {
      await completeMutation.mutateAsync({
        requestId,
        token: token.trim(),
      });

      const successMsg = 'Kod zweryfikowany pomyślnie! Zlecenie zostało zrealizowane.';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Sukces', successMsg);
      }

      router.replace({
        pathname: '/rate/[id]',
        params: { id: requestId },
      });
    } catch (err: unknown) {
      verifyingRef.current = false;
      setScanned(false);
      const msg = err instanceof Error ? err.message : 'Błąd weryfikacji kodu QR';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Błąd weryfikacji', msg);
      }
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || completeMutation.isPending) return;
    handleVerify(result.data);
  };

  if (!permission) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Inicjalizacja aparatu...
        </ThemedText>
      </Screen>
    );
  }

  // Fallback view when camera permission is not granted or on web platform
  if (!permission.granted || showManual) {
    return (
      <Screen scroll>
        <ThemedView type="backgroundElement" style={styles.permissionCard}>
          <ThemedText type="subtitle">Skanowanie kodu odbiorcy</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {Platform.OS === 'web'
              ? 'W wersji przeglądarkowej możesz wprowadzić kod tekstowy wygenerowany na telefonie potrzebującego.'
              : 'Aplikacja potrzebuje dostępu do aparatu, aby zeskanować kod QR odbiorcy i potwierdzić dostarczenie pomocy.'}
          </ThemedText>

          {!permission.granted && Platform.OS !== 'web' && (
            <Button title="Zezwól na dostęp do aparatu" onPress={requestPermission} />
          )}

          <ThemedView style={styles.manualBox}>
            <ThemedText type="subtitle">Ręczne wprowadzenie kodu</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Wpisz token widoczny pod kodem QR (np. PODDRODZE-R1-77A2):
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              placeholder="PODDRODZE-R1-77A2"
              placeholderTextColor={theme.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
            />
            <Button
              title={completeMutation.isPending ? 'Weryfikacja...' : 'Potwierdź odbiór kodem'}
              disabled={completeMutation.isPending}
              onPress={() => handleVerify(manualCode)}
            />
          </ThemedView>

          {permission.granted && (
            <Button
              title="Wróć do skanera aparatu"
              variant="secondary"
              onPress={() => setShowManual(false)}
            />
          )}

          <Button title="Wróć do zlecenia" variant="secondary" onPress={() => router.back()} />
        </ThemedView>
      </Screen>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Button
            title="Anuluj"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancelBtn}
          />
        </View>

        <View style={styles.centerTarget}>
          <View style={[styles.targetBox, { borderColor: theme.primary }]} />
          <ThemedText type="smallBold" style={styles.guidanceText}>
            Skieruj aparat na kod QR na telefonie odbiorcy
          </ThemedText>
        </View>

        <View style={styles.bottomControls}>
          {completeMutation.isPending ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#ffffff" size="large" />
              <ThemedText style={{ color: '#ffffff' }}>Weryfikacja kodu...</ThemedText>
            </View>
          ) : (
            <Button
              title="Wpisz kod ręcznie"
              variant="secondary"
              onPress={() => setShowManual(true)}
              style={styles.manualBtn}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  permissionCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  manualBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Spacing.four,
  },
  cancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centerTarget: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: Spacing.three,
    backgroundColor: 'transparent',
  },
  guidanceText: {
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  bottomControls: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  manualBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
});
