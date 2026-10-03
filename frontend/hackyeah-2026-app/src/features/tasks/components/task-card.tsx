import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HelpRequestView } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { CategoryBadge } from '@/features/requests/components/request-badges';
import { StatusLabels, timeAgo } from '@/features/requests/labels';
import { isFull } from '@/features/requests/view-helpers';
import { STAGES, StageByStatus, StageLabels } from '@/features/tasks/hooks';
import { useTheme } from '@/hooks/use-theme';

type TaskCardProps = {
  task: HelpRequestView;
};

export function TaskCard({ task }: TaskCardProps) {
  const theme = useTheme();
  // viewerRole comes from the backend: my part in this request, not my account role.
  const isVolunteer = task.viewerRole === 'VOLUNTEER';
  const stage = StageByStatus[task.status];

  const openDetails = () =>
    router.push(
      stage === 'pending'
        ? { pathname: '/request/[id]', params: { id: task.id } }
        : { pathname: '/task/[id]', params: { id: task.id } },
    );

  return (
    <Pressable onPress={openDetails} accessibilityRole="button" accessibilityLabel={task.title}>
      {(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return (
          <Card style={hovered && { borderColor: theme.primary }}>
            <View style={styles.topRow}>
              <CategoryBadge category={task.category} />
              <ThemedText type="caption" themeColor="textSecondary">
                {timeAgo(task.createdAt)}
              </ThemedText>
            </View>

            <ThemedText type="defaultBold">{task.title}</ThemedText>

            <StageProgress status={task.status} />

            <View style={styles.statusRow}>
              <Badge
                label={StatusLabels[task.status]}
                color={stage === 'done' ? theme.success : theme.primary}
                backgroundColor={stage === 'done' ? theme.successSoft : theme.primarySoft}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {statusHint(task, isVolunteer)}
              </ThemedText>
            </View>

            <TaskAction task={task} isVolunteer={isVolunteer} />
          </Card>
        );
      }}
    </Pressable>
  );
}

function statusHint(task: HelpRequestView, isVolunteer: boolean) {
  // Names are only in the FULL view (requester always, volunteer after acceptance).
  const requester = isFull(task) ? task.requester.displayName : 'osoba potrzebująca';
  const volunteer = (isFull(task) && task.volunteer?.displayName) || 'Wolontariusz';
  switch (task.status) {
    case 'OPEN':
      return 'Czeka na wolontariusza';
    case 'OFFERED':
      return isVolunteer
        ? 'Czekasz, aż osoba potrzebująca przyjmie Twoją pomoc'
        : `${volunteer} chce pomóc – zaakceptuj`;
    case 'ACCEPTED':
      return isVolunteer ? `Pomagasz: ${requester}` : `Pomaga Ci: ${volunteer}`;
    case 'COMPLETED':
      return 'Potwierdzone kodem QR – czeka na ocenę';
    case 'RATED':
      return 'Zakończone i ocenione';
    case 'CANCELLED':
      return 'Zgłoszenie anulowane';
    case 'UNDER_REVIEW':
      return 'Sprawdzamy zgłoszenie, zanim zobaczą je inni';
  }
}

function TaskAction({ task, isVolunteer }: { task: HelpRequestView; isVolunteer: boolean }) {
  if (task.status === 'ACCEPTED') {
    return isVolunteer ? (
      <Button
        title="Zakończ – zeskanuj kod QR"
        onPress={() => router.push({ pathname: '/scan', params: { requestId: task.id } })}
      />
    ) : (
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

/** Three-step bar: Oczekujące → W toku → Zakończone. */
function StageProgress({ status }: { status: HelpRequestView['status'] }) {
  const theme = useTheme();
  const current = STAGES.indexOf(StageByStatus[status]);

  return (
    <View style={styles.progress} accessibilityLabel={`Etap: ${StageLabels[STAGES[current]]}`}>
      {STAGES.map((stage, index) => (
        <View key={stage} style={styles.step}>
          <View
            style={[
              styles.bar,
              { backgroundColor: index <= current ? theme.primary : theme.backgroundSelected },
            ]}
          />
          <ThemedText type="caption" themeColor={index === current ? 'primary' : 'textSecondary'}>
            {StageLabels[stage]}
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  step: {
    flex: 1,
    gap: Spacing.half,
  },
  bar: {
    height: 4,
    borderRadius: Radius.pill,
  },
});
