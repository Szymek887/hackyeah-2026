import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import type { ModerationItem } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import {
  useModerationDecision,
  useReviewQueue,
  type ModerationDecision,
} from '@/features/dashboard/hooks';
import { CategoryLabels, RiskFlagLabels, timeAgo } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';

const DISMISS_TITLE = 'Odrzucić zgłoszenie?';
const DISMISS_MESSAGE =
  'Zgłoszenie zostanie anulowane i nikt go nie zobaczy. Tej decyzji nie można cofnąć.';

/** Dismissing cannot be undone, so it is confirmed first. */
function confirmDismiss(): Promise<boolean> {
  if (Platform.OS === 'web')
    return Promise.resolve(window.confirm(`${DISMISS_TITLE}\n\n${DISMISS_MESSAGE}`));
  return new Promise((resolve) =>
    Alert.alert(DISMISS_TITLE, DISMISS_MESSAGE, [
      { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Odrzuć', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/**
 * City admin's queue of requests the AI held back as suspected scams. Approving publishes the
 * request to volunteers, dismissing cancels it. The admin sees the text, not the address.
 */
export function ReviewQueue() {
  const theme = useTheme();
  const { data: queue, isPending, error } = useReviewQueue();
  const decision = useModerationDecision();

  const decide = async (id: number, kind: ModerationDecision) => {
    if (kind === 'dismiss' && !(await confirmDismiss())) return;
    decision.mutate({ id, decision: kind });
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View>
        <ThemedText type="subtitle">
          Do weryfikacji{queue && queue.length > 0 ? ` (${queue.length})` : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Zgłoszenia zatrzymane przez AI jako możliwe oszustwo. Zdecyduj, czy je opublikować.
        </ThemedText>
      </View>

      {isPending ? (
        <ActivityIndicator color={theme.primary} />
      ) : error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {errorMessage(error)}
        </ThemedText>
      ) : queue.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Brak zgłoszeń do weryfikacji.
        </ThemedText>
      ) : (
        queue.map((item) => (
          <ReviewItem
            key={item.id}
            item={item}
            busy={decision.isPending && decision.variables?.id === item.id}
            error={
              decision.isError && decision.variables?.id === item.id
                ? errorMessage(decision.error)
                : null
            }
            onDecide={(kind) => decide(item.id, kind)}
          />
        ))
      )}
    </ThemedView>
  );
}

type ReviewItemProps = {
  item: ModerationItem;
  busy: boolean;
  error: string | null;
  onDecide: (decision: ModerationDecision) => void;
};

function ReviewItem({ item, busy, error, onDecide }: ReviewItemProps) {
  const theme = useTheme();
  const { requester } = item;

  return (
    <ThemedView type="background" style={[styles.item, { borderColor: theme.border }]}>
      <View style={styles.flags}>
        {item.riskFlags.map((flag) => (
          <Badge
            key={flag}
            label={RiskFlagLabels[flag]}
            color={theme.danger}
            backgroundColor={theme.dangerSoft}
            dot
          />
        ))}
      </View>
      <ThemedText type="defaultBold">{item.title}</ThemedText>
      <ThemedText type="small">{item.description}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {CategoryLabels[item.category]} · {timeAgo(item.createdAt)} · {requester.displayName} (
        {requester.identityVerified ? 'zweryfikowany' : 'niezweryfikowany'}, zaufanie{' '}
        {requester.trustScore}/100)
      </ThemedText>
      {error && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}
      <View style={styles.actions}>
        <Button
          title="Opublikuj"
          inline
          disabled={busy}
          onPress={() => onDecide('approve')}
          accessibilityHint="Zgłoszenie zobaczą wolontariusze"
        />
        <Button
          title="Odrzuć"
          variant="danger"
          inline
          disabled={busy}
          onPress={() => onDecide('dismiss')}
          accessibilityHint="Zgłoszenie zostanie anulowane"
        />
        {busy && <ActivityIndicator color={theme.primary} />}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
    width: '100%',
  },
  item: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
