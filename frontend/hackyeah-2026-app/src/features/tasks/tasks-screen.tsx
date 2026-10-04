import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import type { HelpRequestView } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { RatingsSummary } from '@/features/tasks/components/ratings-summary';
import { TaskCard } from '@/features/tasks/components/task-card';
import {
  TASK_TABS,
  TaskTabLabels,
  groupTasks,
  turnOf,
  useActiveVolunteerTask,
  useMyTasks,
  type TaskTab,
} from '@/features/tasks/hooks';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { enterItem, exitItem, layoutTransition } from '@/lib/motion';

/** List rows: section headers in "W trakcie", then the task cards. */
type Row =
  | { kind: 'header'; key: string; title: string; hint: string; count: number; you: boolean }
  | { kind: 'task'; key: string; task: HelpRequestView };

function taskRows(tasks: HelpRequestView[]): Row[] {
  return tasks.map((task) => ({ kind: 'task', key: String(task.id), task }));
}

/** "Twój ruch" first (things the user has to do), then "Oczekujące" (waiting for the other side). */
function activeRows(tasks: HelpRequestView[]): Row[] {
  const mine = tasks.filter((task) => turnOf(task) === 'you');
  const waiting = tasks.filter((task) => turnOf(task) !== 'you');
  const rows: Row[] = [];
  if (mine.length > 0) {
    rows.push({
      kind: 'header',
      key: 'h-you',
      title: 'Twój ruch',
      hint: 'Te zadania czekają na Ciebie.',
      count: mine.length,
      you: true,
    });
    rows.push(...taskRows(mine));
  }
  if (waiting.length > 0) {
    rows.push({
      kind: 'header',
      key: 'h-wait',
      title: 'Oczekujące',
      hint: 'Nic nie musisz robić – czekasz na drugą stronę.',
      count: waiting.length,
      you: false,
    });
    rows.push(...taskRows(waiting));
  }
  return rows;
}

const EMPTY_TEXT: Record<TaskTab, string> = {
  active: 'Nie masz teraz żadnych zadań w trakcie.',
  done: 'Zadania pojawią się tu po zeskanowaniu kodu QR.',
  ratings: 'Nic nie czeka na ocenę.',
};

export function TasksScreen() {
  const theme = useTheme();
  const { role } = useSession();
  // `?tab=active` lets other screens (e.g. the new request form) open a specific tab.
  const params = useLocalSearchParams<{ tab?: TaskTab }>();
  const [selected, setSelected] = useState<TaskTab | null>(null);
  const tab = selected ?? (params.tab && TASK_TABS.includes(params.tab) ? params.tab : 'active');
  const { data = [], isPending, error, refetch } = useMyTasks();
  const queryClient = useQueryClient();
  const refresh = useRefresh(() =>
    Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['users', 'me'] })]),
  );

  const groups = groupTasks(data);
  const activeTask = useActiveVolunteerTask();
  const tasks: Record<TaskTab, HelpRequestView[]> = {
    active: groups.active,
    done: groups.done,
    ratings: groups.toRate,
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="title">
          {role === 'VOLUNTEER' ? 'Moje zadania' : 'Moje prośby'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {role === 'VOLUNTEER'
            ? 'Zgłoszenia, którym pomagasz, i Twoje własne prośby. Pomoc kończy skan kodu QR.'
            : 'Twoje zgłoszenia. Pokaż kod QR wolontariuszowi, aby potwierdzić otrzymaną pomoc.'}
        </ThemedText>
      </View>

      {role === 'VOLUNTEER' && (
        <Card
          highlighted
          accessibilityRole="summary"
          style={[styles.limit, { borderColor: activeTask ? theme.accent : theme.border }]}>
          <ThemedText type="smallBold">Aktywne zadania: {activeTask ? 1 : 0} z 1</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {activeTask
              ? `Pomagasz przy: „${activeTask.title}”. Następne zadanie weźmiesz po jego zakończeniu.`
              : 'Możesz zgłosić się do jednego zadania naraz. Wybierz je na mapie lub z listy zgłoszeń.'}
          </ThemedText>
        </Card>
      )}

      <SegmentedControl
        value={tab}
        onChange={setSelected}
        options={TASK_TABS.map((value) => ({
          value,
          label: TaskTabLabels[value],
          count: tasks[value].length,
        }))}
      />

      {isPending && <ActivityIndicator color={theme.primary} />}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}

      <FlatList
        // Remount on tab change so the entrance animation plays for the new tab.
        key={tab}
        data={tab === 'active' ? activeRows(tasks.active) : taskRows(tasks[tab])}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresh.refreshing}
            onRefresh={refresh.onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListHeaderComponent={
          tab === 'ratings' ? (
            <View style={styles.ratingsHeader}>
              <RatingsSummary ratedCount={groups.rated.length} />
              {tasks.ratings.length > 0 && (
                <ThemedText type="smallBold">Czekają na ocenę</ThemedText>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          isPending ? null : (
            <Card highlighted style={styles.empty}>
              <ThemedText themeColor="textSecondary">{EMPTY_TEXT[tab]}</ThemedText>
              {tab === 'active' && (
                <Button
                  title="Poproś o pomoc"
                  variant="secondary"
                  inline
                  onPress={() => router.push('/new')}
                />
              )}
            </Card>
          )
        }
        renderItem={({ item, index }) =>
          item.kind === 'header' ? (
            <View style={styles.sectionHeader} accessibilityRole="header">
              <ThemedText
                type="subtitle"
                style={item.you ? { color: theme.accent } : undefined}
                themeColor={item.you ? undefined : 'textSecondary'}>
                {item.title} ({item.count})
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.hint}
              </ThemedText>
            </View>
          ) : (
            <Animated.View entering={enterItem(index)} exiting={exitItem} layout={layoutTransition}>
              <TaskCard task={item.task} />
            </Animated.View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  limit: {
    gap: Spacing.half,
    borderWidth: 1.5,
  },
  sectionHeader: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  ratingsHeader: {
    gap: Spacing.three,
  },
  empty: {
    alignItems: 'flex-start',
  },
});
