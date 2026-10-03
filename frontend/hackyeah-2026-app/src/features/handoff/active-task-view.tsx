import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useCompleteRequest, useHandoffToken } from '@/features/handoff/hooks';
import { QrCodeCard } from '@/features/handoff/qr-code-card';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { requestKeys, useRequest } from '@/features/requests/hooks';
import { formatAddress, isFull, mapsQuery } from '@/features/requests/view-helpers';
import { useTheme } from '@/hooks/use-theme';

type ActiveTaskViewProps = {
  requestId: number;
};

export function ActiveTaskView({ requestId }: ActiveTaskViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: request, isPending, error, refetch } = useRequest(requestId);
  const status = request?.status;
  const viewerRole = request?.viewerRole;
  const previousStatus = useRef(status);

  // useRequest polls while ACCEPTED. When the volunteer scans the QR code, the requester's
  // screen moves on by itself: lists are refreshed and the rating screen opens.
  useEffect(() => {
    if (
      previousStatus.current === 'ACCEPTED' &&
      status === 'COMPLETED' &&
      viewerRole === 'REQUESTER'
    ) {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      router.replace({ pathname: '/rate/[id]', params: { id: requestId } });
    }
    previousStatus.current = status;
  }, [status, viewerRole, requestId, queryClient, router]);
  // Only the requester of an ACCEPTED request may fetch the QR token (backend: 403 / 409 otherwise).
  const { data: qrData, isPending: qrLoading } = useHandoffToken(
    requestId,
    request?.status === 'ACCEPTED' && request.viewerRole === 'REQUESTER',
  );

  const completeMutation = useCompleteRequest();
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  if (isPending) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Ładowanie szczegółów zlecenia...
        </ThemedText>
      </Screen>
    );
  }

  if (error || !request) {
    return (
      <Screen style={styles.center}>
        <ThemedText type="subtitle" themeColor="danger">
          Nie znaleziono zlecenia
        </ThemedText>
        <Button title="Wróć do listy" onPress={() => router.back()} />
      </Screen>
    );
  }

  // My part in this request (from the backend), not my account role.
  const isRequester = request.viewerRole === 'REQUESTER';
  const full = isFull(request) ? request : null;
  const otherPerson = isRequester ? full?.volunteer : full?.requester;
  const isAccepted = request.status === 'ACCEPTED';
  const isCompleted = request.status === 'COMPLETED';
  const isRated = request.status === 'RATED';

  const handleManualComplete = async () => {
    if (!manualCode.trim()) {
      const msg = 'Wpisz kod weryfikacyjny z telefonu odbiorcy';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Błąd', msg);
      return;
    }
    try {
      await completeMutation.mutateAsync({
        requestId: request.id,
        token: manualCode.trim(),
      });
      router.push({ pathname: '/rate/[id]', params: { id: request.id } });
    } catch (err: unknown) {
      const msg = errorMessage(err);
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Błąd weryfikacji', msg);
    }
  };

  const openInMaps = () => {
    if (!full) return;
    const query = encodeURIComponent(mapsQuery(full));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <Screen scroll onRefresh={refetch}>
      {/* Status banner */}
      <ThemedView
        style={[
          styles.statusBanner,
          {
            backgroundColor: isRated
              ? theme.success
              : isCompleted
                ? theme.primary
                : theme.backgroundElement,
          },
        ]}>
        <ThemedText
          type="smallBold"
          style={{
            color: isCompleted || isRated ? '#ffffff' : theme.text,
          }}>
          {isRated
            ? '✓ Zlecenie zakończone i ocenione'
            : isCompleted
              ? '✓ Pomoc dostarczona – oczekiwanie na ocenę'
              : '● Zlecenie w toku (Status: Zaakceptowane)'}
        </ThemedText>
      </ThemedView>

      {/* Main Request Header Card */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.badgeRow}>
          <CategoryBadge category={request.category} />
          <PriorityBadge priority={request.priority} />
        </View>

        <ThemedText type="title" style={styles.requestTitle}>
          {request.title}
        </ThemedText>
        <ThemedText type="default" style={{ color: theme.textSecondary }}>
          {request.description}
        </ThemedText>
      </ThemedView>

      {/* Participant info card */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="subtitle">
          {isRequester ? 'Twój wolontariusz' : 'Osoba potrzebująca'}
        </ThemedText>
        <View style={styles.personRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
              {otherPerson?.displayName[0] ?? '?'}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">
              {otherPerson?.displayName ?? (isRequester ? 'Wolontariusz' : 'Osoba potrzebująca')}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {otherPerson
                ? `Zaufanie ${otherPerson.trustScore}%. ${
                    otherPerson.identityVerified
                      ? 'Tożsamość potwierdzona.'
                      : 'Tożsamość niepotwierdzona.'
                  }`
                : 'Dane pojawią się po przyjęciu pomocy.'}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Address & Privacy Card */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="subtitle">
          {isRequester ? 'Adres realizacji' : 'Dokładny adres dostarczenia'}
        </ThemedText>

        {full ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="default" style={{ fontWeight: '600' }}>
              {formatAddress(full)}
            </ThemedText>
            {!isRequester && (
              <Button
                title="Otwórz w Mapach Google"
                variant="secondary"
                onPress={openInMaps}
                style={{ marginTop: Spacing.one }}
              />
            )}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Adres zamaskowany (obszar ~300 m). Odblokuje się po potwierdzeniu zlecenia.
          </ThemedText>
        )}
      </ThemedView>

      {/* Handoff & QR Interaction */}
      {isAccepted && isRequester && (
        <View style={styles.qrSection}>
          {qrLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : qrData ? (
            <QrCodeCard token={qrData.token} expiresAt={qrData.expiresAt} />
          ) : (
            <ThemedText themeColor="danger">Nie udało się wygenerować kodu QR</ThemedText>
          )}
        </View>
      )}

      {isAccepted && !isRequester && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Zakończenie i odbiór</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Po dotarciu na miejsce i przekazaniu pomocy zeskanuj kod QR z telefonu odbiorcy, aby
            potwierdzić realizację.
          </ThemedText>

          <Button
            title="Skanuj kod QR odbiorcy"
            variant="primary"
            onPress={() =>
              router.push({
                pathname: '/scan',
                params: { requestId: request.id },
              })
            }
          />

          <Button
            title={showManualInput ? 'Ukryj wpisywanie ręczne' : 'Wprowadź kod ręcznie (test)'}
            variant="secondary"
            onPress={() => setShowManualInput(!showManualInput)}
          />

          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Wpisz kod wyświetlany pod kodem QR odbiorcy:
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
                placeholder="Wklej kod spod kodu QR"
                placeholderTextColor={theme.textSecondary}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                title={completeMutation.isPending ? 'Weryfikacja...' : 'Zatwierdź kod i zakończ'}
                disabled={completeMutation.isPending}
                onPress={handleManualComplete}
              />
            </View>
          )}
        </ThemedView>
      )}

      {/* Navigation to rating if completed */}
      {(isCompleted || isRated) && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">
            {isRated ? 'Ocena wystawiona' : 'Podsumowanie realizacji'}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {isRated
              ? 'Dziękujemy za wystawienie opinii i wsparcie sąsiedzkie!'
              : 'Zlecenie zostało dostarczone! Wystaw ocenę, aby przyznać punkty zaufania.'}
          </ThemedText>
          <Button
            title={isRated ? 'Przejrzyj ocenę' : 'Wystaw ocenę i odbierz punkty'}
            onPress={() =>
              router.push({
                pathname: '/rate/[id]',
                params: { id: request.id },
              })
            }
          />
        </ThemedView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  statusBanner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    width: '100%',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    width: '100%',
    alignItems: 'center',
  },
  manualInputContainer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
});
