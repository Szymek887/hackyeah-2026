import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
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
import { useSubmitRating } from '@/features/handoff/hooks';
import { useRequest } from '@/features/requests/hooks';
import { isFull } from '@/features/requests/view-helpers';
import { useTheme } from '@/hooks/use-theme';

type RateViewProps = {
  requestId: number;
};

const STAR_LABELS: Record<number, string> = {
  1: '1/5 - Wymaga poprawy',
  2: '2/5 - Poniżej oczekiwań',
  3: '3/5 - W porządku',
  4: '4/5 - Bardzo dobrze',
  5: '5/5 - Znakomicie, pełne zaufanie!',
};

export function RateView({ requestId }: RateViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { data: request, isPending: requestLoading } = useRequest(requestId);
  const ratingMutation = useSubmitRating();

  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // My part in this request (from the backend); the rated person is the other side.
  const isRequester = request?.viewerRole === 'REQUESTER';
  const full = request && isFull(request) ? request : null;
  const personName = isRequester
    ? (full?.volunteer?.displayName ?? 'Wolontariusz')
    : (full?.requester.displayName ?? 'Osoba potrzebująca');
  const result = ratingMutation.data;

  const handleSubmit = async () => {
    try {
      await ratingMutation.mutateAsync({
        requestId,
        stars,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = errorMessage(err);
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Błąd', msg);
    }
  };

  if (requestLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </Screen>
    );
  }

  if (submitted) {
    return (
      <Screen style={styles.center}>
        <ThemedView type="backgroundElement" style={styles.successCard}>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            Dziękujemy za ocenę!
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Twoja opinia buduje bezpieczną społeczność PoDrodze i nagradza aktywność mieszkańców.
          </ThemedText>

          <ThemedView style={styles.rewardCard}>
            <ThemedText type="smallBold" style={{ color: theme.success, textAlign: 'center' }}>
              {result && result.cityPointsAwarded > 0
                ? `${result.ratedUser.displayName} otrzymuje ${result.cityPointsAwarded} punktów miejskich`
                : 'Ocena zapisana'}
            </ThemedText>
            {result && (
              <ThemedText type="small" style={{ textAlign: 'center', color: theme.textSecondary }}>
                Zaufanie: {result.ratedUser.trustScore}%.{' '}
                {result.requestStatus === 'RATED'
                  ? 'Obie strony wystawiły już oceny.'
                  : 'Czekamy jeszcze na ocenę drugiej strony.'}
              </ThemedText>
            )}
          </ThemedView>

          <Button
            title="Wróć do moich zadań"
            onPress={() => router.replace({ pathname: '/tasks', params: { tab: 'done' } })}
          />
        </ThemedView>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="title">Oceń realizację</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Pomoc dotycząca: <ThemedText type="smallBold">{request?.title ?? requestId}</ThemedText>
        </ThemedText>

        <View style={styles.personBox}>
          <ThemedText type="subtitle">Oceniasz:</ThemedText>
          <ThemedText type="subtitle" style={{ color: theme.primary }}>
            {personName}
          </ThemedText>
        </View>

        {/* Interactive 5 stars */}
        <View style={styles.starsWrapper}>
          <View style={styles.starRow}>
            {([1, 2, 3, 4, 5] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setStars(s)}
                style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.6 }]}>
                <ThemedText
                  style={[styles.starIcon, { color: s <= stars ? '#F5A623' : theme.border }]}>
                  ★
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <ThemedText type="smallBold" style={{ color: theme.primary, textAlign: 'center' }}>
            {STAR_LABELS[stars]}
          </ThemedText>
        </View>

        {/* Comment input */}
        <View style={{ gap: Spacing.one }}>
          <ThemedText type="smallBold">Komentarz lub podziękowanie (opcjonalnie):</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            placeholder="Wszystko poszło sprawnie i na czas. Dziękuję za pomoc!"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Gamification badge */}
        <ThemedView style={styles.rewardCard}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Bonus zaangażowania sąsiedzkiego
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Każda ocena wspiera rzetelność systemu i nagradza wolontariuszy punktami miejskimi
            wymiennymi na bilety komunikacji i ulgi miejskie.
          </ThemedText>
        </ThemedView>

        {/* Submit */}
        <Button
          title={ratingMutation.isPending ? 'Zapisywanie...' : 'Zatwierdź ocenę'}
          disabled={ratingMutation.isPending}
          onPress={handleSubmit}
        />

        <Button
          title="Pomiń ocenę"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/requests')}
        />
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
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  personBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  starsWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  starRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  starBtn: {
    padding: Spacing.one,
  },
  starIcon: {
    fontSize: 42,
    lineHeight: 46,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  rewardCard: {
    backgroundColor: 'rgba(32, 138, 239, 0.08)',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  successCard: {
    padding: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
});
