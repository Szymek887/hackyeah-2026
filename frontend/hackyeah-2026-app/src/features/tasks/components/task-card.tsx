import { router } from 'expo-router';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { HelpRequestView, RequestStatus } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { CategoryBadge } from '@/features/requests/components/request-badges';
import { timeAgo } from '@/features/requests/labels';
import { isFull } from '@/features/requests/view-helpers';
import { useSavedCommuteRoute } from '@/features/commute/commute-store';
import { turnLabel, turnOf, type Turn } from '@/features/tasks/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  appleDirectionsToStopUrl,
  googlePointUrl,
  googleRouteViaStopUrl,
  requestMapCoordinate,
} from '@/lib/map-links';

type Step = 'waiting' | 'inProgress' | 'done';

const STEPS: Step[] = ['waiting', 'inProgress', 'done'];

const StepLabels: Record<Step, string> = {
  waiting: 'Oczekuje',
  inProgress: 'W toku',
  done: 'Zakończone',
};

const StepByStatus: Record<RequestStatus, Step> = {
  OPEN: 'waiting',
  OFFERED: 'waiting',
  UNDER_REVIEW: 'waiting',
  ACCEPTED: 'inProgress',
  COMPLETED: 'done',
  RATED: 'done',
  CANCELLED: 'done',
};

type TaskCardProps = {
  task: HelpRequestView;
};

export function TaskCard({ task }: TaskCardProps) {
  const theme = useTheme();
  // viewerRole comes from the backend: my part in this request, not my account role.
  const isVolunteer = task.viewerRole === 'VOLUNTEER';
  const step = StepByStatus[task.status];
  const turn = turnOf(task);
  const people = peopleHint(task, isVolunteer);

  const openDetails = () =>
    router.push(
      step === 'waiting'
        ? { pathname: '/request/[id]', params: { id: task.id } }
        : { pathname: '/task/[id]', params: { id: task.id } },
    );

  return (
    <Pressable
      onPress={openDetails}
      accessibilityRole="button"
      accessibilityLabel={`${TurnTitles[turn]}: ${turnLabel(task)}. ${task.title}`}>
      {(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        const stripe = {
          you: theme.accent,
          other: theme.border,
          none: theme.success,
        }[turn];
        return (
          <Card
            style={[
              styles.card,
              { borderLeftColor: stripe },
              hovered && { borderColor: theme.primary, borderLeftColor: stripe },
            ]}>
            <TurnBanner turn={turn} label={turnLabel(task)} />

            <View style={styles.topRow}>
              <CategoryBadge category={task.category} />
              <ThemedText type="caption" themeColor="textSecondary">
                {timeAgo(task.createdAt)}
              </ThemedText>
            </View>

            <ThemedText type="defaultBold">{task.title}</ThemedText>

            <StageProgress status={task.status} />

            {people && (
              <ThemedText type="small" themeColor="textSecondary">
                {people}
              </ThemedText>
            )}

            <TaskAction task={task} isVolunteer={isVolunteer} />
          </Card>
        );
      }}
    </Pressable>
  );
}

const TurnTitles: Record<Turn, string> = {
  you: 'Twój ruch',
  other: 'Oczekuje',
  none: 'Zakończone',
};

/** Who has to act now: orange "Twój ruch" or grey "Oczekuje", readable without colour too. */
function TurnBanner({ turn, label }: { turn: Turn; label: string }) {
  const theme = useTheme();
  const colors = {
    you: { pill: theme.accent, pillText: theme.onAccent, text: theme.accent },
    other: { pill: theme.backgroundSelected, pillText: theme.text, text: theme.textSecondary },
    none: { pill: theme.successSoft, pillText: theme.success, text: theme.success },
  }[turn];

  return (
    <View style={styles.banner}>
      <View style={[styles.pill, { backgroundColor: colors.pill }]}>
        <ThemedText type="caption" style={[styles.pillText, { color: colors.pillText }]}>
          {TurnTitles[turn].toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={[styles.flex, { color: colors.text }]}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Names are only in the FULL view (requester always, volunteer after acceptance). */
function peopleHint(task: HelpRequestView, isVolunteer: boolean): string | null {
  if (!isFull(task)) return null;
  const volunteer = task.volunteer?.displayName;
  if (task.status === 'OFFERED' && !isVolunteer && volunteer) return `Zgłosił(a) się: ${volunteer}`;
  if (task.status === 'ACCEPTED') {
    return isVolunteer
      ? `Pomagasz: ${task.requester.displayName}`
      : `Pomaga Ci: ${volunteer ?? 'wolontariusz'}`;
  }
  return null;
}

function TaskAction({ task, isVolunteer }: { task: HelpRequestView; isVolunteer: boolean }) {
  const { savedRoute } = useSavedCommuteRoute();
  const activeRoute = savedRoute?.isActive ? savedRoute : null;

  const openInMaps = () => {
    const target = requestMapCoordinate(task);
    const url =
      Platform.OS === 'ios'
        ? appleDirectionsToStopUrl(activeRoute?.start ?? target, target)
        : activeRoute
          ? googleRouteViaStopUrl(activeRoute.start, activeRoute.end, target)
          : googlePointUrl(target);

    Linking.openURL(url).catch(() => {
      const message = 'Nie udało się otworzyć map na tym urządzeniu.';
      if (Platform.OS === 'web') alert(message);
      else Alert.alert('Mapy', message);
    });
  };

  if (isVolunteer && (task.status === 'OFFERED' || task.status === 'ACCEPTED')) {
    return (
      <View style={styles.actions}>
        <Button title="Otwórz trasę w mapach" variant="secondary" onPress={openInMaps} />
        {task.status === 'ACCEPTED' && (
          <Button
            title="Zakończ – zeskanuj kod QR"
            onPress={() => router.push({ pathname: '/scan', params: { requestId: task.id } })}
          />
        )}
      </View>
    );
  }

  if (task.status === 'ACCEPTED') {
    return (
      <Button
        title="Pokaż kod QR dla wolontariusza"
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      />
    );
  }
  if (task.status === 'COMPLETED') {
    return (
      <Button
        title="Oceń pomoc"
        variant="secondary"
        onPress={() => router.push({ pathname: '/rate/[id]', params: { id: task.id } })}
      />
    );
  }
  return null;
}

/** Three-step bar: Oczekuje → W toku → Zakończone. */
function StageProgress({ status }: { status: RequestStatus }) {
  const theme = useTheme();
  const current = STEPS.indexOf(StepByStatus[status]);

  return (
    <View style={styles.progress} accessibilityLabel={`Etap: ${StepLabels[STEPS[current]]}`}>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.step}>
          <View
            style={[
              styles.bar,
              { backgroundColor: index <= current ? theme.primary : theme.backgroundSelected },
            ]}
          />
          <ThemedText type="caption" themeColor={index === current ? 'primary' : 'textSecondary'}>
            {StepLabels[step]}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    borderLeftWidth: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  pillText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  step: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.one,
  },
  bar: {
    height: 4,
    borderRadius: Radius.pill,
  },
});
